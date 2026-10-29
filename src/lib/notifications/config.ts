import "server-only";
import { z } from "zod";
const email = z.string().email().max(254).refine(v => !/[\r\n]/.test(v));
export function validEmail(value: string) { return email.safeParse(value).success; }
export function emailConfiguration() {
  const localCapture = process.env.CSC_LOCAL_EMAIL_CAPTURE === "true"
    && process.env.VERCEL !== "1"
    && !process.env.VERCEL_ENV
    && ["localhost", "127.0.0.1"].includes(new URL(process.env.APP_BASE_URL ?? "http://localhost:3107").hostname)
    && process.env.SMTP_HOST === "127.0.0.1"
    && Number(process.env.SMTP_PORT) === 54325
    && process.env.SMTP_SECURE === "false"
    && !process.env.SMTP_USER
    && !process.env.SMTP_APP_PASSWORD
    && !process.env.SMTP_PASSWORD;
  const user = process.env.SMTP_USER ?? "";
  const password = process.env.SMTP_APP_PASSWORD ?? process.env.SMTP_PASSWORD ?? "";
  const port = Number(process.env.SMTP_PORT ?? "465");
  const secure = process.env.SMTP_SECURE !== "false";
  const from = process.env.SMTP_FROM_EMAIL ?? user;
  const fromName = process.env.SMTP_FROM_NAME ?? "CSC Circle";
  const support = process.env.CSC_SUPPORT_EMAIL ?? "";
  const base = new URL(process.env.APP_BASE_URL ?? "https://csc.logicintelligencetechnologies.in");
  const admins = [...new Set((process.env.CSC_ADMIN_NOTIFICATION_EMAILS ?? "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean))];
  const validBase = localCapture
    ? base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname) && !base.username && !base.password && !base.search && !base.hash && base.pathname === "/"
    : base.protocol === "https:" && !base.username && !base.password && !base.search && !base.hash && base.pathname === "/";
  const validSender = localCapture || (validEmail(user) && Boolean(password));
  const validSmtp = localCapture
    ? true
    : process.env.SMTP_HOST === "smtp.gmail.com" && [465,587].includes(port) && !((port === 465 && !secure) || (port === 587 && secure));
  if (!validSmtp || !validSender || !validEmail(from) || !validEmail(support) || /[\r\n]/.test(fromName) || fromName.length > 80 || !admins.length || admins.length > 3 || admins.some(a => !validEmail(a)) || !validBase) throw new Error("EMAIL_CONFIGURATION_INVALID");
  return { host: localCapture ? "127.0.0.1" : "smtp.gmail.com", user, password, port, secure, from, fromName, support, base: base.origin, admins, enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === "true", localCapture };
}
