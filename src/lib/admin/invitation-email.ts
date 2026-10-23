import "server-only";

import { emailConfiguration } from "@/lib/notifications/config";
import { escapeHtml } from "@/lib/notifications/templates";
import { ALL_PERMISSIONS, permissionLabels, roleLabels, rolePermissions, type AdminRole } from "@/lib/admin/permissions";

export function buildAdminInvitationEmail(input: {
  id: string;
  token: string;
  role: AdminRole;
  expiresAt: Date;
  fullName?: string;
  message?: string;
}) {
  const config = emailConfiguration();
  const roleName = roleLabels[input.role];
  const greeting = input.fullName?.trim() ? `Hello ${input.fullName.trim()},` : "Hello,";
  const invitationUrl = `${config.base}/admin/accept-invitation#token=${encodeURIComponent(input.token)}`;
  const expiration = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
  }).format(input.expiresAt) + " IST";
  const permissions = input.role === "super_admin"
    ? ALL_PERMISSIONS.map((permission) => permissionLabels[permission])
    : rolePermissions[input.role].map((permission) => permissionLabels[permission]);
  const note = input.message?.trim() ? `\n\nMessage from CSC: ${input.message.trim()}` : "";
  const text = `${roleName} Administrator Invitation\n\n${greeting}\n\nYou have been invited to join the Coimbatore Startup Community administration team as ${roleName}.${note}\n\nAssigned permissions:\n${permissions.map((permission) => `• ${permission}`).join("\n")}\n\nThis invitation expires ${expiration}.\n\nAccept your invitation: ${invitationUrl}\n\nOnly accept if you recognize and trust the CSC inviter. The invitation is single-use and bound to this verified email account.\n\nCSC Circle · Coimbatore Startup Community\n${config.support}`;
  const permissionRows = permissions.map((permission) => `<li style="margin:0 0 8px;color:#374151;font-size:14px;line-height:21px">${escapeHtml(permission)}</li>`).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f5f7fb;color:#171923;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px;background:#f5f7fb"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden"><tr><td align="center" style="padding:28px 24px;background:#f0edff"><img src="${config.base}/brand/csc-icon.png" width="64" height="64" alt="CSC Circle" style="display:block;border-radius:50%;margin-bottom:14px"><p style="margin:0;color:#171923;font-size:13px;font-weight:700;letter-spacing:1px">COIMBATORE STARTUP COMMUNITY</p><p style="margin:7px 0 0;color:#5b6475;font-size:12px">CSC Circle</p></td></tr><tr><td style="padding:30px 32px 36px"><h1 style="margin:0 0 18px;font-size:26px;line-height:32px;color:#171923">Administrator Invitation</h1><p style="margin:0 0 14px;font-size:15px;line-height:24px;color:#374151">${escapeHtml(greeting)}</p><p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#374151">You have been invited to join the Coimbatore Startup Community administration team as <strong>${escapeHtml(roleName)}</strong>.</p>${input.message?.trim() ? `<p style="margin:0 0 18px;padding:14px 16px;border-radius:12px;background:#f8f7fc;color:#374151;font-size:14px;line-height:22px">${escapeHtml(input.message.trim())}</p>` : ""}<div style="padding:16px 18px;border-radius:14px;background:#f7f8fc"><p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#171923">Your assigned permissions</p><ul style="margin:0;padding-left:20px">${permissionRows}</ul></div>${input.role === "super_admin" ? `<p style="margin:16px 0 0;padding:12px 14px;border:1px solid #f2cc76;border-radius:12px;background:#fff8e7;color:#755315;font-size:13px;line-height:20px"><strong>High privilege:</strong> Super Admin includes all ${ALL_PERMISSIONS.length} administrator permissions.</p>` : ""}<p style="margin:18px 0;color:#5b6475;font-size:13px;line-height:21px">Invitation expires <strong>${escapeHtml(expiration)}</strong>.</p><p style="margin:26px 0;text-align:center"><a href="${escapeHtml(invitationUrl)}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#171923;color:#fff;font-size:15px;font-weight:700;text-decoration:none">Accept Invitation</a></p><p style="margin:0;color:#687386;font-size:12px;line-height:19px">Security notice: Accept only if you recognize and trust the inviter. This single-use invitation is bound to the intended verified account.</p></td></tr><tr><td align="center" style="padding:20px 24px;background:#f7f8fc;color:#697386;font-size:12px;line-height:19px">CSC Circle · Coimbatore Startup Community<br>Coimbatore, Tamil Nadu · Connect. Build. Grow.<br><a href="mailto:${escapeHtml(config.support)}" style="color:#5b43c7">${escapeHtml(config.support)}</a></td></tr></table></td></tr></table></body></html>`;
  return { subject: "CSC Circle — You're Invited to Join the Administration Team", text, html, invitationUrl };
}
