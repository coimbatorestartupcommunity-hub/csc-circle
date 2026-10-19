import "server-only";

import type { User } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase/server";
import { isMemberPreviewEnabled } from "@/lib/services/member/gate";

/**
 * Resolves how the member area should behave for this request:
 * - "live"    — a real authenticated user; serve their own Supabase data.
 * - "preview" — no auth, but the dev preview is enabled; serve DEMO fixtures.
 * - "closed"  — production, no auth; show the unavailable page, no member data.
 */
export type MemberMode = "live" | "preview" | "closed";

export interface MemberContext {
  mode: MemberMode;
  user: User | null;
}

export async function getMemberContext(): Promise<MemberContext> {
  const user = await getAuthUser();
  if (user) return { mode: "live", user };
  if (isMemberPreviewEnabled()) return { mode: "preview", user: null };
  return { mode: "closed", user: null };
}
