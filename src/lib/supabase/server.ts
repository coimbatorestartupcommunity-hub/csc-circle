import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cache } from "react";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Server Supabase client bound to the request cookies. Reading cookies makes the
 * caller dynamic under Cache Components, so use this only in dynamic (member)
 * server components / route handlers — never in a statically prerendered path.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component without a mutable cookie store —
            // the proxy/middleware refreshes the session instead. Safe to ignore.
          }
        },
      },
    },
  );
}

/** The currently authenticated user (verified against Supabase), or null. */
async function loadAuthUser() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email_confirmed_at ? user : null;
}

/**
 * Reuse the verified identity during one Server Component render. React.cache
 * is request-scoped, so an account or permission change is read on the next
 * request and no user identity is shared between requests.
 */
export const getAuthUser = cache(loadAuthUser);
