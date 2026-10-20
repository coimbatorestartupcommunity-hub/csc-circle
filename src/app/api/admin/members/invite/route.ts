import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !ctx.permissions.has("members.approve")) return authResponse({ error: "Member invitation permission required." }, 403);
    if (!rateLimit(`member-invite:${ctx.userId}:${clientIp(request)}`, 10, 60 * 60_000).allowed) return authResponse({ error: "Too many invitations. Try again later." }, 429);
    const parsed = z.object({ email: z.string().trim().email().max(254) }).safeParse(await readAuthBody(request));
    if (!parsed.success) return authResponse({ error: "Enter a valid email address." }, 422);
    const email = parsed.data.email.toLowerCase();
    const admin = createAdminClient();
    const redirectTo = new URL("/auth/confirm?next=%2Fmember%2Fprofile", new URL(request.url).origin).toString();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (error || !data.user) {
      if (/already registered|already been registered|already exists/i.test(error?.message ?? "")) return authResponse({ error: "An account already exists for this email. The person can sign in to complete their profile." }, 409);
      return authResponse({ error: "Invitation could not be sent. Verify the CSC email configuration and try again." }, 503);
    }
    await admin.from("audit_logs").insert({ action: "member.invited", actor_id: ctx.userId, target_type: "auth_user", target_id: data.user.id, after: { status: "invited" }, correlation_id: randomUUID() });
    return authResponse({ ok: true, message: "Invitation sent. The recipient must verify their account and complete their profile; membership approval remains a separate step." });
  } catch { return authResponse({ error: "Member invitation is unavailable." }, 503); }
}
