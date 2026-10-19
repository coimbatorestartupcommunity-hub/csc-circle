import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin/gate";
import { createClient } from "@/lib/supabase/server";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import type { Permission } from "@/lib/admin/permissions";
const schema = z.object({ kind: z.enum(["claim", "member", "registration", "payment", "review", "startup", "consultation"]), target: z.string().uuid(), decision: z.string().min(1).max(40), reason: z.string().max(1000).default("") });
const permissions: Record<string, Permission> = { claim: "members.approve", member: "members.suspend", registration: "registrations.approve", payment: "payments.verify", review: "reviews.moderate", startup: "directory.manage", consultation: "consultations.manage" };
export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live") return authResponse({ error: "Administrator access required." }, 403);
    if (!rateLimit(`admin:${ctx.userId}:${clientIp(request)}`, 30, 60_000).allowed) return authResponse({ error: "Too many requests." }, 429);
    const parsed = schema.safeParse(await readAuthBody(request));
    if (!parsed.success) return authResponse({ error: "Invalid action." }, 422);
    if (!ctx.permissions.has(permissions[parsed.data.kind])) return authResponse({ error: "Permission denied." }, 403);
    const sb = await createClient();
    const { data, error } = await sb.rpc("csc_admin_action", parsed.data);
    if (error) return authResponse({ error: "Action was not saved. Check the current state, required reason, payment, and capacity." }, 409);
    for (const tag of ["events", "directory", "reviews"]) revalidateTag(tag, { expire: 0 });
    scheduleNotificationDelivery();
    return authResponse({ ok: true, result: data });
  } catch { return authResponse({ error: "Could not process the action." }, 503); }
}
