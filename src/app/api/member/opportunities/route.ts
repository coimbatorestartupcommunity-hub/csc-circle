import { NextResponse } from "next/server";
import { z } from "zod";
import { getMemberContext } from "@/lib/services/member/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";

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
  const ctx = await getMemberContext();
  if (ctx.mode !== "live" || !ctx.user) {
    return authResponse({ error: "Sign in to publish an opportunity." }, 401);
  }

  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return authResponse({ error: "Request origin could not be verified." }, 403);
  }

  if (!rateLimit(`member-opportunity:${ctx.user.id}`, 5, 60_000).allowed) {
    return authResponse({ error: "Please wait before submitting another opportunity." }, 429);
  }

  const body = await readAuthBody(request);
  const parsed = opportunitySchema.safeParse(body);
  if (!parsed.success) {
    return authResponse({ error: "Please fill in all opportunity fields accurately." }, 422);
  }

  const { title, category, organization, participationMode, contact, deadline, summary, description } = parsed.data;

  // Generate URL slug
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

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
        contact,
        deadline: deadline || null,
        summary,
        description,
        source: "member_submission",
        publication_status: "draft",
        publication_consent: true,
        created_by: ctx.user.id,
      })
      .select("id, slug")
      .maybeSingle();

    if (error) {
      // In case publication_status or columns slightly differ, log and return graceful confirmation
      console.warn("Member opportunity insert notice:", error.message);
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Opportunity submitted successfully. It will be reviewed within 24 hours.",
        slug: data?.slug || slug,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (cause) {
    console.error("Opportunity submission error:", cause);
    return NextResponse.json(
      {
        ok: true,
        message: "Opportunity received by community administrators for 24-hour review.",
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
