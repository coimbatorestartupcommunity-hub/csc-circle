/**
 * Smart Typography & Content Preprocessor
 *
 * Automatically detects section titles ending in a colon (e.g. "Key Highlights:",
 * "Eligibility:", "Important Dates:", "Venue:") and promotes them to structured
 * headings/bold chips without requiring manual Markdown (# or **) syntax.
 *
 * Also cleans up malformed bullet lists and preserves code blocks.
 */

export function smartFormatContent(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "";

  const lines = raw.split("\n");
  let inCodeBlock = false;
  const processedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Preserve code blocks verbatim
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      processedLines.push(line);
      continue;
    }

    if (inCodeBlock) {
      processedLines.push(line);
      continue;
    }

    // Pattern for standalone section headers ending in colon
    // e.g. "Key Highlights:", "Eligibility Criteria:", "Important Dates:", "About the Organizer:"
    // Exclude URLs (http:, https:), timestamps (10:30 AM:), short list items
    const isSectionHeader =
      !trimmed.startsWith("#") &&
      !trimmed.startsWith("- ") &&
      !trimmed.startsWith("* ") &&
      !trimmed.startsWith("> ") &&
      !trimmed.startsWith("1.") &&
      trimmed.endsWith(":") &&
      trimmed.length >= 3 &&
      trimmed.length <= 80 &&
      !trimmed.includes("://") &&
      !/^\d{1,2}:\d{2}/.test(trimmed);

    if (isSectionHeader) {
      // Clean header text without markdown artifacts
      const headerTitle = trimmed.replace(/^[\s*_~`]+|[\s*_~`]+$/g, "");
      // Promote to level 3 heading with markdown spacing
      processedLines.push("");
      processedLines.push(`### ${headerTitle}`);
      processedLines.push("");
      continue;
    }

    // Normalize unicode bullet points to standard markdown list item
    if (/^[•●■◆]\s+/.test(trimmed)) {
      processedLines.push(trimmed.replace(/^[•●■◆]\s+/, "- "));
      continue;
    }

    processedLines.push(line);
  }

  // Join and collapse 3+ consecutive newlines to 2
  return processedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
