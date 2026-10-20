import { NextResponse } from "next/server";
import { z } from "zod";
import { getMemberContext } from "@/lib/services/member/context";
import { createClient } from "@/lib/supabase/server";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";
import { revalidateTag } from "next/cache";

export async function GET() {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live" || !ctx.user) return authResponse({ error: "Sign in to manage profile sharing." }, 401);
  const db = await createClient();
  const { data, error } = await db.rpc("get_member_profile_sharing_state");
  if (error) return authResponse({ error: "Profile sharing status could not be loaded." }, 503);
  return NextResponse.json({ state: data }, { headers: { "Cache-Control": "private, no-store" } });
}

const schema = z.object({
  enabled: z.boolean(),
  preferences: z.object({
    showPhoto: z.boolean(),
    showCity: z.boolean(),
    showRole: z.boolean(),
    showAbout: z.boolean(),
    showSkills: z.boolean(),
    showStartups: z.boolean(),
    shareWhatsapp: z.boolean(),
  }).partial().default({}),
});

export async function POST(request: Request) {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live" || !ctx.user) return authResponse({ error: "Sign in to manage profile sharing." }, 401);
  if (request.headers.get("origin") !== new URL(request.url).origin) return authResponse({ error: "Request origin could not be verified." }, 403);
  if (!rateLimit(`community-sharing:${ctx.user.id}`, 6, 60_000).allowed) return authResponse({ error: "Please wait before changing your sharing settings." }, 429);
  const body = await readAuthBody(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return authResponse({ error: "Review your community profile sharing choices." }, 422);
  const db = await createClient();
  const { data, error } = await db.rpc("set_member_profile_sharing", {
    p_enabled: parsed.data.enabled,
    p_preferences: parsed.data.preferences,
  });
  if (error) {
    if (error.code === "42501") return authResponse({ error: "An active CSC membership and a valid issued Digital ID are required to share your profile." }, 403);
    if (error.code === "23514") return authResponse({ error: "Complete the required member profile information before sharing." }, 422);
    return authResponse({ error: "Your profile sharing settings could not be saved." }, 503);
  }
  revalidateTag("directory", { expire: 0 });
  return NextResponse.json({ ok: true, state: data }, { headers: { "Cache-Control": "private, no-store" } });
}
