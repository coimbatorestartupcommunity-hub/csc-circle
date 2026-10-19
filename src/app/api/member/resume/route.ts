import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMemberContext } from "@/lib/services/member/context";
import { blankResume, resumeSchema } from "@/lib/resume/schema";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const ctx = await getMemberContext();
  if (ctx.mode === "closed") return NextResponse.json({ error: "Sign in to access your resume." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  if (ctx.mode === "preview") return NextResponse.json({ resume: blankResume(), demo: true }, { headers: { "Cache-Control": "private, no-store" } });
  const db = await createClient();
  const { data, error } = await db.from("member_resumes").select("resume_data").eq("user_id", ctx.user!.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load your resume." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  const parsed = data ? resumeSchema.safeParse(data.resume_data) : null;
  if (parsed && !parsed.success) return NextResponse.json({ error: "Saved resume data needs review before editing." }, { status: 409, headers: { "Cache-Control": "private, no-store" } });
  return NextResponse.json({ resume: parsed?.success ? parsed.data : blankResume(), demo: false }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request) {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return NextResponse.json({ error: "Sign in to save your resume." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  if (!rateLimit(`resume:${ctx.user!.id}`, 12, 60_000).allowed) return NextResponse.json({ error: "Please wait before saving again." }, { status: 429, headers: { "Cache-Control": "private, no-store" } });
  if (Number(request.headers.get("content-length") ?? 0) > 120_000) return NextResponse.json({ error: "Resume content is too large." }, { status: 413, headers: { "Cache-Control": "private, no-store" } });
  let body: unknown;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > 120_000) return NextResponse.json({ error: "Resume content is too large." }, { status: 413, headers: { "Cache-Control": "private, no-store" } });
    body = JSON.parse(text);
  } catch { return NextResponse.json({ error: "Invalid resume data." }, { status: 400, headers: { "Cache-Control": "private, no-store" } }); }
  const parsed = resumeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Review the highlighted fields and try again.", issues: parsed.error.issues.map(({ path, message }) => ({ path, message })) }, { status: 422, headers: { "Cache-Control": "private, no-store" } });
  const db = await createClient();
  const { error } = await db.from("member_resumes").upsert({ user_id: ctx.user!.id, resume_data: parsed.data, schema_version: 1 }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: "Your resume could not be saved. Please try again." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() }, { headers: { "Cache-Control": "private, no-store" } });
}
