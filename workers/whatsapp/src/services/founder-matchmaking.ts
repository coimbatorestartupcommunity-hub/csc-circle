import { getSupabase } from "./live-queries.js";
import { CSC_WHATSAPP_FOOTER } from "../utils/message-template.js";
import { logger } from "../utils/logger.js";

/**
 * Searches Coimbatore Startup Community directory for founder, co-founder,
 * investor, and startup matchmaking based on industry, sector, or keyword.
 */
export async function searchFounderMatchmaking(rawQuery?: string): Promise<string> {
  const sb = getSupabase();
  const cleaned = (rawQuery || "")
    .replace(/^(MATCH|COFOUNDER|FOUNDER|INVESTOR|PARTNER|FIND)\s*/i, "")
    .trim();

  // If user only sent "MATCH" or "COFOUNDER" without a specific sector
  if (!cleaned || cleaned.length < 2) {
    return (
      `🤝 *CSC Founder & Co-Founder Matchmaking*\n\n` +
      `Connect with innovative founders, potential co-founders, and tech builders across Coimbatore!\n\n` +
      `👉 *How to search by sector or technology:*\n` +
      `• *MATCH AI* — Artificial Intelligence & DeepTech startups\n` +
      `• *MATCH SAAS* — B2B Software & SaaS founders\n` +
      `• *MATCH FINTECH* — Financial Services & Payment builders\n` +
      `• *MATCH HEALTH* — HealthTech & MedTech ventures\n` +
      `• *MATCH HARDWARE* — IoT, EV & Hardware engineering\n` +
      `• *MATCH <any keyword>* — Search by any startup name or tech\n\n` +
      `🌐 *Explore Complete Ecosystem Directory:*\n` +
      `🔗 https://csc.logicintelligencetechnologies.in/directory\n\n` +
      `🚀 *List Your Startup / Find a Co-Founder:*\n` +
      `🔗 https://csc.logicintelligencetechnologies.in/join\n\n` +
      CSC_WHATSAPP_FOOTER
    );
  }

  try {
    const term = cleaned.toLowerCase();

    // Query published directory startups
    const { data: startups, error } = await sb
      .from("directory_startups")
      .select("id, name, title, tagline, sector, website_url, short_description, slug")
      .eq("status", "published")
      .or(
        `sector.ilike.%${term}%,name.ilike.%${term}%,title.ilike.%${term}%,tagline.ilike.%${term}%,short_description.ilike.%${term}%`
      )
      .order("created_at", { ascending: false })
      .limit(4);

    if (error || !startups || startups.length === 0) {
      return (
        `🤝 *CSC Matchmaking Results: "${cleaned}"*\n\n` +
        `We could not find an exact match in our published directory for "${cleaned}".\n\n` +
        `💡 *Suggestions:*\n` +
        `• Try broader terms like *MATCH AI*, *MATCH SAAS*, *MATCH TECH*, or *MATCH FINTECH*.\n` +
        `• Browse all 50+ Coimbatore startups in our live directory:\n` +
        `🔗 https://csc.logicintelligencetechnologies.in/directory\n\n` +
        `Are you building in ${cleaned}? Register your startup to be discovered:\n` +
        `🔗 https://csc.logicintelligencetechnologies.in/join\n\n` +
        CSC_WHATSAPP_FOOTER
      );
    }

    const lines: string[] = [];
    lines.push(`🤝 *CSC Founder Matchmaking: "${cleaned}"*`);
    lines.push(`Found ${startups.length} matching startup(s) in Coimbatore:\n`);

    for (const s of startups) {
      const companyName = s.name || s.title || "CSC Startup";
      const sectorStr = s.sector ? ` [${s.sector}]` : "";
      const taglineStr = s.tagline ? `\n   _${s.tagline}_` : "";
      const profileUrl = `https://csc.logicintelligencetechnologies.in/directory/${s.slug || ""}`;

      lines.push(`🏢 *${companyName}*${sectorStr}${taglineStr}`);
      if (s.short_description) {
        lines.push(`   📝 ${s.short_description.slice(0, 140)}...`);
      }
      if (s.website_url) {
        lines.push(`   🌐 Website: ${s.website_url}`);
      }
      lines.push(`   🔗 Founder Profile: ${profileUrl}\n`);
    }

    lines.push(`🤝 *Want an introduction or collaboration?*`);
    lines.push(`Submit a collaboration proposal or request an introduction:`);
    lines.push(`🔗 https://csc.logicintelligencetechnologies.in/collaborations`);
    lines.push(`(Or reply *SUPPORT* to connect with our community organizers!)\n`);
    lines.push(CSC_WHATSAPP_FOOTER);

    return lines.join("\n");
  } catch (err) {
    logger.error("Exception in founder matchmaking", { error: err, query: rawQuery });
    return (
      `🤝 *CSC Founder Matchmaking*\n\n` +
      `Explore Coimbatore's startup directory to connect with founders and collaborators:\n` +
      `🔗 https://csc.logicintelligencetechnologies.in/directory\n\n` +
      CSC_WHATSAPP_FOOTER
    );
  }
}
