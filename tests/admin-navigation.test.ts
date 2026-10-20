import { describe, expect, it } from "vitest";
import { isAdminRouteActive } from "../src/lib/admin/navigation";

describe("admin sidebar route matching", () => {
  it("does not mark Members active on the Membership Claims route", () => {
    expect(isAdminRouteActive("/admin/membership-claims", "/admin/members")).toBe(false);
    expect(isAdminRouteActive("/admin/membership-claims", "/admin/membership-claims")).toBe(true);
  });

  it("matches nested member detail routes only to their own section", () => {
    expect(isAdminRouteActive("/admin/members/9d7e", "/admin/members")).toBe(true);
    expect(isAdminRouteActive("/admin/members/9d7e", "/admin/membership-claims")).toBe(false);
  });

  it("keeps the admin overview exact", () => {
    expect(isAdminRouteActive("/admin", "/admin")).toBe(true);
    expect(isAdminRouteActive("/admin/members", "/admin")).toBe(false);
  });
});
