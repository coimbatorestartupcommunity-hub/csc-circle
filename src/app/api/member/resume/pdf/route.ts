import { NextResponse } from "next/server";
import { getMemberContext } from "@/lib/services/member/context";
import { createClient } from "@/lib/supabase/server";
import { authResponse } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";
import { resumeDataSchema } from "@/lib/member/resume-schema";
import { createMemberResumePdf } from "@/lib/member/resume-pdf";

export async function GET(request: Request) {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live" || !ctx.user) return authResponse({ error: "Sign in to preview or download your resume." }, 401);
  if (!rateLimit(`member-resume-pdf:${ctx.user.id}`, 10, 60_000).allowed) return authResponse({ error: "Too many PDF requests. Please wait before exporting again." }, 429);

  const supabase = await createClient();
  const [{ data: saved, error: resumeError }, { data: profile, error: profileError }] = await Promise.all([
    supabase.rpc("get_member_resume"),
    supabase.from("profiles").select("full_name,display_name").eq("id", ctx.user.id).maybeSingle(),
  ]);
  if (resumeError || profileError || !profile) return authResponse({ error: "Resume data could not be loaded." }, 503);
  const parsed = resumeDataSchema.safeParse(saved ?? {});
  if (!parsed.success) return authResponse({ error: "Review and save your resume information before exporting." }, 422);
  const name = (profile.display_name || profile.full_name || "CSC Member").trim();

  try {
    const bytes = await createMemberResumePdf(name, parsed.data);
    const safeName = name.normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "CSC_Member";
    const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
    return new NextResponse(Buffer.from(bytes), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${safeName}_Resume.pdf"; filename*=UTF-8''${encodeURIComponent(`${safeName}_Resume.pdf`)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    console.error("CSC_MEMBER_RESUME_PDF_FAILED", { userId: ctx.user.id });
    return authResponse({ error: "The PDF could not be generated. Please retry in a moment." }, 503);
  }
}
