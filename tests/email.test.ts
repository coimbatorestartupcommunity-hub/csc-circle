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
  vi.stubEnv("SMTP_HOST", "smtp.gmail.com"); vi.stubEnv("SMTP_USER", "sender@example.test"); vi.stubEnv("SMTP_PASSWORD", "synthetic-test-value"); vi.stubEnv("SMTP_FROM", "sender@example.test");
  vi.stubEnv("CSC_SUPPORT_EMAIL", "support@example.test"); vi.stubEnv("CSC_ADMIN_NOTIFICATION_EMAILS", "admin@example.test"); vi.stubEnv("EMAIL_NOTIFICATIONS_ENABLED", "true");
  mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail }); mocks.sendMail.mockResolvedValue({ accepted: ["test@example.test"] });
  await sendCommunityEmail({ to: "test@example.test", subject: "Test", text: "Synthetic test", notificationId: "test-id" });
  expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({ secure: true, requireTLS: true, disableFileAccess: true, disableUrlAccess: true, tls: { minVersion: "TLSv1.2", rejectUnauthorized: true } }));
});
it("passes an explicitly generated event-pass QR as an inline PNG attachment", async () => {
  vi.stubEnv("SMTP_HOST", "smtp.gmail.com"); vi.stubEnv("SMTP_USER", "sender@example.test"); vi.stubEnv("SMTP_PASSWORD", "synthetic-test-value"); vi.stubEnv("SMTP_FROM", "sender@example.test");
  vi.stubEnv("CSC_SUPPORT_EMAIL", "support@example.test"); vi.stubEnv("CSC_ADMIN_NOTIFICATION_EMAILS", "admin@example.test"); vi.stubEnv("EMAIL_NOTIFICATIONS_ENABLED", "true");
  mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail }); mocks.sendMail.mockResolvedValue({ accepted: ["test@example.test"] });
  const attachment = { filename: "CSC-EventPass-TEST.png", content: Buffer.from("synthetic-png"), contentType: "image/png", cid: "csc-event-pass-test@csc" };
  await sendCommunityEmail({ to: "test@example.test", subject: "Confirmed", text: "Pass attached", notificationId: "test-id", attachments: [attachment] });
  expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({ attachments: [attachment] }));
});
it("rejects header injection and untrusted SMTP hosts", async () => {
  vi.stubEnv("SMTP_HOST", "attacker.example");
  expect(createEmailTransport()).toBeNull();
});
it("rejects recipient and subject header injection before SMTP",async()=>{
 for(const [key,value] of Object.entries({SMTP_HOST:"smtp.gmail.com",SMTP_USER:"sender@example.test",SMTP_APP_PASSWORD:"synthetic-only",CSC_SUPPORT_EMAIL:"support@example.test",CSC_ADMIN_NOTIFICATION_EMAILS:"admin@example.test",EMAIL_NOTIFICATIONS_ENABLED:"true"})) vi.stubEnv(key,value);
 mocks.createTransport.mockReturnValue({sendMail:mocks.sendMail});
 await expect(sendCommunityEmail({to:"victim@example.test\r\nBcc: other@example.test",subject:"Test",text:"Test",notificationId:"test"})).rejects.toThrow("EMAIL_INPUT_INVALID");
 await expect(sendCommunityEmail({to:"victim@example.test",subject:"Test\r\nBcc: other@example.test",text:"Test",notificationId:"test"})).rejects.toThrow("EMAIL_INPUT_INVALID");
 expect(mocks.sendMail).not.toHaveBeenCalled();
});
