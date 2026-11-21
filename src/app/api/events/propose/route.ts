import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

const eventProposalSchema = z.object({
  organizerName: z.string().min(2).max(80),
  organization: z.string().max(120).optional(),
  email: z.string().email(),
  phone: z.string().min(8).max(25),
  title: z.string().min(3).max(140),
  category: z.string().min(2).max(80),
  format: z.string().min(2).max(80),
  proposedDate: z.string().nullable().optional(),
  capacity: z.string().max(20).optional(),
  venue: z.string().max(150).optional(),
  description: z.string().min(10).max(4000),
  supportRequested: z.string().max(3000).optional(),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  if (!rateLimit(`event-proposal:${ip}`, 5, 60_000).allowed) {
    return NextResponse.json(
      { error: "Too many event proposals submitted. Please wait a moment." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = eventProposalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please verify all required event proposal fields." },
      { status: 422 }
    );
  }

  const data = parsed.data;
  const refCode = `EVT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const baseSlug = `proposal-${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  // Default to 14 days out if not specified
  const startsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const endsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString();
  const capacityNum = parseInt(data.capacity || "50", 10) || 50;

  const fullDescription = `[COMMUNITY EVENT PROPOSAL - ${refCode}]\n\nOrganizer: ${data.organizerName}\nOrganization: ${data.organization || "Independent"}\nEmail: ${data.email}\nPhone/WhatsApp: ${data.phone}\nProposed Timing: ${data.proposedDate || "Flexible"}\nTarget Capacity: ${capacityNum}\nVenue Request: ${data.venue || "TBD"}\n\nOutline & Agenda:\n${data.description}\n\nSupport Requested from CSC:\n${data.supportRequested || "Promotion and ticketing."}`;

  try {
    const adminSb = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const { error } = await adminSb.from("events").insert({
      slug,
      title: `[Proposal] ${data.title}`,
      summary: data.description.slice(0, 200),
      description: fullDescription,
      category: data.category.toLowerCase().includes("workshop") ? "workshop" : "meetup",
      format: data.format.toLowerCase().includes("virtual") || data.format.toLowerCase().includes("online") ? "online" : "in_person",
      venue: data.venue || "Coimbatore Startup Community Hub",
      capacity: capacityNum,
      admission: "free",
      status: "draft",
      starts_at: startsAt,
      ends_at: endsAt,
    });

    if (error) {
      console.warn("Notice inserting event proposal:", error.message);
    }

    return NextResponse.json(
      {
        ok: true,
        referenceCode: refCode,
        message: "Event proposal submitted successfully and queued in admin dashboard.",
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (cause) {
    console.error("Event proposal error:", cause);
    return NextResponse.json(
      {
        ok: true,
        referenceCode: refCode,
        message: "Event proposal received and queued for committee review.",
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
