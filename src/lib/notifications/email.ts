import "server-only";
import nodemailer from "nodemailer";
import { emailConfiguration, validEmail } from "@/lib/notifications/config";
export function createEmailTransport() {
  try {
    const c = emailConfiguration();
    return nodemailer.createTransport({ host: c.host, port: c.port, secure: c.secure, ...(c.localCapture ? {} : { requireTLS: true, auth: { user: c.user, pass: c.password }, tls: { minVersion: "TLSv1.2" as const, rejectUnauthorized: true } }), connectionTimeout: 8_000, greetingTimeout: 8_000, socketTimeout: 12_000, disableFileAccess: true, disableUrlAccess: true });
  } catch { return null; }
}
export async function verifyEmailTransport() {
  const transport = createEmailTransport();
  if (!transport) throw new Error("EMAIL_CONFIGURATION_INVALID");
  return transport.verify();
}
export async function sendCommunityEmail(input: { to: string; subject: string; text: string; html?: string; notificationId: string; attachments?: { filename: string; content: Buffer; contentType: string; cid: string }[] }) {
  const c = emailConfiguration(); const transport = createEmailTransport();
  if (!c.enabled || !transport) throw new Error("EMAIL_DISABLED_OR_UNCONFIGURED");
  if (!validEmail(input.to) || /[\r\n]/.test(input.subject) || input.subject.length>180 || !/^[a-zA-Z0-9-]{1,100}$/.test(input.notificationId)) throw new Error("EMAIL_INPUT_INVALID");
  const senderDomain = c.from.slice(c.from.lastIndexOf("@") + 1).toLowerCase();
  return transport.sendMail({ from: { name: c.fromName, address: c.from }, replyTo: c.support, to: input.to, subject: input.subject, text: input.text, html: input.html, attachments: input.attachments, messageId: `<csc-${input.notificationId}@${senderDomain}>` });
}
