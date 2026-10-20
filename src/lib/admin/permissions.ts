/**
 * Admin RBAC model (Phase 4).
 *
 * The frontend uses this matrix to SHOW/HIDE actions. It is NOT a security
 * boundary — the backend (Phase 1) must independently enforce every permission
 * server-side via RLS + privileged operations. A matching email or a client
 * value is never sufficient authority.
 */

export type AdminRole =
  | "super_admin"
  | "community_admin"
  | "event_manager"
  | "checkin_staff"
  | "finance_reviewer"
  | "content_manager"
  | "tech_admin";

export type Permission =
  | "members.read"
  | "members.approve"
  | "members.suspend"
  | "directory.manage"
  | "events.create"
  | "events.update"
  | "events.publish"
  | "registrations.read"
  | "registrations.approve"
  | "attendance.scan"
  | "consultations.manage"
  | "payments.verify"
  | "reviews.moderate"
  | "content.manage"
  | "media.manage"
  | "roles.manage"
  | "audit.read"
  | "settings.manage";

export const ALL_PERMISSIONS: Permission[] = [
  "members.read",
  "members.approve",
  "members.suspend",
  "directory.manage",
  "events.create",
  "events.update",
  "events.publish",
  "registrations.read",
  "registrations.approve",
  "attendance.scan",
  "consultations.manage",
  "payments.verify",
  "reviews.moderate",
  "content.manage",
  "media.manage",
  "roles.manage",
  "audit.read",
  "settings.manage",
];

export const rolePermissions: Record<AdminRole, Permission[]> = {
  super_admin: ALL_PERMISSIONS,
  community_admin: [
    "members.read",
    "members.approve",
    "members.suspend",
    "directory.manage",
    "consultations.manage",
    "reviews.moderate",
    "registrations.read",
  ],
  event_manager: [
    "events.create",
    "events.update",
    "events.publish",
    "registrations.read",
    "registrations.approve",
    "attendance.scan",
  ],
  checkin_staff: ["attendance.scan"],
  finance_reviewer: ["payments.verify", "registrations.read"],
  content_manager: ["content.manage", "media.manage", "reviews.moderate"],
  tech_admin: ["audit.read", "settings.manage"],
};

export const roleLabels: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  community_admin: "Community Admin",
  event_manager: "Event Manager",
  checkin_staff: "Check-In Staff",
  finance_reviewer: "Finance Reviewer",
  content_manager: "Content Manager",
  tech_admin: "Technical Administrator",
};

export const permissionLabels: Record<Permission, string> = {
  "members.read": "View members",
  "members.approve": "Approve memberships",
  "members.suspend": "Suspend members",
  "directory.manage": "Manage startup directory",
  "events.create": "Create events",
  "events.update": "Edit events",
  "events.publish": "Publish events",
  "registrations.read": "View registrations",
  "registrations.approve": "Approve registrations",
  "attendance.scan": "Scan & check in attendees",
  "consultations.manage": "Manage consultations",
  "payments.verify": "Verify payments",
  "reviews.moderate": "Moderate reviews",
  "content.manage": "Manage website content",
  "media.manage": "Manage media library",
  "roles.manage": "Manage roles & permissions",
  "audit.read": "Read audit logs",
  "settings.manage": "Manage settings",
};

export function roleHasPermission(
  role: AdminRole,
  permission: Permission,
): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function permissionsFor(roles: AdminRole[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const role of roles) {
    for (const p of rolePermissions[role] ?? []) set.add(p);
  }
  return set;
}
