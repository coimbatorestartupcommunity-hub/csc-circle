import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Proxy (Next 16's renamed middleware). Refreshes the Supabase auth session
 * cookie for member/admin routes so Server Components see a current session.
 *
 * This is NOT an authorization boundary — real access checks live in the member
 * layout and in the data services (server-side, ownership-enforced via RLS).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Touch the session so expired tokens are refreshed into the response cookies.
  // Do not sign out when getUser returns an error: a transient Auth/network
  // failure is not proof that a session is invalid, and signOut also removes
  // pending PKCE verifiers. The OAuth callback needs that verifier to exchange
  // the authorization code for a session.
  try {
    await supabase.auth.getUser();
  } catch {
    // Auth availability does not grant access: each server data operation verifies identity.
  }
  response.headers.set("Cache-Control", "private, no-store");

  return response;
}

export const config = {
  // Auth callbacks must reach their Route Handler with the PKCE verifier
  // cookie intact. Session refresh occurs in the callback/confirmation handlers.
  matcher: ["/member/:path*", "/admin/:path*", "/login", "/signup", "/forgot-password", "/reset-password"],
};
