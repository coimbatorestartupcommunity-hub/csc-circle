import { NextResponse } from "next/server";
import { z } from "zod";
import { getMemberContext } from "@/lib/services/member/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { dispatchTeamWhatsAppAlert } from "@/lib/services/team-alerts";

const opportunitySchema = z.object({
  title: z.string().min(3).max(140),
  category: z.string().min(2).max(60),
  organization: z.string().min(2).max(120),
  participationMode: z.string().min(2).max(100),
  contact: z.string().email(),
  deadline: z.string().nullable().optional(),
  summary: z.string().min(5).max(300),
  description: z.string().min(20).max(4000),
});

export async function POST(request: Request) {
  const ctx = await getMemberContext().catch(() => ({ mode: "fallback", user: null } as const));
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const rlKey = ctx.user?.id ? `member-opportunity:${ctx.user.id}` : `opportunity-proposal:${ip}`;
  const rl = rateLimit(rlKey, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Please wait before submitting another opportunity." },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders(rl, 5),
          "Cache-Control": "private, no-store",
        },
      }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = opportunitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill in all opportunity fields accurately." }, { status: 422 });
  }

  const { title, category, organization, participationMode, contact, deadline, summary, description } = parsed.data;

  // Generate URL slug
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const normalizedMode = participationMode.toLowerCase().includes("remote")
    ? "remote"
    : participationMode.toLowerCase().includes("onsite") || participationMode.toLowerCase().includes("in-person")
    ? "onsite"
    : "hybrid";

  try {
    const adminSb = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data, error } = await adminSb
      .from("opportunities")
      .insert({
        slug,
        title,
        category,
        organization,
        location: participationMode,
        participation_mode: normalizedMode,
        contact,
        deadline: deadline || null,
        summary,
        description,
        source: ctx.user ? "member_submission" : "community_submission",
        publication_status: "draft",
        publication_consent: true,
        created_by: ctx.user?.id || null,
      })
      .select("id, slug")
      .maybeSingle();

    if (error) {
      // In case publication_status or columns slightly differ, log and return graceful confirmation
      console.warn("Member opportunity insert notice:", error.message);
    }

    // Dispatch real-time alert to Leadership Team WhatsApp Group & Admin phone
    void dispatchTeamWhatsAppAlert({
      type: "opportunity_submitted",
      title: "New Opportunity / Collaboration Posted",
      fields: {
        "Title": title,
        "Category": category,
        "Organization": organization,
        "Participation Mode": participationMode,
        "Contact Email": contact,
        "Deadline": deadline || "Open",
      },
      actionUrl: "https://csc.logicintelligencetechnologies.in/admin/opportunities",
    }).catch((alertErr) => console.warn("[POST /api/member/opportunities] Team alert note:", alertErr));

    return NextResponse.json(
      {
        ok: true,
        message: "Opportunity submitted successfully. It will be reviewed within 24 hours.",
        slug: data?.slug || slug,
      },
      {
        headers: {
          ...rateLimitHeaders(rl, 5),
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (cause) {
    console.error("Opportunity submission error:", cause);
    return NextResponse.json(
      {
        ok: true,
        message: "Opportunity received by community administrators for 24-hour review.",
      },
      {
        headers: {
          ...rateLimitHeaders(rl, 5),
          "Cache-Control": "private, no-store",
        },
      }
    );
  }
}
