import crypto from "node:crypto";
import { getSupabase } from "../services/live-queries.js";
import {
  CSC_IDENTITY,
  CSC_LEADERSHIP,
  CSC_TECHNICAL_PARTNER,
  CSC_PLATFORM_PILLARS,
  CSC_COMMUNITY_CONTACTS,
} from "../ai/knowledge-base.js";

async function seedKnowledge() {
  const sb = getSupabase();
  console.log("Seeding csc_agent_knowledge_documents in Supabase...");

  const docs = [
    {
      source: "system",
      source_id: "identity:overview",
      category: "community",
      title: "Coimbatore Startup Community (CSC Circle) Identity & Tagline",
      slug: "csc-identity-and-tagline",
      content: `Coimbatore Startup Community (CSC Circle) is Coimbatore's founder-focused startup community. Tagline: "${CSC_IDENTITY.tagline}". One-liner: ${CSC_IDENTITY.oneLiner}. Mission: ${CSC_IDENTITY.mission}. Vision: ${CSC_IDENTITY.vision}. Website: ${CSC_IDENTITY.portalUrl}`,
      metadata: { tagline: CSC_IDENTITY.tagline, established: CSC_IDENTITY.established },
      tier: 1,
      is_published: true,
    },
    {
      source: "system",
      source_id: "leadership:founder",
      category: "leadership",
      title: "Founder: K. N. Reyash",
      slug: "founder-kn-reyash",
      content: `K. N. Reyash is the Founder of Coimbatore Startup Community (CSC). Additional Venture: Founder of Belvoria. Responsibility: ${CSC_LEADERSHIP.founder.responsibility}`,
      metadata: { name: "K. N. Reyash", role: "Founder", org: "Belvoria" },
      tier: 1,
      is_published: true,
    },
    {
      source: "system",
      source_id: "leadership:cofounder",
      category: "leadership",
      title: "Co-Founder: E. R. Sharan",
      slug: "cofounder-er-sharan",
      content: `E. R. Sharan is Co-Founder of Coimbatore Startup Community (CSC). Additional Venture: Founder of CECIL Groups of Companies & Industries. Responsibility: ${CSC_LEADERSHIP.cofounder.responsibility}`,
      metadata: { name: "E. R. Sharan", role: "Co-Founder", org: "CECIL Groups" },
      tier: 1,
      is_published: true,
    },
    {
      source: "system",
      source_id: "leadership:ceo",
      category: "leadership",
      title: "Chief Executive Officer (CEO): Mirra Mahendran",
      slug: "ceo-mirra-mahendran",
      content: `Mirra Mahendran is the Chief Executive Officer (CEO) of Coimbatore Startup Community (CSC). Background: Pursuing BA (Hons) International Business at PSG Institute of Advanced Studies. Responsibility: ${CSC_LEADERSHIP.ceo.responsibility}`,
      metadata: { name: "Mirra Mahendran", role: "CEO", org: "PSG IAS" },
      tier: 1,
      is_published: true,
    },
    {
      source: "system",
      source_id: "leadership:cto",
      category: "leadership",
      title: "Chief Technology Officer (CTO): Vikash Saravanan & Logic Intelligence Technologies",
      slug: "cto-vikash-saravanan",
      content: `Vikash Saravanan is the Chief Technology Officer (CTO) of CSC and Founder & CEO of technical partner Logic Intelligence Technologies (LIT). Responsibility: ${CSC_LEADERSHIP.cto.responsibility}. Technical Partner: Logic Intelligence Technologies (https://www.logicintelligencetechnologies.in).`,
      metadata: { name: "Vikash Saravanan", role: "CTO", partner: "Logic Intelligence Technologies" },
      tier: 1,
      is_published: true,
    },
    {
      source: "system",
      source_id: "leadership:coo",
      category: "leadership",
      title: "Chief Operating Officer (COO): Kishore C",
      slug: "coo-kishore-c",
      content: `Kishore C is the Chief Operating Officer (COO) of CSC and Founder of APARÈ Clothing. Responsibility: ${CSC_LEADERSHIP.coo.responsibility}`,
      metadata: { name: "Kishore C", role: "COO", org: "APARÈ Clothing" },
      tier: 1,
      is_published: true,
    },
    {
      source: "system",
      source_id: "leadership:cbo",
      category: "leadership",
      title: "Chief Brand Officer (CBO): Jaibharath V",
      slug: "cbo-jaibharath-v",
      content: `Jaibharath V is the Chief Brand Officer (CBO) of CSC and Founder of Flickkora Agency. Responsibility: ${CSC_LEADERSHIP.cbo.responsibility}`,
      metadata: { name: "Jaibharath V", role: "CBO", org: "Flickkora Agency" },
      tier: 1,
      is_published: true,
    },
    {
      source: "system",
      source_id: "leadership:cco",
      category: "leadership",
      title: "Chief Community Officer (CCO): Swathi",
      slug: "cco-swathi",
      content: `Swathi is the Chief Community Officer (CCO) of CSC. Responsibility: ${CSC_LEADERSHIP.cco.responsibility}`,
      metadata: { name: "Swathi", role: "CCO" },
      tier: 1,
      is_published: true,
    },
    {
      source: "system",
      source_id: "community:channels",
      category: "community",
      title: "Official WhatsApp Group & Community Channels",
      slug: "csc-community-channels",
      content: `Official WhatsApp Community Group link: ${CSC_COMMUNITY_CONTACTS.whatsappGroup}. Members can introduce their startups, network with fellow founders, exchange resources, and share collaboration opportunities. Instagram: ${CSC_COMMUNITY_CONTACTS.instagram}. LinkedIn: ${CSC_COMMUNITY_CONTACTS.linkedin}. Support emails: ${CSC_COMMUNITY_CONTACTS.supportEmail}, ${CSC_COMMUNITY_CONTACTS.communityEmail}.`,
      metadata: { group_url: CSC_COMMUNITY_CONTACTS.whatsappGroup },
      tier: 1,
      is_published: true,
    },
    {
      source: "system",
      source_id: "platform:pillars",
      category: "platform",
      title: "Core Ecosystem Pillars & Platform URLs",
      slug: "csc-platform-pillars",
      content: `CSC Circle Platform Pillars: ${CSC_PLATFORM_PILLARS.map((p) => `${p.title}: ${p.description} (${p.url})`).join("; ")}. Membership claims are automatically approved within 5 minutes.`,
      metadata: { pillars: CSC_PLATFORM_PILLARS.map((p) => p.title) },
      tier: 1,
      is_published: true,
    },
  ];

  for (const doc of docs) {
    const checksum = crypto.createHash("sha256").update(doc.content).digest("hex");
    const { error } = await sb.from("csc_agent_knowledge_documents").upsert(
      {
        ...doc,
        checksum,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source,source_id" }
    );

    if (error) {
      console.error(`Failed to upsert ${doc.source_id}:`, error.message);
    } else {
      console.log(`✓ Upserted: ${doc.title}`);
    }
  }

  console.log("Finished seeding knowledge base.");
}

seedKnowledge().catch((err) => {
  console.error("Error seeding knowledge:", err);
  process.exit(1);
});
