import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { can, getAdminContext } from "@/lib/admin/gate";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_PDF_SIZE = 8 * 1024 * 1024;

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  const context = await getAdminContext();
  if (context.mode !== "live" || !context.userId || !can(context, "content.manage")) return NextResponse.json({ error: "You are not authorized to upload resource files." }, { status: 403 });
  if (!rateLimit(`cms-upload:${context.userId}:${clientIp(request)}`, 30, 60 * 60_000).allowed) return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });

  const body = await request.json().catch(() => null) as { kind?: unknown; contentType?: unknown; size?: unknown; filename?: unknown } | null;
  if (body?.kind !== "document" || body.contentType !== "application/pdf" || typeof body.size !== "number" || !Number.isInteger(body.size) || body.size < 8 || body.size > MAX_PDF_SIZE) {
    return NextResponse.json({ error: "Choose a PDF document between 8 bytes and 8 MB." }, { status: 422 });
  }
  const path = `resource-docs/${randomUUID()}.pdf`;
  const { data, error } = await createAdminClient().storage.from("member-portraits").createSignedUploadUrl(path, { upsert: false });
  if (error || !data) return NextResponse.json({ error: "A secure upload could not be prepared." }, { status: 503 });
  const filename = typeof body.filename === "string" ? body.filename.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "document.pdf" : "document.pdf";
  return NextResponse.json({ ok: true, path, token: data.token, filename, mime: "application/pdf", size: body.size }, { headers: { "Cache-Control": "private, no-store" } });
}
