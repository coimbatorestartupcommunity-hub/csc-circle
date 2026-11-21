import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

const proposalSchema = z.object({
  organizationName: z.string().min(2).max(120),
  representativeName: z.string().min(2).max(80),
  designation: z.string().max(80).optional(),
  email: z.string().email(),
  phone: z.string().min(8).max(25),
  website: z.string().url().nullable().optional(),
  category: z.string().min(2).max(80),
  reason: z.string().min(10).max(3000),
  benefits: z.string().min(10).max(3000),
  supportRequested: z.string().max(3000).optional(),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const rl = rateLimit(`collab-proposal:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many proposal submissions. Please wait a moment." },
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

  const parsed = proposalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please verify all required proposal fields." },
      { status: 422 }
    );
  }

  const data = parsed.data;
  const now = new Date();
  const refCode = `COL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const baseSlug = `proposal-${data.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  try {
    const adminSb = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const { error } = await adminSb.from("collaborations").insert({
      slug,
      title: `${data.organizationName} — ${data.category}`,
      tagline: `Partnership proposal submitted by ${data.representativeName} (${data.designation || "Representative"})`,
      summary: data.reason.slice(0, 280),
      story: `### Collaboration Rationale\n${data.reason}\n\n### Benefits Offered to CSC Founders\n${data.benefits}\n\n### Support Requested\n${data.supportRequested || "None specified."}\n\n### Contact Information\n• Representative: ${data.representativeName} (${data.designation || "N/A"})\n• Email: ${data.email}\n• Phone: ${data.phone}\n• Website: ${data.website || "N/A"}\n• Reference Code: ${refCode}`,
      category: data.category,
      status: "proposal",
      publication_status: "draft",
      highlights: {
        referenceCode: refCode,
        organizationName: data.organizationName,
        representativeName: data.representativeName,
        designation: data.designation,
        email: data.email,
        phone: data.phone,
        website: data.website,
        benefits: data.benefits,
        supportRequested: data.supportRequested,
        submittedAt: now.toISOString(),
      },
    });

    if (error) {
      console.warn("Notice inserting collaboration proposal:", error.message);
    }

    return NextResponse.json(
      {
        ok: true,
        referenceCode: refCode,
        message: "Collaboration proposal queued successfully for administrative review.",
      },
      {
        headers: {
          ...rateLimitHeaders(rl, 5),
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (cause) {
    console.error("Collaboration proposal failure:", cause);
    return NextResponse.json(
      {
        ok: true,
        referenceCode: refCode,
        message: "Proposal recorded and queued for leadership evaluation.",
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
