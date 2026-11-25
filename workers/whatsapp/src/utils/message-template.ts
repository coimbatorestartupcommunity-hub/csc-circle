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
  // Convert markdown bullet points (* or + at start of line) to •
  out = out.replace(/^([ \t]*)[\*\+]\s+/gm, "$1• ");
  // Triple asterisks (bold italic) ***text*** -> _*text*_
  out = out.replace(/\*{3,}([^\*\n]+?)\*{3,}/g, "_*$1*_");
  // Double or multiple asterisks (markdown bold) **text** -> *text*
  out = out.replace(/\*{2,}([^\*\n]+?)\*{2,}/g, "*$1*");
  // Markdown headings (# Heading) -> *Heading*
  out = out.replace(/^#{1,6}\s+(.*)$/gm, "*$1*");
  // Clean up any remaining multiple asterisks (** or *** -> *)
  out = out.replace(/\*{2,}/g, "*");
  // Clean spaces right inside bold asterisks e.g. * Vikash * -> *Vikash*
  out = out.replace(/\*\s+([^\*\n]+?)\s+\*/g, "*$1*");
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
