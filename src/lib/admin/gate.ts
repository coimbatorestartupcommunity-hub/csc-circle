import "server-only";

import { getAuthUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import {
  type AdminRole,
  type Permission,
  permissionsFor,
} from "@/lib/admin/permissions";

/**
 * Server-enforced admin boundary (fail closed).
 *
 * - "live"      — a signed-in user who is a PROVISIONED admin (row in
 *                 admin_roles). Their real roles/permissions apply.
 * - "preview"   — dev only; a DEMO super-admin so the UI can be built/reviewed.
 * - "forbidden" — signed in but not an admin.
 * - "closed"    — production, no session.
 *
 * Production NEVER grants admin access without a real provisioned role. The
 * preview is development-only. Production environment flags cannot enable it.
 * No NEXT_PUBLIC flag and no email comparison is used as authority.
 */
export type AdminMode = "live" | "preview" | "forbidden" | "closed";

export interface AdminContext {
  mode: AdminMode;
  roles: AdminRole[];
  permissions: Set<Permission>;
  userId: string | null;
  displayName: string;
}

function isAdminPreviewEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return false;
}

export async function getAdminContext(): Promise<AdminContext> {
  const user = await getAuthUser();

  if (user) {
    try {
      const supabase = await createClient();
      const { data: membership, error: membershipError } = await supabase.from("memberships").select("status").eq("user_id", user.id).maybeSingle();
      if (membershipError || (membership && ["suspended", "revoked", "rejected"].includes(membership.status))) {
        return { mode: "forbidden", roles: [], permissions: new Set(), userId: user.id, displayName: "" };
      }
      const { data } = await supabase
        .from("admin_roles")
        .select("role")
        .eq("user_id", user.id);
      const roles = (data ?? [])
        .map((r) => (r as { role: string }).role as AdminRole)
        .filter(Boolean);
      if (roles.length > 0) {
        return {
          mode: "live",
          roles,
          permissions: permissionsFor(roles),
          userId: user.id,
          displayName:
            (user.user_metadata?.name as string) ?? user.email ?? "Admin",
        };
      }
    } catch {
      // admin_roles missing or query failed → treat as not an admin.
    }
    return {
      mode: "forbidden",
      roles: [],
      permissions: new Set(),
      userId: user.id,
      displayName: user.email ?? "",
    };
  }

  if (isAdminPreviewEnabled()) {
    const roles: AdminRole[] = ["super_admin"];
    return {
      mode: "preview",
      roles,
      permissions: permissionsFor(roles),
      userId: null,
      displayName: "Demo Super Admin",
    };
  }

  return {
    mode: "closed",
    roles: [],
    permissions: new Set(),
    userId: null,
    displayName: "",
  };
}

export function can(ctx: AdminContext, permission: Permission): boolean {
  return ctx.permissions.has(permission);
}
