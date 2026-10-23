import { describe, expect, it } from "vitest";
import { notificationAction } from "@/lib/notifications/actions";

describe("notification action destinations", () => {
  it("allows known member and public content routes with a useful label", () => {
    expect(notificationAction("claim.active", "/member/id-card")).toEqual({ href: "/member/id-card", label: "View Membership Card" });
    expect(notificationAction("EventConfirmed", "/events/csc-founder-meetup")).toEqual({ href: "/events/csc-founder-meetup", label: "View Event Pass" });
    expect(notificationAction("startup.published", "/directory/logic-intelligence")).toEqual({ href: "/directory/logic-intelligence", label: "View Startup" });
    expect(notificationAction("admin.invitation.received", "/admin/accept-invitation?invitationId=11111111-1111-4111-8111-111111111111")).toEqual({
      href: "/admin/accept-invitation?invitationId=11111111-1111-4111-8111-111111111111",
      label: "Review & Accept Invitation",
    });
  });

  it.each([
    "https://attacker.example/",
    "//attacker.example/",
    "javascript:alert(1)",
    "/admin/roles",
    "/admin/accept-invitation?invitationId=not-a-uuid",
    "/member/../admin/roles",
    "/events/Bad_slug",
  ])("rejects unsafe or unapproved action URL %s", (value) => {
    expect(notificationAction("update", value)).toBeNull();
  });
});
