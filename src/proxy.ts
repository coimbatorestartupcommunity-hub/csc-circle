import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Proxy (Next 16's renamed middleware). Refreshes the Supabase auth session
 * cookie for member/auth routes so Server Components see a current session.
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
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/member/:path*", "/admin/:path*", "/auth/:path*"],
};
