import "server-only";

import { emailConfiguration } from "@/lib/notifications/config";
import { renderAdminInvitationEmail } from "@/lib/notifications/templates";
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
  const invitationUrl = `${config.base}/admin/accept-invitation?token=${encodeURIComponent(input.token)}`;
  const expiration = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
  }).format(input.expiresAt) + " IST";
  const permissions = input.role === "super_admin"
    ? ALL_PERMISSIONS.map((permission) => permissionLabels[permission])
    : rolePermissions[input.role].map((permission) => permissionLabels[permission]);
  const note = input.message?.trim() ? `\n\nMessage from CSC: ${input.message.trim()}` : "";
  const text = `Administrator Invitation\n\n${greeting}\n\nYou have been invited to join the Coimbatore Startup Community administration team as ${roleName}.${note}\n\nYour assigned permissions:\n${permissions.map((permission) => `• ${permission}`).join("\n")}\n\nThis invitation expires ${expiration}.\n\nAccept your invitation: ${invitationUrl}\n\nSecurity notice: accept only if you recognize and trust the CSC inviter. This single-use invitation is bound to the intended verified email account.\n\nQuestions? ${config.support}\nInstagram: https://www.instagram.com/coimbatorestartupcommunity/\nWhatsApp group: https://chat.whatsapp.com/EMaSXe8j6cA9s94hGOCEqf?s=cl&p=a&mlu=4&ilr=4\nWebsite: ${config.base}\n\nCSC Circle — Coimbatore Startup Community\nCoimbatore, Tamil Nadu · Estd 2026\nConnect. Build. Grow.`;
  const { html } = renderAdminInvitationEmail({
    greeting,
    roleName,
    message: input.message,
    permissions,
    expiration,
    invitationUrl,
    superAdminAllCount: input.role === "super_admin" ? ALL_PERMISSIONS.length : undefined,
  });
  return { subject: "CSC Circle — You're Invited to Join the Administration Team", text, html, invitationUrl };
}
