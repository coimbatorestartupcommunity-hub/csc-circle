import { NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirects";
import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";

/** Re-check the authoritative identity and account state after either sign-in method. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const user = await getAuthUser();
  if (!user?.email_confirmed_at) return NextResponse.redirect(new URL("/login", url.origin));
  const sb = await createClient();
  const { error: bootstrapError } = await sb.rpc("csc_ensure_profile");
  if (bootstrapError) return NextResponse.redirect(new URL("/access-denied", url.origin));
  // Resolve administrative identity server-side, but retain the requested
  // profile landing by default for every account.
  const { data: adminRoles } = await sb
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .limit(1);
  if (adminRoles && adminRoles.length > 0) {
    const requested = safeNext(url.searchParams.get("next"));
    const adminTarget = requested === "/admin" || requested.startsWith("/admin/") ? requested : "/member/profile";
    // First verified login queues a welcome in an auth.users trigger. Drain
    // it after successful auth completion instead of waiting for daily cron.
    scheduleNotificationDelivery();
    return NextResponse.redirect(new URL(`/auth/success?next=${encodeURIComponent(adminTarget)}`, url.origin));
  }
  const [{ data: membership, error: membershipError }, { data: profile, error: profileError }] = await Promise.all([
    sb.from("memberships").select("status").eq("user_id", user.id).maybeSingle(),
    sb.from("profiles").select("id").eq("id", user.id).maybeSingle(),
  ]);
  if (membershipError || profileError) return NextResponse.redirect(new URL("/access-denied", url.origin));
  if (membership && ["suspended", "revoked", "rejected"].includes(membership.status))
    return NextResponse.redirect(new URL("/access-denied", url.origin));
  const next = safeNext(url.searchParams.get("next"));
  // Incomplete profiles are completed on the profile page itself; avoid
  // splitting first-time members into an unrelated empty onboarding screen.
  if (!profile) return NextResponse.redirect(new URL("/access-denied", url.origin));
  // Drain queued first-login welcome emails for ordinary member accounts too.
  scheduleNotificationDelivery();
  return NextResponse.redirect(new URL(`/auth/success?next=${encodeURIComponent(next)}`, url.origin));
}
