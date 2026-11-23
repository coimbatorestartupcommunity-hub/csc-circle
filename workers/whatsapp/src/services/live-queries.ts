import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getWorkerEnv } from "../config/env.js";
import { logger } from "../utils/logger.js";
import crypto from "node:crypto";

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseClient) return supabaseClient;
  const env = getWorkerEnv();
  supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseClient;
}

export interface LiveEventSummary {
  id: string;
  title: string;
  slug: string;
  startsAt: string;
  venueName: string | null;
  venueCity: string | null;
  admission: string;
  ticketPrice: number | null;
  status: string;
  url: string;
}

export interface MemberStatusSummary {
  exists: boolean;
  fullName?: string;
  status?: string;
  memberNumber?: string | null;
  submittedAt?: string;
  isEligibleForFiveMinuteApproval?: boolean;
  minutesRemaining?: number;
  digitalPassUrl?: string;
  emailMasked?: string;
  userId?: string;
}

/**
 * Retrieves all upcoming published events. Only published events are returned.
 */
export async function getUpcomingPublishedEvents(): Promise<LiveEventSummary[]> {
  const sb = getSupabase();
  try {
    const { data, error } = await sb
      .from("events")
      .select("id, title, slug, starts_at, venue, location, admission, price_minor, status")
      .eq("status", "published")
      .gte("starts_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order("starts_at", { ascending: true })
      .limit(10);

    if (error || !data) {
      logger.error("Failed to query upcoming published events", { error });
      return [];
    }

    return data.map((e) => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      startsAt: e.starts_at,
      venueName: e.venue || e.location || "Coimbatore",
      venueCity: "Coimbatore",
      admission: e.admission || "free",
      ticketPrice: e.price_minor ? e.price_minor / 100 : null,
      status: e.status,
      url: `https://csc.logicintelligencetechnologies.in/events/${e.slug}`,
    }));
  } catch (err) {
    logger.error("Exception querying upcoming events", { error: err });
    return [];
  }
}

/**
 * Searches for a specific event by title keyword or slug.
 */
export async function findEvent(searchTerm: string): Promise<LiveEventSummary | null> {
  const sb = getSupabase();
  try {
    const term = searchTerm.toLowerCase().trim();
    const { data, error } = await sb
      .from("events")
      .select("id, title, slug, starts_at, venue_name, venue_city, admission, ticket_price, status")
      .ilike("title", `%${term}%`)
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const e = data[0];
    return {
      id: e.id,
      title: e.title,
      slug: e.slug,
      startsAt: e.starts_at,
      venueName: e.venue_name,
      venueCity: e.venue_city || "Coimbatore",
      admission: e.admission || "free",
      ticketPrice: e.ticket_price,
      status: e.status,
      url: `https://csc.logicintelligencetechnologies.in/events/${e.slug}`,
    };
  } catch (err) {
    logger.error("Exception searching event", { error: err });
    return null;
  }
}

/**
 * Normalizes phone numbers to clean digits with country code for matching.
 */
export function normalizePhoneForMatching(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/**
 * Queries member status by phone or user_id.
 * Accurately calculates the 5-minute approval window.
 */
export async function getMemberStatusByPhone(phone: string): Promise<MemberStatusSummary> {
  const sb = getSupabase();
  const normalized = normalizePhoneForMatching(phone);
  const tenDigit = normalized.slice(-10);

  try {
    // 1. Search in membership_claims by phone
    const { data: claims, error: claimsErr } = await sb
      .from("membership_claims")
      .select("id, user_id, full_name, linked_account_email, whatsapp, status, submitted_at")
      .or(`whatsapp.ilike.%${tenDigit}%,whatsapp.eq.${phone}`)
      .order("submitted_at", { ascending: false })
      .limit(1);

    if (claimsErr || !claims || claims.length === 0) {
      return { exists: false };
    }

    const claim = claims[0];
    const email = claim.linked_account_email || "";
    const emailParts = email.split("@");
    const maskedEmail = emailParts.length === 2
      ? `${emailParts[0].slice(0, 2)}***@${emailParts[1]}`
      : "registered email";

    // 2. Search in memberships table for membership ID and issued pass
    const { data: member } = await sb
      .from("memberships")
      .select("id, status, member_number, issued_at, verification_token")
      .eq("user_id", claim.user_id)
      .maybeSingle();

    const currentStatus = member?.status || claim.status;
    const isApproved = currentStatus === "active" || currentStatus === "approved";

    let minutesRemaining = 0;
    if (!isApproved && claim.submitted_at) {
      const submittedTime = new Date(claim.submitted_at).getTime();
      const elapsedMs = Date.now() - submittedTime;
      const fiveMinutesMs = 5 * 60 * 1000;
      if (elapsedMs < fiveMinutesMs) {
        minutesRemaining = Math.max(1, Math.ceil((fiveMinutesMs - elapsedMs) / 60000));
      } else {
        minutesRemaining = 0; // Due for instant approval
      }
    }

    return {
      exists: true,
      fullName: claim.full_name,
      status: currentStatus,
      memberNumber: member?.member_number || null,
      submittedAt: claim.submitted_at,
      isEligibleForFiveMinuteApproval: !isApproved,
      minutesRemaining,
      digitalPassUrl: isApproved ? "https://csc.logicintelligencetechnologies.in/member/card" : undefined,
      emailMasked: maskedEmail,
      userId: claim.user_id,
    };
  } catch (err) {
    logger.error("Exception in getMemberStatusByPhone", { error: err });
    return { exists: false };
  }
}

/**
 * Searches knowledge documents store.
 */
export async function searchKnowledgeDocuments(query: string, maxTier: number = 1): Promise<string[]> {
  const sb = getSupabase();
  try {
    const keywords = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    if (keywords.length === 0) return [];

    const { data, error } = await sb
      .from("csc_agent_knowledge_documents")
      .select("title, category, content, metadata")
      .eq("is_published", true)
      .lte("tier", maxTier)
      .limit(150);

    if (error || !data) return [];

    // Score and rank documents matching keywords
    const matches = data
      .map((doc) => {
        const text = `${doc.title} ${doc.category} ${doc.content}`.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
          if (text.includes(kw)) score += 1;
        }
        return { doc, score };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((m) => `[${m.doc.category.toUpperCase()}] ${m.doc.title}: ${m.doc.content}`);

    return matches;
  } catch (err) {
    logger.error("Exception searching knowledge documents", { error: err });
    return [];
  }
}

/**
 * Automatically updates knowledge store when an entity changes.
 */
export async function syncEntityToKnowledgeStore(
  entityType: string,
  entityId: string,
  changeType: string,
  payload: any
): Promise<void> {
  const sb = getSupabase();
  const sourceId = `${entityType}:${entityId}`;

  try {
    if (changeType === "DELETE") {
      await sb
        .from("csc_agent_knowledge_documents")
        .delete()
        .eq("source", "supabase")
        .eq("source_id", sourceId);
      return;
    }

    if (entityType === "events") {
      const isPublished = payload.status === "published";
      const content = `Event: ${payload.title}. Description: ${payload.description || "N/A"}. Starts at: ${payload.starts_at}. Venue: ${payload.venue_name || "Coimbatore"}. Admission: ${payload.admission}. Tickets: https://csc.logicintelligencetechnologies.in/events/${payload.slug}`;
      const checksum = crypto.createHash("sha256").update(content).digest("hex");

      await sb.from("csc_agent_knowledge_documents").upsert(
        {
          source: "supabase",
          source_id: sourceId,
          category: "events",
          title: payload.title || "CSC Event",
          slug: payload.slug,
          content,
          metadata: { starts_at: payload.starts_at, admission: payload.admission, venue: payload.venue_name },
          tier: 1,
          is_published: isPublished,
          checksum,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "source,source_id" }
      );
    } else if (entityType === "directory_startups") {
      const isPublished = payload.status === "published";
      const content = `Startup: ${payload.name || payload.title}. Tagline: ${payload.tagline || ""}. Sector: ${payload.sector || ""}. Website: ${payload.website_url || ""}. Description: ${payload.short_description || ""}`;
      const checksum = crypto.createHash("sha256").update(content).digest("hex");

      await sb.from("csc_agent_knowledge_documents").upsert(
        {
          source: "supabase",
          source_id: sourceId,
          category: "startups",
          title: payload.name || payload.title || "CSC Startup",
          slug: payload.slug,
          content,
          metadata: { sector: payload.sector, website: payload.website_url },
          tier: 1,
          is_published: isPublished,
          checksum,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "source,source_id" }
      );
    }
  } catch (err) {
    logger.error("Exception syncing entity to knowledge store", { error: err, entityType, entityId });
  }
}
