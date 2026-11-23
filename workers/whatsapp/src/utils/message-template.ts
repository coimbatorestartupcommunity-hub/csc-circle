export interface MessageTemplateParams {
  name: string;
  companyName: string;
  inquiry?: string | null;
}

export const CSC_WHATSAPP_FOOTER = [
  "🚀 *Connect. Build. Grow.*",
  "*Coimbatore Startup Community (CSC Circle)*",
  "*Technical Partner: Logic Intelligence Technologies* 🤍",
].join("\n");

/**
 * Builds the official contact acknowledgement message text for WhatsApp dispatch.
 * Omit the inquiry block if none was provided.
 */
export function buildContactAcknowledgementMessage({
  name,
  companyName,
  inquiry,
}: MessageTemplateParams): string {
  const cleanName = name?.trim() || "there";
  const cleanCompany = companyName?.trim() || "Coimbatore Startup Community (CSC Circle)";
  const cleanInquiry = inquiry?.trim();

  const lines: string[] = [
    `Hello ${cleanName}! 👋`,
    "",
    `Thank you for contacting ${cleanCompany}.`,
    "",
    "We have successfully received your inquiry.",
  ];

  if (cleanInquiry && cleanInquiry.length > 0) {
    lines.push("", `"${cleanInquiry}"`);
  }

  lines.push(
    "",
    "Our team will review your request and get back to you shortly.",
    "",
    "Thank you for your interest!",
    "",
    CSC_WHATSAPP_FOOTER
  );

  return lines.join("\n");
}
