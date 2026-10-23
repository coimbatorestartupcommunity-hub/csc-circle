// @vitest-environment node
import { expect, it, vi } from "vitest";

vi.mock("@/lib/notifications/config", () => ({
  emailConfiguration: () => ({ base: "https://csc.example.test", support: "support@example.test" }),
}));

import { buildAdminInvitationEmail } from "@/lib/admin/invitation-email";

it("renders a single-use invitation CTA, role permissions, and escaped text", () => {
  const message = buildAdminInvitationEmail({
    id: "11111111-1111-4111-8111-111111111111",
    token: "A".repeat(43),
    role: "event_manager",
    expiresAt: new Date("2026-10-26T00:00:00Z"),
    fullName: "<Vikash>",
    message: "Please review <script>alert(1)</script>",
  });

  expect(message.subject).toBe("CSC Circle — You're Invited to Join the Administration Team");
  expect(message.invitationUrl).toBe(`https://csc.example.test/admin/accept-invitation#token=${"A".repeat(43)}`);
  expect(message.html).toContain("Accept Invitation");
  expect(message.html).toContain("Scan &amp; check in attendees");
  expect(message.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  expect(message.html).not.toContain("<script>alert(1)</script>");
});
