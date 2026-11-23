import { getSupabase } from "./live-queries.js";
import { CSC_WHATSAPP_FOOTER } from "../utils/message-template.js";
import { logger } from "../utils/logger.js";

/**
 * Retrieves the featured startup for the current fortnight.
 */
export async function getFortnightlyFounderSpotlight(): Promise<string> {
  const sb = getSupabase();

  try {
    const { data: startups, error } = await sb
      .from("directory_startups")
      .select("id, name, title, tagline, sector, website_url, short_description, slug")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error || !startups || startups.length === 0) {
      return `🚀 *Coimbatore Startup Spotlight*\n\nExplore innovative homegrown startups from Coimbatore in our ecosystem directory:\n🔗 https://csc.logicintelligencetechnologies.in/directory\n\n${CSC_WHATSAPP_FOOTER}`;
    }

    // Select based on week of year
    const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const selected = startups[weekNumber % startups.length];

    const companyName = selected.name || selected.title || "CSC Startup";
    const tagline = selected.tagline ? `_${selected.tagline}_` : "";
    const sector = selected.sector ? `🏷️ *Sector:* ${selected.sector}` : "";
    const website = selected.website_url ? `🌐 *Website:* ${selected.website_url}` : "";
    const desc = selected.short_description || "";

    const text =
      `🌟 *CSC Founder Spotlight of the Fortnight!*\n\n` +
      `🏢 *${companyName}*\n` +
      (tagline ? `${tagline}\n\n` : "\n") +
      (desc ? `📝 ${desc}\n\n` : "") +
      (sector ? `${sector}\n` : "") +
      (website ? `${website}\n` : "") +
      `🔗 *View Full Profile:* https://csc.logicintelligencetechnologies.in/directory/${selected.slug || ""}\n\n` +
      `Are you building an ambitious startup in Coimbatore? Apply to be featured: https://csc.logicintelligencetechnologies.in/join\n\n` +
      CSC_WHATSAPP_FOOTER;

    return text;
  } catch (err) {
    logger.error("Error generating founder spotlight", { error: err });
    return `🚀 *Coimbatore Startup Spotlight*\n\nDiscover startups building from Coimbatore:\n🔗 https://csc.logicintelligencetechnologies.in/directory\n\n${CSC_WHATSAPP_FOOTER}`;
  }
}
