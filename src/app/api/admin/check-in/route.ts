import { z } from "zod";
import { getAdminContext } from "@/lib/admin/gate";
import { createClient } from "@/lib/supabase/server";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
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
    const result = data as { status?: string; reference?: string; name?: string; checkedInAt?: string };
    if (result.status === "valid" || result.status === "already") {
      try {
        const admin = createAdminClient();
        const { data: registration } = await admin.from("event_registrations").select("user_id,reference,event_id,attendee_name").eq("pass_token", parsed.data.payload.ref).eq("event_id", parsed.data.event).maybeSingle();
        if (registration) {
          const [{ data: profile }, { data: membership }, { data: event }] = await Promise.all([
            admin.from("profiles").select("full_name,display_name,portrait_path,designations,startup").eq("id", registration.user_id).maybeSingle(),
            admin.from("memberships").select("member_number,status").eq("user_id", registration.user_id).maybeSingle(),
            admin.from("events").select("title").eq("id", registration.event_id).maybeSingle(),
          ]);
          let portraitUrl: string | null = null;
          if (profile?.portrait_path) {
            const { data: signed } = await admin.storage.from("member-portraits").createSignedUrl(profile.portrait_path, 5 * 60);
            portraitUrl = signed?.signedUrl ?? null;
          }
          const startup = profile?.startup && typeof profile.startup === "object" && !Array.isArray(profile.startup) ? profile.startup as Record<string, unknown> : null;
          return authResponse({ ...result, attendee: {
            name: profile?.display_name || profile?.full_name || registration.attendee_name || result.name || "CSC Member",
            memberNumber: membership?.member_number ?? null,
            membershipStatus: membership?.status ?? null,
            designation: profile?.designations?.[0]?.replaceAll("_", " ") ?? null,
            startupName: typeof startup?.name === "string" ? startup.name : null,
            portraitUrl,
            eventTitle: event?.title ?? null,
            registrationReference: registration.reference,
          } });
        }
      } catch {
        // Successful admission is already recorded atomically; card enrichment is optional.
      }
    }
    return authResponse(result);
  } catch { return authResponse({ error: "Verification unavailable. No entry was recorded." }, 503); }
}
