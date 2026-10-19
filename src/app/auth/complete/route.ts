import { NextResponse } from "next/server";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirects";

/** Re-check the authoritative identity and account state after either sign-in method. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const user = await getAuthUser();
  if (!user?.email_confirmed_at) return NextResponse.redirect(new URL("/login", url.origin));
  const sb = await createClient();
  const { error: bootstrapError } = await sb.rpc("csc_ensure_profile", {});
  if (bootstrapError) return NextResponse.redirect(new URL("/access-denied", url.origin));
  const [{ data: membership, error: membershipError }, { data: profile, error: profileError }] = await Promise.all([
    sb.from("memberships").select("status").eq("user_id", user.id).maybeSingle(),
    sb.from("profiles").select("profile_completion").eq("id", user.id).maybeSingle(),
  ]);
  if (membershipError || profileError) return NextResponse.redirect(new URL("/access-denied", url.origin));
  if (membership && ["suspended", "revoked", "rejected"].includes(membership.status))
    return NextResponse.redirect(new URL("/access-denied", url.origin));
  const next = safeNext(url.searchParams.get("next"));
  const target = !profile || profile.profile_completion < 100 ? "/member/onboarding" : next;
  return NextResponse.redirect(new URL(target, url.origin));
}
