import { describe, it, expect } from "vitest";
import {
  ALL_PERMISSIONS,
  rolePermissions,
  roleHasPermission,
  permissionsFor,
} from "@/lib/admin/permissions";

describe("admin RBAC", () => {
  it("super_admin holds every permission", () => {
    expect(rolePermissions.super_admin.length).toBe(ALL_PERMISSIONS.length);
    for (const p of ALL_PERMISSIONS) {
      expect(roleHasPermission("super_admin", p)).toBe(true);
    }
  });

  it("check-in staff can only scan attendance (least privilege)", () => {
    expect(rolePermissions.checkin_staff).toEqual(["attendance.scan"]);
    expect(roleHasPermission("checkin_staff", "attendance.scan")).toBe(true);
    expect(roleHasPermission("checkin_staff", "members.read")).toBe(false);
    expect(roleHasPermission("checkin_staff", "payments.verify")).toBe(false);
  });

  it("finance reviewer cannot approve members or moderate reviews", () => {
    expect(roleHasPermission("finance_reviewer", "payments.verify")).toBe(true);
    expect(roleHasPermission("finance_reviewer", "members.approve")).toBe(false);
    expect(roleHasPermission("finance_reviewer", "reviews.moderate")).toBe(false);
  });

  it("only super_admin can manage roles", () => {
    const canManageRoles = (Object.keys(rolePermissions) as (keyof typeof rolePermissions)[])
      .filter((r) => roleHasPermission(r, "roles.manage"));
    expect(canManageRoles).toEqual(["super_admin"]);
  });

  it("permissionsFor unions multiple roles without duplicates", () => {
    const set = permissionsFor(["event_manager", "finance_reviewer"]);
    expect(set.has("events.publish")).toBe(true);
    expect(set.has("payments.verify")).toBe(true);
    expect(set.has("members.approve")).toBe(false);
    // registrations.read is in both roles — still appears once.
    expect([...set].filter((p) => p === "registrations.read").length).toBe(1);
  });
});
