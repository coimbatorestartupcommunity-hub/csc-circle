import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeRecovery } from "@/lib/auth/recovery";
import { safeNext } from "@/lib/auth/redirects";

/** Email token hashes are verified once by Supabase, independently of OAuth PKCE. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeNext(url.searchParams.get("next"));
  if (!token || !["signup", "email", "invite", "recovery"].includes(type ?? ""))
    return NextResponse.redirect(new URL("/login?error=invalid_link", url.origin));
  const sb = await createClient();
  const { data, error } = await sb.auth.verifyOtp({ token_hash: token, type: type as "signup" | "email" | "invite" | "recovery" });
  if (error || !data.user) return NextResponse.redirect(new URL("/login?error=invalid_link", url.origin));
  if (type === "recovery") {
    if (!await authorizeRecovery(data.user.id)) return NextResponse.redirect(new URL("/forgot-password?error=unavailable", url.origin));
    return NextResponse.redirect(new URL("/reset-password", url.origin));
  }
  return NextResponse.redirect(new URL(`/auth/complete?next=${encodeURIComponent(next)}`, url.origin));
}
