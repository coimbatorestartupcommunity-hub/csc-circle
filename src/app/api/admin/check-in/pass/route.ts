import { getAdminContext } from "@/lib/admin/gate";
import { authResponse } from "@/lib/auth/http";
import { createAdminClient } from "@/lib/supabase/admin";

const EVENT = /^[0-9a-f-]{36}$/i;
const REF = /^[a-f0-9]{64}$/;

/**
 * Read-only attendee pass card for the check-in scanner. Records NOTHING — the
 * POST /api/admin/check-in route already verified and recorded attendance and
 * returned the verdict. This fills in the member card (name, membership,
 * portrait) afterwards so the scan verdict is never delayed by these lookups.
 */
export async function GET(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !ctx.permissions.has("attendance.scan")) return authResponse({ error: "Event staff access required." }, 403);
    const url = new URL(request.url);
    const event = url.searchParams.get("event") ?? "";
    const ref = url.searchParams.get("ref") ?? "";
    if (!EVENT.test(event) || !REF.test(ref)) return authResponse({ attendee: null }, 422);
    const admin = createAdminClient();
    const { data: registration } = await admin.from("event_registrations")
      .select("user_id,reference,event_id,attendee_name,status")
      .eq("pass_token", ref).eq("event_id", event).maybeSingle();
    if (!registration || !["confirmed", "checked_in"].includes(registration.status)) return authResponse({ attendee: null });
    const [{ data: profile }, { data: membership }, { data: eventRow }] = await Promise.all([
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
    return authResponse({ attendee: {
      name: profile?.display_name || profile?.full_name || registration.attendee_name || "CSC Member",
      memberNumber: membership?.member_number ?? null,
      membershipStatus: membership?.status ?? null,
      designation: profile?.designations?.[0]?.replaceAll("_", " ") ?? null,
      startupName: typeof startup?.name === "string" ? startup.name : null,
      portraitUrl,
      eventTitle: eventRow?.title ?? null,
      registrationReference: registration.reference,
    } });
  } catch { return authResponse({ attendee: null }); }
}
