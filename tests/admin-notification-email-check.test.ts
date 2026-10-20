// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminContext: vi.fn(),
  emailConfiguration: vi.fn(),
  verifyEmailTransport: vi.fn(),
  scheduleNotificationDelivery: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/admin/gate", () => ({ getAdminContext: mocks.getAdminContext }));
vi.mock("@/lib/notifications/config", () => ({ emailConfiguration: mocks.emailConfiguration }));
vi.mock("@/lib/notifications/email", () => ({ verifyEmailTransport: mocks.verifyEmailTransport }));
vi.mock("@/lib/notifications/schedule", () => ({ scheduleNotificationDelivery: mocks.scheduleNotificationDelivery }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.rateLimit }));

import { POST } from "@/app/api/admin/notifications/verify/route";

describe("admin notification email check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminContext.mockResolvedValue({ mode: "live", userId: "admin-1", permissions: new Set(["settings.manage", "roles.manage"]) });
    mocks.emailConfiguration.mockReturnValue({ enabled: true });
    mocks.verifyEmailTransport.mockResolvedValue(undefined);
    mocks.rateLimit.mockReturnValue({ allowed: true });
  });

  it("verifies SMTP and schedules queued deliveries", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(mocks.verifyEmailTransport).toHaveBeenCalledOnce();
    expect(mocks.scheduleNotificationDelivery).toHaveBeenCalledOnce();
  });

  it("does not process the queue when email notifications are disabled", async () => {
    mocks.emailConfiguration.mockReturnValue({ enabled: false });

    const response = await POST();

    expect(response.status).toBe(409);
    expect(mocks.verifyEmailTransport).not.toHaveBeenCalled();
    expect(mocks.scheduleNotificationDelivery).not.toHaveBeenCalled();
  });

  it("denies non-admin users", async () => {
    mocks.getAdminContext.mockResolvedValue({ mode: "forbidden", userId: "member-1", permissions: new Set() });

    const response = await POST();

    expect(response.status).toBe(403);
    expect(mocks.emailConfiguration).not.toHaveBeenCalled();
    expect(mocks.scheduleNotificationDelivery).not.toHaveBeenCalled();
  });

  it("does not let settings access alone trigger transactional email processing", async () => {
    mocks.getAdminContext.mockResolvedValue({ mode: "live", userId: "tech-admin", permissions: new Set(["settings.manage"]) });

    const response = await POST();

    expect(response.status).toBe(403);
    expect(mocks.emailConfiguration).not.toHaveBeenCalled();
    expect(mocks.scheduleNotificationDelivery).not.toHaveBeenCalled();
  });

  it("does not expose provider errors or drain when SMTP verification fails", async () => {
    mocks.verifyEmailTransport.mockRejectedValue(new Error("sensitive provider detail"));

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("Email verification failed. Check the server-side email configuration.");
    expect(JSON.stringify(body)).not.toContain("sensitive provider detail");
    expect(mocks.scheduleNotificationDelivery).not.toHaveBeenCalled();
  });
});
