import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase/server";
import { isMemberPreviewEnabled } from "@/lib/services/member/gate";
import { getMembershipAccess, isBlockedMembershipStatus } from "@/lib/services/member/membership-access";

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

async function resolveMemberContext(): Promise<MemberContext> {
  const user = await getAuthUser();
  if (user) {
    const membership = await getMembershipAccess(user.id);
    if (!membership.ok || isBlockedMembershipStatus(membership.status)) return { mode: "closed", user: null };
    return { mode: "live", user };
  }
  if (isMemberPreviewEnabled()) return { mode: "preview", user: null };
  return { mode: "closed", user: null };
}

/** Request-scoped context reused by layouts and nested server components. */
export const getMemberContext = cache(resolveMemberContext);
