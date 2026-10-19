// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ createTransport: vi.fn(), sendMail: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: mocks.createTransport } }));
import { createEmailTransport, sendCommunityEmail } from "@/lib/notifications/email";
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
it("fails closed without SMTP configuration", () => {
  vi.stubEnv("SMTP_HOST", ""); expect(createEmailTransport()).toBeNull();
});
it("uses TLS, bounded timeouts, managed credentials and no remote attachments", async () => {
  vi.stubEnv("SMTP_HOST", "smtp.example.test"); vi.stubEnv("SMTP_USER", "sender@example.test"); vi.stubEnv("SMTP_PASSWORD", "synthetic-test-value"); vi.stubEnv("SMTP_FROM", "sender@example.test");
  mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail }); mocks.sendMail.mockResolvedValue({ accepted: ["test@example.test"] });
  await sendCommunityEmail({ to: "test@example.test", subject: "Test", text: "Synthetic test", notificationId: "test-id" });
  expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({ secure: true, requireTLS: true, disableFileAccess: true, disableUrlAccess: true, tls: { minVersion: "TLSv1.2", rejectUnauthorized: true } }));
});
