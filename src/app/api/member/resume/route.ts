import { NextResponse } from "next/server";
import { getMemberContext } from "@/lib/services/member/context";
import { createClient } from "@/lib/supabase/server";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";
import { emptyResumeData, resumeDataSchema } from "@/lib/member/resume-schema";

export async function GET() {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live" || !ctx.user) return authResponse({ error: "Sign in to access your resume." }, 401);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_member_resume");
  if (error) return authResponse({ error: "Resume information could not be loaded." }, 503);
  const parsed = resumeDataSchema.safeParse(data ?? {});
  if (!parsed.success) return NextResponse.json({ data: emptyResumeData, warning: "Some saved resume data needs correction." }, { headers: { "Cache-Control": "private, no-store" } });
  return NextResponse.json({ data: parsed.data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return authResponse({ error: "Request origin could not be verified." }, 403);
  const ctx = await getMemberContext();
  if (ctx.mode !== "live" || !ctx.user) return authResponse({ error: "Sign in to save your resume." }, 401);
  if (!rateLimit(`member-resume-save:${ctx.user.id}`, 12, 60_000).allowed) return authResponse({ error: "Too many resume updates. Please wait a moment." }, 429);
  const body = await readAuthBody(request);
  const parsed = resumeDataSchema.safeParse(body);
  if (!parsed.success) return authResponse({ error: parsed.error.issues[0]?.message ?? "Review the resume fields and try again." }, 422);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_member_resume", { p_resume_data: parsed.data });
  if (error) {
    console.error("CSC_MEMBER_RESUME_SAVE_FAILED", { code: error.code ?? "unknown" });
    return authResponse({ error: error.code === "22023" ? "Resume data is too large or invalid." : "Your resume could not be saved. Please try again." }, 503);
  }
  return NextResponse.json({ ok: true, updatedAt: data }, { headers: { "Cache-Control": "private, no-store" } });
}
