import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirects";

/**
 * OAuth / magic-link callback. Exchanges the auth code for a session cookie,
 * then redirects into the member area (or a safe relative `next`).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams, origin } = url;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  // Supabase can send provider errors back without an authorization code.
  // Preserve only a controlled reason for the UI; never reflect provider text,
  // OAuth codes, state, or tokens into the page or application logs.
  if (!code) {
    const providerError = searchParams.has("error") || searchParams.has("error_code");
    console.warn("[auth] OAuth callback did not include a code", {
      cause: providerError ? "provider_error" : "missing_code",
      host: url.host,
    });
    return NextResponse.redirect(
      new URL(`/login?error=auth_failed&cause=${providerError ? "provider" : "callback"}`, origin),
    );
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(
          new URL(`/auth/complete?next=${encodeURIComponent(next)}`, origin),
        );
      }
      console.warn("[auth] OAuth code exchange failed", {
        cause: "exchange_failed",
        errorCode: error.code ?? "unknown",
        host: url.host,
      });
    } catch {
      console.warn("[auth] OAuth code exchange threw", {
        cause: "exchange_exception",
        host: url.host,
      });
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=auth_failed&cause=exchange", origin),
  );
}
