import "server-only";
import nodemailer from "nodemailer";

/** Server-only SMTP transport. Credentials come exclusively from managed secrets. */
export function createEmailTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const port = Number(process.env.SMTP_PORT ?? 465);
  if (!host || !user || !pass || ![465, 587].includes(port)) return null;
  return nodemailer.createTransport({
    host, port, secure: port === 465, requireTLS: true,
    auth: { user, pass },
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    disableFileAccess: true, disableUrlAccess: true,
  });
}

/** Must only be called by the trusted outbox dispatcher, never a public mail relay. */
export async function sendCommunityEmail(input: { to: string; subject: string; text: string; notificationId: string }) {
  const transport = createEmailTransport();
  const from = process.env.SMTP_FROM;
  if (!transport || !from) throw new Error("Email delivery is not configured.");
  return transport.sendMail({ from, to: input.to, subject: input.subject, text: input.text, messageId: `<csc-${input.notificationId}@gmail.com>` });
}
