import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { safeNext } from "@/lib/auth/redirects";

/**
 * Proxy (Next 16's renamed middleware). Refreshes the Supabase auth session
 * cookie and gates application page requests on a verified Supabase identity.
 *
 * This is NOT an authorization boundary — real access checks live in the member
 * layout and in the data services (server-side, ownership-enforced via RLS).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    const path = request.nextUrl.pathname;
    const isAuthPublic = ["/login", "/signup", "/forgot-password", "/reset-password", "/privacy", "/terms", "/security", "/auth/callback", "/auth/confirm", "/auth/signout"]
      .some((item) => path === item || path.startsWith(`${item}/`));
    if (isAuthPublic || path.startsWith("/api/")) return response;
    return new NextResponse("Authentication is not configured. Please contact CSC support.", {
      status: 503,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

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

  const pathname = request.nextUrl.pathname;
  const isAuthPublic = [
    "/login", "/signup", "/forgot-password", "/reset-password",
    "/privacy", "/terms", "/security", "/auth/callback", "/auth/confirm", "/auth/signout",
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));

  // OAuth/email-confirmation handlers must be able to exchange their one-time
  // verifier before a session exists. They enforce their own callback checks.
  if (pathname === "/auth/callback" || pathname === "/auth/confirm") {
    return response;
  }

  // Read the cookie locally first, then verify any present access token with
  // getClaims. With asymmetric signing keys Supabase verifies against cached
  // JWKS; getUser would force a network round-trip for every page navigation.
  // Sensitive account/role changes are still checked with getUser in layouts
  // and service functions.
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    let verificationError = sessionError;
    let authenticated = false;
    if (session && !sessionError) {
      const verified = await supabase.auth.getClaims();
      authenticated = Boolean(verified.data?.claims?.sub);
      verificationError = verified.error;
    }
    const authenticationServiceUnavailable = verificationError &&
      (!verificationError.status || verificationError.status >= 500 || verificationError.status === 429);
    if (authenticationServiceUnavailable && !isAuthPublic) {
      return new NextResponse("Authentication is temporarily unavailable. Please retry.", {
        status: 503,
        headers: { "Cache-Control": "private, no-store", "Retry-After": "5" },
      });
    }
    if (!authenticated && !isAuthPublic && !pathname.startsWith("/api/")) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(login);
    }
    if (authenticated && pathname === "/login") {
      const target = "/auth/complete";
      const destination = new URL(target, request.url);
      if (pathname === "/login") destination.searchParams.set("next", safeNext(request.nextUrl.searchParams.get("next")));
      const redirect = NextResponse.redirect(destination);
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    }
  } catch {
    if (!isAuthPublic && !pathname.startsWith("/api/")) {
      return new NextResponse("Authentication is temporarily unavailable. Please retry.", {
        status: 503,
        headers: { "Cache-Control": "private, no-store", "Retry-After": "5" },
      });
    }
  }
  response.headers.set("Cache-Control", "private, no-store");

  return response;
}

export const config = {
  // Exclude framework internals, static assets and APIs (which return their own
  // 401/403 responses rather than a browser login redirect).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/).*)"],
};
