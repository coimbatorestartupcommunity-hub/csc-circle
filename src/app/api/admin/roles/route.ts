import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { getAdminContext, can } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { roleLabels, rolePermissions, permissionLabels, type AdminRole } from "@/lib/admin/permissions";

export const instant = false;
const dbClient = () => createAdminClient() as unknown as SupabaseClient;
const roleSchema = z.enum(["super_admin", "community_admin", "event_manager", "checkin_staff", "finance_reviewer", "content_manager", "tech_admin"]);

export async function GET() {
  const context = await getAdminContext();
  if (context.mode !== "live" || !can(context, "roles.manage")) return authResponse({ error: "Administrator role management access required." }, 403);
  const { data: assignments, error } = await dbClient().from("admin_roles").select("id,user_id,role,created_at").order("created_at", { ascending: true }).limit(500);
  if (error) return authResponse({ error: "Administrator assignments could not be loaded." }, 503);
  const { data: history } = await dbClient().from("audit_logs").select("id,action,actor_id,actor_role,target_type,target_id,before,after,created_at,correlation_id")
    .in("action", ["admin.invitation.created", "admin.invitation.accepted", "admin.invitation.delivery_failed", "admin.invitation.expired", "admin.invitation.revoked", "admin.role.assigned", "admin.role.revoked"])
    .order("created_at", { ascending: false }).limit(100);
  const admin = createAdminClient();
  const ids = [...new Set((assignments ?? []).map((row) => row.user_id as string))];
  const users = await Promise.all(ids.map(async (id) => [id, await admin.auth.admin.getUserById(id)] as const));
  const userMap = new Map(users.map(([id, result]) => [id, result.data.user]));
  return authResponse({ roles: Object.entries(roleLabels).map(([id, label]) => ({ id, label, permissions: rolePermissions[id as AdminRole].map((permission) => ({ id: permission, label: permissionLabels[permission] })) })), assignments: (assignments ?? []).map((row) => {
    const user = userMap.get(row.user_id as string);
    return { id: row.id, userId: row.user_id, role: row.role, roleLabel: roleLabels[row.role as AdminRole], createdAt: row.created_at, email: user?.email ?? "Verified CSC account", name: typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : typeof user?.user_metadata?.name === "string" ? user.user_metadata.name : user?.email ?? "Administrator" };
  }), history: (history ?? []).map((event) => ({ id: event.id, action: event.action, actorId: event.actor_id, actorRole: event.actor_role, targetType: event.target_type, targetId: event.target_id, before: event.before, after: event.after, createdAt: event.created_at, correlationId: event.correlation_id })) });
}

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (context.mode !== "live" || !context.userId || !can(context, "roles.manage")) return authResponse({ error: "Administrator role management access required." }, 403);
  const body = await readAuthBody(request);
  const parsed = z.object({ userId: z.string().uuid(), role: roleSchema }).safeParse(body);
  if (!parsed.success) return authResponse({ error: "Choose a valid administrator account and role." }, 422);
  const supabase = await createClient() as unknown as SupabaseClient;
  const { error } = await supabase.rpc("csc_revoke_admin_role", { p_user_id: parsed.data.userId, p_role: parsed.data.role });
  if (error) return authResponse({ error: error.code === "23514" ? "The last active Super Admin cannot be removed." : error.code === "P0002" ? "That role assignment no longer exists." : "Role access could not be revoked." }, error.code === "23514" ? 409 : 503);
  return authResponse({ ok: true });
}
