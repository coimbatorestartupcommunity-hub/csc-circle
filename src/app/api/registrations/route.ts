import { z } from "zod";
import { getMemberContext } from "@/lib/services/member/context";
import { createClient } from "@/lib/supabase/server";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";
export async function POST(request: Request) {
  try {
    const ctx = await getMemberContext();
    if (ctx.mode !== "live") return authResponse({ error: "Sign in with your CSC account." }, 401);
    if (!rateLimit(`registration:${ctx.user!.id}`, 10, 60_000).allowed) return authResponse({ error: "Too many requests." }, 429);
    const parsed = z.object({ event: z.string().uuid(), objective: z.string().trim().min(2).max(500) }).safeParse(await readAuthBody(request));
    if (!parsed.success) return authResponse({ error: "Check the event and objective." }, 422);
    const sb = await createClient();
    const { data, error } = await sb.rpc("csc_register_event", parsed.data);
    if (error) return authResponse({ error: "Registration unavailable. An active membership and open event are required." }, 409);
    return authResponse({ ok: true, registration: data });
  } catch { return authResponse({ error: "Could not register. Please try again." }, 503); }
}
