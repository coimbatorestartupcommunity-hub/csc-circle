import "server-only";
import { sendCommunityEmail } from "@/lib/notifications/email";
import { emailConfiguration } from "@/lib/notifications/config";
import { dispatchTeamWhatsAppAlert } from "@/lib/services/team-alerts";
import { renderMerakiEditorialEmail } from "@/lib/notifications/template-meraki";
import { escapeHtml } from "@/lib/notifications/email-components";

export async function sendAgreementInvitationEmail(input: {
  recipientEmail: string;
  recipientName: string;
  title: string;
  referenceCode: string;
  signingUrl: string;
}) {
  const c = emailConfiguration();
  if (!c.enabled) return;

  const subject = `Action Required: Sign ${input.title} (${input.referenceCode})`;
  const text = [
    `Hello ${input.recipientName},`,
    "",
    `Coimbatore Startup Community (CSC Circle) has prepared an official digital agreement for your review and electronic signature:`,
    `Document: ${input.title}`,
    `Reference: ${input.referenceCode}`,
    "",
    `Please open the secure link below, log in with this email address (${input.recipientEmail}), review the full agreement, optionally upload your organization logo, and submit your digital signature:`,
    input.signingUrl,
    "",
    `Warm regards,`,
    `Coimbatore Startup Community (CSC Circle)`,
  ].join("\n");

  const detailsHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:16px 0;border-collapse:collapse;font-size:13px;">
      <tr>
        <td style="padding:10px 14px;color:#64748b;font-weight:600;width:35%;border-bottom:1px solid #e2e8f0;">Agreement</td>
        <td style="padding:10px 14px;color:#0f172a;font-weight:700;border-bottom:1px solid #e2e8f0;">${escapeHtml(input.title)}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Reference Code</td>
        <td style="padding:10px 14px;color:#0f172a;font-family:monospace;font-weight:700;border-bottom:1px solid #e2e8f0;">${escapeHtml(input.referenceCode)}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Signer Account</td>
        <td style="padding:10px 14px;color:#0f172a;border-bottom:1px solid #e2e8f0;">${escapeHtml(input.recipientEmail)}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;color:#64748b;font-weight:600;">Status</td>
        <td style="padding:10px 14px;color:#0d9488;font-weight:700;">Pending Electronic Signature</td>
      </tr>
    </table>
  `;

  const html = renderMerakiEditorialEmail({
    base: c.base,
    support: c.support,
    badgeText: "CSC DIGITAL AGREEMENT ✦",
    headline: "Action Required: Digital Signature",
    headlineItalic: input.title,
    greeting: `Hello ${input.recipientName},`,
    body: `Coimbatore Startup Community (CSC Circle) has prepared an official digital agreement for your review and electronic execution. Please access your secure signing portal below using ${input.recipientEmail} to inspect all terms, review governance clauses, optionally upload your organization logo, and execute your binding digital signature.`,
    buttonText: "Review & Sign Agreement →",
    buttonUrl: input.signingUrl,
    htmlDetailsContent: detailsHtml,
    thumbtackNote: "All electronic signatures are cryptographically sealed under Section 10A / 65B of the Information Technology Act.",
    gridNote: "Once executed, you and CSC leadership will immediately receive an audit-certified sealed PDF copy.",
  });

  await sendCommunityEmail({
    to: input.recipientEmail,
    subject: subject.slice(0, 170),
    text,
    html,
    notificationId: `agr-inv-${input.referenceCode.replace(/[^a-zA-Z0-9-]/g, "")}-${Date.now()}`,
  });
}

export async function sendSignedAgreementEmailsAndAlerts(input: {
  agreementId: string;
  referenceCode: string;
  title: string;
  recipientEmail: string;
  recipientName: string;
  signedName: string;
  signedAt: string;
  pdfBuffer: Buffer;
}) {
  const c = emailConfiguration();
  const filename = `${input.referenceCode}.pdf`;
  const adminUrl = `${c.base}/admin/agreements/${input.agreementId}`;

  if (c.enabled) {
    const signerSubject = `Signed Copy: ${input.title} (${input.referenceCode})`;
    const signerText = [
      `Hello ${input.signedName},`,
      "",
      `Thank you for digitally signing "${input.title}" (${input.referenceCode}) with Coimbatore Startup Community.`,
      `Signed at: ${input.signedAt}`,
      "",
      `Your official signed PDF copy with the Section 65B electronic execution certificate is attached to this email.`,
      "",
      `Warm regards,`,
      `Coimbatore Startup Community (CSC Circle)`,
    ].join("\n");

    const signerDetailsHtml = `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:16px 0;border-collapse:collapse;font-size:13px;">
        <tr>
          <td style="padding:10px 14px;color:#64748b;font-weight:600;width:35%;border-bottom:1px solid #e2e8f0;">Agreement</td>
          <td style="padding:10px 14px;color:#0f172a;font-weight:700;border-bottom:1px solid #e2e8f0;">${escapeHtml(input.title)}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Reference Code</td>
          <td style="padding:10px 14px;color:#0f172a;font-family:monospace;font-weight:700;border-bottom:1px solid #e2e8f0;">${escapeHtml(input.referenceCode)}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Signer</td>
          <td style="padding:10px 14px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;">${escapeHtml(input.signedName)}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Signed Timestamp</td>
          <td style="padding:10px 14px;color:#0f172a;font-family:monospace;border-bottom:1px solid #e2e8f0;">${escapeHtml(input.signedAt)}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#64748b;font-weight:600;">Execution Status</td>
          <td style="padding:10px 14px;color:#059669;font-weight:700;">Sealed &amp; Certified</td>
        </tr>
      </table>
    `;

    const signerHtml = renderMerakiEditorialEmail({
      base: c.base,
      support: c.support,
      badgeText: "DIGITALLY SIGNED & SEALED ✦",
      headline: "Agreement Executed Successfully",
      headlineItalic: input.title,
      greeting: `Hello ${input.signedName},`,
      body: `Thank you for digitally executing ${input.title} (Reference: ${input.referenceCode}) with Coimbatore Startup Community. Your official signed PDF copy containing the cryptographic SHA-256 seal and Section 65B electronic audit certificate is attached to this email for your permanent records.`,
      buttonText: "Visit CSC Circle Platform →",
      buttonUrl: c.base,
      htmlDetailsContent: signerDetailsHtml,
      thumbtackNote: "A verified digital copy has also been archived into CSC Circle's tamper-evident agreement registry.",
      gridNote: "You can download this executed agreement and audit trail anytime directly from your profile or admin console.",
    });

    await sendCommunityEmail({
      to: input.recipientEmail,
      subject: signerSubject.slice(0, 170),
      text: signerText,
      html: signerHtml,
      notificationId: `agr-signed-user-${input.referenceCode.replace(/[^a-zA-Z0-9-]/g, "")}-${Date.now()}`,
      attachments: [
        {
          filename,
          content: input.pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    }).catch((err) => console.warn("[agreements] signer email error:", err));

    const adminEmail = c.support;
    if (adminEmail && adminEmail.toLowerCase() !== input.recipientEmail.toLowerCase()) {
      const adminDetailsHtml = `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:16px 0;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:10px 14px;color:#64748b;font-weight:600;width:35%;border-bottom:1px solid #e2e8f0;">Agreement</td>
            <td style="padding:10px 14px;color:#0f172a;font-weight:700;border-bottom:1px solid #e2e8f0;">${escapeHtml(input.title)}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Reference Code</td>
            <td style="padding:10px 14px;color:#0f172a;font-family:monospace;font-weight:700;border-bottom:1px solid #e2e8f0;">${escapeHtml(input.referenceCode)}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Signer Name</td>
            <td style="padding:10px 14px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;">${escapeHtml(input.signedName)}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Signer Email</td>
            <td style="padding:10px 14px;color:#0f172a;border-bottom:1px solid #e2e8f0;">${escapeHtml(input.recipientEmail)}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;color:#64748b;font-weight:600;">Signed At</td>
            <td style="padding:10px 14px;color:#0f172a;font-family:monospace;">${escapeHtml(input.signedAt)}</td>
          </tr>
        </table>
      `;

      const adminHtml = renderMerakiEditorialEmail({
        base: c.base,
        support: c.support,
        badgeText: "CSC LEADERSHIP ALERT ✦",
        headline: "Digital Agreement Signed",
        headlineItalic: input.title,
        greeting: "Hello CSC Leadership,",
        body: `An official digital agreement has just been digitally executed by ${input.signedName} (${input.recipientEmail}). The audit-certified PDF copy is attached, and the agreement has been marked as signed in the registry.`,
        buttonText: "Open Admin Agreement Console →",
        buttonUrl: adminUrl,
        htmlDetailsContent: adminDetailsHtml,
        thumbtackNote: "All cryptographic hashes, IP logs, and browser agents have been recorded.",
      });

      await sendCommunityEmail({
        to: adminEmail,
        subject: `Agreement Signed: ${input.signedName} — ${input.referenceCode}`.slice(0, 170),
        text: [
          `Agreement ${input.referenceCode} (${input.title}) has been digitally signed.`,
          `Signer: ${input.signedName} (${input.recipientEmail})`,
          `Timestamp: ${input.signedAt}`,
          `Admin Link: ${adminUrl}`,
          "",
          `The signed PDF copy is attached.`,
        ].join("\n"),
        html: adminHtml,
        notificationId: `agr-signed-adm-${input.referenceCode.replace(/[^a-zA-Z0-9-]/g, "")}-${Date.now()}`,
        attachments: [
          {
            filename,
            content: input.pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      }).catch((err) => console.warn("[agreements] admin email error:", err));
    }
  }

  void dispatchTeamWhatsAppAlert({
    type: "collaboration_proposed",
    title: "Digital Agreement Signed",
    fields: {
      Reference: input.referenceCode,
      Agreement: input.title,
      "Signed By": input.signedName,
      Email: input.recipientEmail,
      "Signed At": input.signedAt,
    },
    actionUrl: adminUrl,
  }).catch((err) => console.warn("[agreements] whatsapp alert error:", err));
}
