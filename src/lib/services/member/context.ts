import "server-only";

import { cache } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isMemberPreviewEnabled } from "@/lib/services/member/gate";

export interface MemberIdentity {
  id: string;
  email: string | null;
  emailVerified: boolean;
  user_metadata: User["user_metadata"];
  app_metadata: User["app_metadata"];
}

/**
 * Resolves how the member area should behave for this request:
 * - "live"    — a real authenticated user; serve their own Supabase data.
 * - "preview" — no auth, but the dev preview is enabled; serve DEMO fixtures.
 * - "closed"  — production, no auth; show the unavailable page, no member data.
 */
export type MemberMode = "live" | "preview" | "closed";

export interface MemberContext {
  mode: MemberMode;
  user: MemberIdentity | null;
}

export async function resolveVerifiedMemberContext(client?: SupabaseClient): Promise<MemberContext> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return isMemberPreviewEnabled() ? { mode: "preview", user: null } : { mode: "closed", user: null };
  }
  const supabase = client ?? await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  if (error || !claims || !userId) {
    return isMemberPreviewEnabled() ? { mode: "preview", user: null } : { mode: "closed", user: null };
  }
  // getClaims verifies the JWT signature and expiry. This database check also
  // verifies the current Auth session (including logout revocation), confirmed
  // email and membership restrictions before any member data is served.
  const { data: allowed, error: accessError } = await supabase.rpc("csc_validate_member_session");
  if (accessError || allowed !== true) return { mode: "closed", user: null };
  const user: MemberIdentity = {
    id: userId,
    email: typeof claims.email === "string" ? claims.email : null,
    emailVerified: true,
    user_metadata: (claims.user_metadata && typeof claims.user_metadata === "object" ? claims.user_metadata : {}) as User["user_metadata"],
    app_metadata: (claims.app_metadata && typeof claims.app_metadata === "object" ? claims.app_metadata : {}) as User["app_metadata"],
  };
  return { mode: "live", user };
}

async function resolveMemberContext(): Promise<MemberContext> {
  return resolveVerifiedMemberContext();
}

/** Request-scoped context reused by layouts and nested server components. */
export const getMemberContext = cache(resolveMemberContext);
