import "server-only";
import { sendCommunityEmail } from "@/lib/notifications/email";
import { emailConfiguration } from "@/lib/notifications/config";
import { dispatchTeamWhatsAppAlert } from "@/lib/services/team-alerts";

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

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;color:#0f172a;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#0d9488;margin:0 0 8px;">CSC Circle · Digital Agreements</p>
      <h2 style="margin:0 0 12px;font-size:20px;color:#0f172a;">${input.title}</h2>
      <p style="font-size:14px;line-height:1.6;color:#334155;">Hello ${input.recipientName},</p>
      <p style="font-size:14px;line-height:1.6;color:#334155;">
        Coimbatore Startup Community has shared an official agreement (<strong>${input.referenceCode}</strong>) for your review and digital signature.
      </p>
      <p style="font-size:13px;line-height:1.6;color:#475569;">
        Note: For security and legal verification, please sign in using <strong>${input.recipientEmail}</strong> before submitting your signature.
      </p>
      <div style="margin:24px 0;">
        <a href="${input.signingUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#ffffff;font-size:14px;font-weight:600;border-radius:10px;text-decoration:none;">
          Review &amp; Sign Agreement &rarr;
        </a>
      </div>
      <p style="font-size:12px;color:#64748b;margin:0;">Direct link: ${input.signingUrl}</p>
    </div>
  `;

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

    await sendCommunityEmail({
      to: input.recipientEmail,
      subject: signerSubject.slice(0, 170),
      text: signerText,
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
