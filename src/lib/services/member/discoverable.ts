import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type DiscoverableMemberRow = {
  member_id: string;
  display_name: string;
  city: string | null;
  designation: string | null;
  about_me: string | null;
  skills: string[];
  startup_name: string | null;
  whatsapp: string | null;
  has_photo: boolean;
  startup_website?: string | null;
  member_number?: string | null;
  membership_status?: string | null;
};

export async function fetchDiscoverableMembers(options: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<DiscoverableMemberRow[]> {
  const search = (options.search ?? "").trim().slice(0, 80);
  const limit = Math.max(1, Math.min(options.limit ?? 50, 100));
  const offset = Math.max(0, options.offset ?? 0);

  const admin = createAdminClient();

  // 1. Primary Strategy: Try RPC list_discoverable_members with admin privileges
  try {
    const { data, error } = await admin.rpc("list_discoverable_members", {
      p_search: search,
      p_limit: limit,
      p_offset: offset,
    });

    if (!error && Array.isArray(data)) {
      return data.map((r: any) => ({
        member_id: r.member_id,
        display_name: r.display_name?.trim() || "CSC Member",
        city: r.city?.trim() || null,
        designation: r.designation?.trim() || null,
        about_me: r.about_me || null,
        skills: Array.isArray(r.skills) ? r.skills : [],
        startup_name: r.startup_name?.trim() || null,
        whatsapp: r.whatsapp || null,
        has_photo: Boolean(r.has_photo),
        member_number: r.member_number || null,
        membership_status: r.membership_status || "active",
      }));
    }
  } catch (err) {
    console.warn("[discoverable] RPC list_discoverable_members error, falling back to direct table query:", err);
  }

  // 2. Fallback Strategy: Direct table queries if RPC is unmigrated or fails
  try {
    const { data: activeMemberships, error: memError } = await admin
      .from("memberships")
      .select("user_id, member_number, status, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (memError || !activeMemberships || activeMemberships.length === 0) {
      return [];
    }

    const memberMap = new Map<string, { member_number?: string | null; status?: string | null }>(
      activeMemberships.map((m) => [m.user_id, m])
    );
    const userIds = activeMemberships.map((m) => m.user_id);

    let query = admin
      .from("profiles")
      .select(`
        id,
        display_name,
        full_name,
        city,
        designations,
        about_me,
        skills,
        whatsapp,
        portrait_path,
        avatar_url,
        consent,
        created_at
      `)
      .in("id", userIds);

    if (search) {
      query = query.or(`display_name.ilike.%${search}%,full_name.ilike.%${search}%,city.ilike.%${search}%`);
    }

    const { data: profiles, error: tableError } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (tableError || !profiles) {
      console.error("[discoverable] Direct profiles table query failed:", tableError);
      return [];
    }

    // Fetch claims for designation/startup fallbacks
    const profileIds = profiles.map((p) => p.id);
    const { data: claims } = await admin
      .from("membership_claims")
      .select("user_id, designation, startup_affiliation, submitted_at")
      .in("user_id", profileIds)
      .order("submitted_at", { ascending: false });

    const claimsByUser = new Map<string, { designation?: string | null; startup_affiliation?: string | null }>();
    if (claims) {
      for (const c of claims) {
        if (!claimsByUser.has(c.user_id)) {
          claimsByUser.set(c.user_id, c);
        }
      }
    }

    return profiles.map((p: any) => {
      const membership = memberMap.get(p.id);
      const claim = claimsByUser.get(p.id);
      const shareWa = p.consent?.shareWhatsappWithMembers === true;

      const designation =
        p.designations?.[0] ||
        claim?.designation ||
        null;

      const startupName =
        claim?.startup_affiliation?.trim() ||
        null;

      return {
        member_id: p.id,
        display_name: p.display_name?.trim() || p.full_name?.trim() || "CSC Member",
        city: p.city?.trim() || null,
        designation,
        about_me: p.about_me || null,
        skills: Array.isArray(p.skills) ? p.skills : [],
        startup_name: startupName,
        whatsapp: shareWa ? p.whatsapp : null,
        has_photo: Boolean(p.portrait_path || (p.avatar_url && p.avatar_url.trim().length > 0)),
        member_number: membership?.member_number || null,
        membership_status: membership?.status || "active",
      };
    });
  } catch (err) {
    console.error("[discoverable] Fatal fallback error:", err);
    return [];
  }
}

export async function fetchDiscoverableMember(memberId: string): Promise<DiscoverableMemberRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) return null;

  const admin = createAdminClient();

  // 1. Try RPC get_discoverable_member first
  try {
    const { data, error } = await admin.rpc("get_discoverable_member", { p_member_id: memberId });
    if (!error && data?.[0]) {
      const r = data[0] as any;
      return {
        member_id: r.member_id,
        display_name: r.display_name?.trim() || "CSC Member",
        city: r.city?.trim() || null,
        designation: r.designation?.trim() || null,
        about_me: r.about_me || null,
        skills: Array.isArray(r.skills) ? r.skills : [],
        startup_name: r.startup_name?.trim() || null,
        whatsapp: r.whatsapp || null,
        has_photo: Boolean(r.has_photo),
        startup_website: r.startup_website || null,
        member_number: r.member_number || null,
        membership_status: r.membership_status || "active",
      };
    }
  } catch (err) {
    console.warn("[discoverable] RPC get_discoverable_member error, falling back:", err);
  }

  // 2. Direct fallback
  try {
    const [{ data: profile }, { data: membership }, { data: claim }] = await Promise.all([
      admin.from("profiles").select("*").eq("id", memberId).maybeSingle(),
      admin.from("memberships").select("member_number, status").eq("user_id", memberId).maybeSingle(),
      admin
        .from("membership_claims")
        .select("designation, startup_affiliation")
        .eq("user_id", memberId)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (!profile || membership?.status !== "active") return null;

    const shareWa = (profile.consent as any)?.shareWhatsappWithMembers === true;
    const designation = profile.designations?.[0] || claim?.designation || null;
    const startupName = claim?.startup_affiliation?.trim() || null;

    return {
      member_id: profile.id,
      display_name: profile.display_name?.trim() || profile.full_name?.trim() || "CSC Member",
      city: profile.city?.trim() || null,
      designation,
      about_me: profile.about_me || null,
      skills: Array.isArray(profile.skills) ? profile.skills : [],
      startup_name: startupName,
      whatsapp: shareWa ? profile.whatsapp : null,
      has_photo: Boolean(profile.portrait_path || (profile.avatar_url && profile.avatar_url.trim().length > 0)),
      startup_website: null,
      member_number: membership.member_number || null,
      membership_status: membership.status || "active",
    };
  } catch (err) {
    console.error("[discoverable] Direct member lookup failed:", err);
    return null;
  }
}
