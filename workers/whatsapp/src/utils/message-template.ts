export interface MessageTemplateParams {
  name: string;
  companyName: string;
  inquiry?: string | null;
}

export const CSC_WHATSAPP_FOOTER = [
  "🚀 *Connect • Build • Grow*",
  "🌐 *Coimbatore Startup Community (CSC Circle)*",
  "🤍 ⚙️ *Powered by Logic Intelligence Technologies*",
].join("\n");

/**
 * Normalizes CommonMark / LLM Markdown into standard WhatsApp formatting.
 * - Converts markdown double asterisks **bold** to WhatsApp *bold*.
 * - Converts ***bold-italic*** to _*bold-italic*_.
 * - Converts markdown headers (# Heading) to *Heading*.
 * - Converts bullet points (* or +) to • to avoid unclosed asterisk formatting bleed.
 * - Cleans stray double-stars that cause literal *word* to show up.
 */
export function formatForWhatsApp(text: string): string {
  if (!text) return "";
  let out = text;
  // Triple asterisks (bold italic) ***text*** -> _*text*_
  out = out.replace(/\*\*\*(.*?)\*\*\*/g, "_*$1*_");
  // Double asterisks (markdown bold) **text** -> *text*
  out = out.replace(/\*\*(.*?)\*\*/g, "*$1*");
  // Markdown headings (# Heading) -> *Heading*
  out = out.replace(/^#{1,6}\s+(.*)$/gm, "*$1*");
  // Markdown bullet lists starting with * or + -> • to avoid dangling asterisks
  out = out.replace(/^[\*\+]\s+/gm, "• ");
  // Clean up any remaining double asterisks
  out = out.replace(/\*\*/g, "*");
  return out;
}

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
