import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

  it("keeps every TypeScript role permission exactly aligned with PostgreSQL authorization", () => {
    const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/20261019153828_security_hardening.sql"), "utf8");
    const functionBody = sql.match(/create or replace function private\.has_permission\(permission text\)[\s\S]*?\$\$;/i)?.[0];
    expect(functionBody).toBeTruthy();
    for (const [role, permissions] of Object.entries(rolePermissions)) {
      if (role === "super_admin") {
        expect(functionBody).toContain("a.role='super_admin'");
      } else if (role === "checkin_staff") {
        expect(functionBody).toContain("when 'checkin_staff' then permission='attendance.scan'");
      } else {
        const clause = functionBody?.match(new RegExp(`when '${role}' then permission=any\\(array\\[([^\\]]*)\\]\\)`));
        expect(clause, `missing SQL permission clause for ${role}`).toBeTruthy();
        const sqlPermissions = (clause?.[1].match(/'[^']+'/g) ?? []).map((value) => value.slice(1, -1));
        expect(sqlPermissions.sort(), `SQL permissions for ${role}`).toEqual([...permissions].sort());
      }
    }
  });
});
