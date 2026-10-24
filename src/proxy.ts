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
  const pathname = request.nextUrl.pathname;
  const isAuthPublic = [
    "/about", "/collaborations", "/directory", "/events", "/members",
    "/login", "/signup", "/forgot-password", "/reset-password",
    "/privacy", "/terms", "/security", "/help", "/contact", "/community-guidelines", "/membership",
    "/auth/callback", "/auth/confirm", "/auth/signout",
    // Invitees do not have an admin role yet. This page must load so its
    // client can exchange the email URL fragment for a short-lived HttpOnly
    // cookie before the invitee signs in and accepts the invitation.
    "/admin/accept-invitation",
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`)) || pathname === "/";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    if (isAuthPublic || pathname.startsWith("/api/")) return response;
    return new NextResponse("Authentication is not configured. Please contact CSC support.", {
      status: 503,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  // A request with no Supabase session cookie cannot have a session to verify
  // or refresh. Avoid initializing Auth for unauthenticated requests; getClaims
  // reads the current time internally and is meaningful only for a real cookie
  // session. Layouts and data services still verify authenticated requests.
  const hasSessionCookie = request.cookies.getAll().some(({ name }) =>
    /^sb-.+-auth-token(?:\.\d+)?$/.test(name),
  );
  if (!hasSessionCookie) {
    response.headers.set("Cache-Control", "private, no-store");
    if (!isAuthPublic && !pathname.startsWith("/api/")) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      const redirect = NextResponse.redirect(login);
      redirect.headers.set("Cache-Control", "private, no-store");
      return redirect;
    }
    return response;
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

  // getClaims verifies the identity and refreshes near-expiry sessions while
  // writing rotated cookies through setAll. Avoid a separate getSession call:
  // it loads the same cookie session a second time and its user object is not
  // an authorization source. Sensitive account/role changes are checked with
  // getUser in layouts and service functions.
  try {
    const verified = await supabase.auth.getClaims();
    const verificationError = verified.error;
    const authenticated = Boolean(verified.data?.claims?.sub);
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
      const redirect = NextResponse.redirect(login);
      redirect.headers.set("Cache-Control", "private, no-store");
      return redirect;
    }
    if (authenticated && pathname === "/login") {
      const target = "/auth/complete";
      const destination = new URL(target, request.url);
      if (pathname === "/login") destination.searchParams.set("next", safeNext(request.nextUrl.searchParams.get("next")));
      const redirect = NextResponse.redirect(destination);
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      redirect.headers.set("Cache-Control", "private, no-store");
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
