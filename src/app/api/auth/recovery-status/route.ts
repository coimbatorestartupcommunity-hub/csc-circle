import { createClient } from "@/lib/supabase/server";
import { hasRecovery } from "@/lib/auth/recovery";
import { authResponse } from "@/lib/auth/http";
export async function GET() {
  try {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    return authResponse({ ok: !!user && await hasRecovery(user.id) });
  } catch { return authResponse({ ok: false }); }
}
