import "server-only";
import { z } from "zod";
const email = z.string().email().max(254).refine(v => !/[\r\n]/.test(v));
export function validEmail(value: string) { return email.safeParse(value).success; }
export function emailConfiguration() {
  const user = process.env.SMTP_USER ?? "";
  const password = process.env.SMTP_APP_PASSWORD ?? process.env.SMTP_PASSWORD ?? "";
  const port = Number(process.env.SMTP_PORT ?? "465");
  const secure = process.env.SMTP_SECURE !== "false";
  const from = process.env.SMTP_FROM_EMAIL ?? user;
  const fromName = process.env.SMTP_FROM_NAME ?? "CSC Circle";
  const support = process.env.CSC_SUPPORT_EMAIL ?? "";
  const base = new URL(process.env.APP_BASE_URL ?? "https://csc-circle-lake.vercel.app");
  const admins = [...new Set((process.env.CSC_ADMIN_NOTIFICATION_EMAILS ?? "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean))];
  if (process.env.SMTP_HOST !== "smtp.gmail.com" || !validEmail(user) || !validEmail(from) || !validEmail(support) || !password || ![465,587].includes(port) || (port === 465 && !secure) || (port === 587 && secure) || /[\r\n]/.test(fromName) || fromName.length>80 || !admins.length || admins.length>3 || admins.some(a => !validEmail(a)) || base.protocol !== "https:" || base.username || base.password || base.search || base.hash || base.pathname!=="/") throw new Error("EMAIL_CONFIGURATION_INVALID");
  return { host: "smtp.gmail.com", user, password, port, secure, from, fromName, support, base: base.origin, admins, enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === "true" };
}
