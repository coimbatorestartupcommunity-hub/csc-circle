import { z } from "zod";
import { getAdminContext } from "@/lib/admin/gate";
import { createClient } from "@/lib/supabase/server";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";
const schema = z.object({ event: z.string().uuid(), payload: z.object({ t: z.literal("csc.eventpass"), v: z.literal(1), ref: z.string().regex(/^[a-f0-9]{64}$/) }) });
export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !ctx.permissions.has("attendance.scan")) return authResponse({ error: "Event staff access required." }, 403);
    if (!rateLimit(`scan:${ctx.userId}`, 120, 60_000).allowed) return authResponse({ error: "Too many requests." }, 429);
    const parsed = schema.safeParse(await readAuthBody(request));
    if (!parsed.success) return authResponse({ status: "invalid", error: "Invalid event pass." }, 422);
    const sb = await createClient();
    const { data, error } = await sb.rpc("csc_check_in", { event: parsed.data.event, token: parsed.data.payload.ref });
    if (error) return authResponse({ error: "Could not verify this pass. Check your event assignment and retry." }, 409);
    // Return the verdict immediately. The attendee pass card (profile,
    // membership, portrait) is loaded separately via GET
    // /api/admin/check-in/pass so the scan result is never delayed by those
    // extra lookups.
    return authResponse(data as { status?: string; reference?: string; name?: string; checkedInAt?: string });
  } catch { return authResponse({ error: "Verification unavailable. No entry was recorded." }, 503); }
}
