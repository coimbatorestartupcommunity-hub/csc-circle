import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Plain anon Supabase client (publishable key, no cookies). Used for cached
 * public reads and for anonymous public form submissions in API routes. RLS
 * restricts it to published/approved content and insert-only queue access.
 */
export function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient<Database>(
    url,
    key,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
