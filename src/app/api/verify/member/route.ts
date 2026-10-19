import { z } from "zod";
import { createAnonClient } from "@/lib/supabase/anon";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
export async function POST(request: Request) {
  if (!rateLimit(`verify-member:${clientIp(request)}`, 30, 60_000).allowed) return authResponse({ valid: false }, 429);
  try {
    const parsed = z.object({ t: z.literal("csc.membership"), v: z.literal(1), ref: z.string().regex(/^[a-f0-9]{64}$/) }).safeParse(await readAuthBody(request));
    if (!parsed.success) return authResponse({ valid: false }, 422);
    const sb = createAnonClient(); const { data, error } = await sb.rpc("csc_verify_membership", { token: parsed.data.ref });
    if (error) return authResponse({ valid: false, error: "Verification unavailable." }, 503);
    return authResponse({ valid: data === true });
  } catch { return authResponse({ valid: false, error: "Verification unavailable." }, 503); }
}
