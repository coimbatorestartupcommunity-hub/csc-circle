// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ createTransport: vi.fn(), sendMail: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: mocks.createTransport } }));
import { createEmailTransport, sendCommunityEmail } from "@/lib/notifications/email";
import { classifyEmailFailure } from "@/lib/notifications/failures";
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
  expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({ messageId: "<csc-test-id@example.test>" }));
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
it("permits transactional email only to the explicit local Supabase capture sink", async () => {
  for (const [key, value] of Object.entries({
    CSC_LOCAL_EMAIL_CAPTURE: "true",
    VERCEL: "",
    VERCEL_ENV: "",
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: "54325",
    SMTP_SECURE: "false",
    SMTP_USER: "",
    SMTP_APP_PASSWORD: "",
    SMTP_PASSWORD: "",
    SMTP_FROM_EMAIL: "csc@example.test",
    CSC_SUPPORT_EMAIL: "support@example.test",
    CSC_ADMIN_NOTIFICATION_EMAILS: "admin@example.test",
    APP_BASE_URL: "http://localhost:3107",
    EMAIL_NOTIFICATIONS_ENABLED: "true",
  })) vi.stubEnv(key, value);
  mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
  mocks.sendMail.mockResolvedValue({ accepted: ["member@example.test"] });
  await sendCommunityEmail({ to: "member@example.test", subject: "Local capture", text: "Synthetic message", notificationId: "local-test" });
  expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: "127.0.0.1", port: 54325, secure: false }));
  expect(mocks.createTransport.mock.calls[0][0]).not.toHaveProperty("auth");
});
it("does not allow local capture settings in a Vercel deployment or against other SMTP hosts", () => {
  for (const [key, value] of Object.entries({
    CSC_LOCAL_EMAIL_CAPTURE: "true", VERCEL: "1", VERCEL_ENV: "production",
    SMTP_HOST: "127.0.0.1", SMTP_PORT: "54325", SMTP_SECURE: "false",
    SMTP_FROM_EMAIL: "csc@example.test", CSC_SUPPORT_EMAIL: "support@example.test",
    CSC_ADMIN_NOTIFICATION_EMAILS: "admin@example.test", APP_BASE_URL: "http://localhost:3107",
  })) vi.stubEnv(key, value);
  expect(createEmailTransport()).toBeNull();
  vi.stubEnv("VERCEL", ""); vi.stubEnv("VERCEL_ENV", ""); vi.stubEnv("SMTP_HOST", "192.168.1.2");
  expect(createEmailTransport()).toBeNull();
});
it("rejects recipient and subject header injection before SMTP",async()=>{
 for(const [key,value] of Object.entries({SMTP_HOST:"smtp.gmail.com",SMTP_USER:"sender@example.test",SMTP_APP_PASSWORD:"synthetic-only",CSC_SUPPORT_EMAIL:"support@example.test",CSC_ADMIN_NOTIFICATION_EMAILS:"admin@example.test",EMAIL_NOTIFICATIONS_ENABLED:"true"})) vi.stubEnv(key,value);
 mocks.createTransport.mockReturnValue({sendMail:mocks.sendMail});
 await expect(sendCommunityEmail({to:"victim@example.test\r\nBcc: other@example.test",subject:"Test",text:"Test",notificationId:"test"})).rejects.toThrow("EMAIL_INPUT_INVALID");
 await expect(sendCommunityEmail({to:"victim@example.test",subject:"Test\r\nBcc: other@example.test",text:"Test",notificationId:"test"})).rejects.toThrow("EMAIL_INPUT_INVALID");
 expect(mocks.sendMail).not.toHaveBeenCalled();
});
it("classifies missing email configuration as an explicit permanent failure", () => {
  expect(classifyEmailFailure(new Error("EMAIL_CONFIGURATION_INVALID"))).toEqual({ outcome: "failed_permanent", code: "EMAIL_CONFIGURATION_INVALID" });
  expect(classifyEmailFailure(new Error("EMAIL_DISABLED_OR_UNCONFIGURED"))).toEqual({ outcome: "failed_permanent", code: "EMAIL_CONFIGURATION_INVALID" });
});
