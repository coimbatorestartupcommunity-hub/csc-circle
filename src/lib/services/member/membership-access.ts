import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type MembershipAccess =
  | { ok: true; status: string | null }
  | { ok: false; status: null };

/**
 * Resolve the account's membership restriction once per server render. Both
 * member and admin boundaries use this check, and failures remain fail-closed.
 */
export const getMembershipAccess = cache(
  async (userId: string): Promise<MembershipAccess> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("memberships")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return { ok: false, status: null };
    return { ok: true, status: data?.status ?? null };
  },
);

export function isBlockedMembershipStatus(status: string | null): boolean {
  return status !== null && ["suspended", "revoked", "rejected"].includes(status);
}
