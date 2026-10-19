import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMemberContext } from "@/lib/services/member/context";
import { profileResumeDefaults, resumeSchema } from "@/lib/resume/schema";
import { renderResumePdf } from "@/lib/resume/pdf";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return NextResponse.json({ error: "Sign in to preview your resume." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  if (!rateLimit(`resume-pdf:${ctx.user!.id}`, 10, 60_000).allowed) return NextResponse.json({ error: "Please wait before generating another preview." }, { status: 429, headers: { "Cache-Control": "private, no-store" } });
  try {
    const db = await createClient();
    const [{ data: record, error: resumeError }, { data: profile, error: profileError }] = await Promise.all([
      db.from("member_resumes").select("resume_data").eq("user_id", ctx.user!.id).maybeSingle(),
      db.from("profiles").select("full_name,display_name,email,whatsapp,city,skills").eq("id", ctx.user!.id).maybeSingle(),
    ]);
    if (resumeError || profileError) return NextResponse.json({ error: "Your resume could not be loaded." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
    const parsed = record ? resumeSchema.safeParse(record.resume_data) : null;
    if (parsed && !parsed.success) return NextResponse.json({ error: "Saved resume data is invalid. Open Resume Creation and save your details again." }, { status: 409, headers: { "Cache-Control": "private, no-store" } });
    const data = parsed?.success ? parsed.data : profileResumeDefaults(profile ?? {});
    if (!data.name.trim()) return NextResponse.json({ error: "Add your name before generating a resume." }, { status: 422, headers: { "Cache-Control": "private, no-store" } });
    const pdf = await renderResumePdf(data);
    const safeName = (data.name.normalize("NFKD").replace(/[^\p{L}\p{N} _-]/gu, "").trim().replace(/\s+/g, "_") || "Member").slice(0, 80);
    const disposition = new URL(request.url).searchParams.has("inline") ? "inline" : "attachment";
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.byteLength),
        "Content-Disposition": `${disposition}; filename="${safeName}_Resume.pdf"; filename*=UTF-8''${encodeURIComponent(`${safeName}_Resume.pdf`)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "The resume PDF could not be generated." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
