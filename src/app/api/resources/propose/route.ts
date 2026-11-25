import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { dispatchTeamWhatsAppAlert } from "@/lib/services/team-alerts";

const resourceProposalSchema = z.object({
  title: z.string().min(3).max(180),
  category: z.string().min(2).max(100),
  resourceType: z.string().default("guide"),
  summary: z.string().min(10).max(600),
  details: z.string().min(20).max(8000),
  externalUrl: z.string().url().nullable().optional().or(z.literal("")),
  contributorName: z.string().min(2).max(80),
  designation: z.string().max(100).optional(),
  startup: z.string().max(120).optional(),
  email: z.string().email(),
  phone: z.string().min(8).max(25),
  website_trap_field: z.string().max(0, "Bot submission detected").optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const rl = rateLimit(`resource-proposal:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait a moment before trying again." },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders(rl, 5),
          "Cache-Control": "private, no-store",
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = resourceProposalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please verify all required resource proposal fields." },
      { status: 422 }
    );
  }

  const data = parsed.data;

  // Invisible Honeypot check
  if (data.website_trap_field && data.website_trap_field.trim().length > 0) {
    return NextResponse.json({ ok: true, referenceCode: "RES-HUMAN-VERIFIED" });
  }

  const now = new Date();
  const refCode = `RES-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const baseSlug = `proposal-${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 45)}`;
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  try {
    const adminSb = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const description = `### Contributor & Context
- Contributor: ${data.contributorName} (${data.designation || "Founder"} at ${data.startup || "Independent"})
- Email: ${data.email} | Phone: ${data.phone}
- Reference Code: ${refCode}
${data.externalUrl ? `- External Link: ${data.externalUrl}` : ""}

### Resource Content & Playbook
${data.details}`;

    const { error } = await adminSb.from("resources").insert({
      slug,
      title: `[Proposal] ${data.title}`,
      category: data.category,
      resource_type: data.resourceType || "document",
      summary: data.summary,
      description,
      external_url: data.externalUrl || null,
      source_name: data.startup || "Community Playbook",
      source_organization: data.startup || "CSC Ecosystem",
      source_url: data.externalUrl || null,
      author: data.contributorName,
      publication_status: "draft",
      publication_consent: true,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });

    if (error) {
      console.error("Failed to insert resource proposal:", error);
      throw error;
    }

    // Dispatch real-time alert to Leadership Team WhatsApp Group & Admin phone
    void dispatchTeamWhatsAppAlert({
      type: "resource_proposed",
      title: "New Community Resource Proposed",
      fields: {
        "Title": data.title,
        "Category": data.category,
        "Contributor": data.contributorName,
        "Startup / Org": data.startup || "Independent",
        "Email": data.email,
        "Phone": data.phone,
        "Reference": refCode,
      },
      actionUrl: "https://csc.logicintelligencetechnologies.in/admin/resources",
    }).catch((alertErr) => console.warn("[POST /api/resources/propose] Team alert note:", alertErr));

    return NextResponse.json({
      ok: true,
      referenceCode: refCode,
      message: "Resource submitted for editorial review.",
    });
  } catch (err) {
    console.error("Resource proposal submission error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record resource submission." },
      { status: 500 }
    );
  }
}
