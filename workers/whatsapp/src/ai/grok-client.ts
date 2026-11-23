import { getWorkerEnv, WorkerEnv } from "../config/env.js";
import { logger } from "../utils/logger.js";
import {
  CSC_IDENTITY,
  CSC_LEADERSHIP,
  CSC_TECHNICAL_PARTNER,
  CSC_PLATFORM_PILLARS,
  CSC_COMMUNITY_CONTACTS,
} from "./knowledge-base.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Resilient multi-tier AI inference pipeline:
 * Tier 1: Groq API (High-speed LLaMA-3.3-70b-versatile)
 * Tier 2: Modal Direct Endpoint fallback (when Groq hits rate-limit 429, downtime, or downgrade)
 * Tier 3: Deterministic Authoritative Contextual Rule Engine (100% uptime guaranteed)
 */
export async function callAIModel(
  messages: ChatMessage[],
  options?: ChatOptions
): Promise<string> {
  const env = getWorkerEnv();
  const apiKey =
    process.env.GROK_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.XAI_API_KEY ||
    "";

  // If API key is present, attempt Tier 1 (Groq)
  if (apiKey) {
    const isGroq = apiKey.startsWith("gsk_") || !apiKey.startsWith("xai-");
    const endpoint = isGroq
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.x.ai/v1/chat/completions";

    let rawModel =
      options?.model ||
      process.env.GROK_MODEL ||
      process.env.GROQ_MODEL ||
      "llama-3.3-70b-versatile";
    let model = rawModel;
    if (isGroq) {
      if (rawModel.toLowerCase().includes("grok") || rawModel.toLowerCase() === "default") {
        model = "llama-3.3-70b-versatile";
      }
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.maxTokens ?? 1000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const reply = data.choices?.[0]?.message?.content?.trim();
        if (reply) return reply;
      } else {
        const errText = await res.text();
        logger.warn(
          `Groq API degraded/rate-limited (HTTP ${res.status}). Initiating Modal endpoint fallback.`,
          { status: String(res.status), error: errText }
        );
      }
    } catch (err) {
      logger.warn("Groq API call exception. Initiating Modal endpoint fallback.", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    logger.info("No Groq API key set. Checking Modal fallback endpoint...");
  }

  // Tier 2: Modal Endpoint Fallback
  const modalReply = await callModalFallback(messages, env, options);
  if (modalReply) {
    return modalReply;
  }

  // Tier 3: Deterministic Contextual Rule Engine
  return generateContextualFallback(messages);
}

/**
 * Invokes the user's Modal endpoint as a fallback for high-availability inference.
 */
async function callModalFallback(
  messages: ChatMessage[],
  env: WorkerEnv,
  options?: ChatOptions
): Promise<string | null> {
  const modalBaseUrl = env.MODAL_AI_ENDPOINT?.trim().replace(/\/+$/, "");
  if (!modalBaseUrl) return null;

  const url = `${modalBaseUrl}/v1/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (env.MODAL_PROXY_TOKEN) {
    headers["Authorization"] = `Bearer ${env.MODAL_PROXY_TOKEN}`;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "default",
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 1000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as any;
      const reply =
        data?.choices?.[0]?.message?.content ||
        data?.text ||
        data?.output ||
        data?.response;

      if (reply && typeof reply === "string") {
        logger.info("Successfully received AI response from Modal fallback endpoint");
        return reply.trim();
      }
    }
  } catch {
    // Quick failover to deterministic contextual fallback
  }

  return null;
}

/**
 * Fallback contextual engine supporting English, Pure Tamil, and Tanglish.
 * Fully grounded in Coimbatore Startup Community facts, leadership, tagline, and platform URLs.
 */
function generateContextualFallback(messages: ChatMessage[]): string {
  const lastUserMessage = messages
    .slice()
    .reverse()
    .find((m) => m.role === "user")?.content?.trim() || "";

  const lower = lastUserMessage.toLowerCase();

  // 1. Detect Pure Tamil (Tamil script unicode)
  const isPureTamil = /[\u0B80-\u0BFF]/.test(lastUserMessage);

  // 2. Detect Tanglish (Tamil words written in English letters)
  const isTanglish =
    !isPureTamil &&
    /\b(vanakkam|epadi|eppadi|enge|engae|theriyuma|enna|solunga|sollunga|nandri|iruka|irukeenga|irukinga|panlam|pannalam|panna|venum|kedaikuma|bro|thala|machan|nanba|kooda|unga|namba|romba|aachu|aagala|sollu|paaru|paru|edhavadhu|eppovum|eppa|eppo|yar|yaaru|theriyum)\b/i.test(lower);

  // Intent A: Community Overview, Tagline, One-Liner, Mission, Vision, What are they doing
  const isCommunityQuery =
    lower.includes("one line") ||
    lower.includes("oneline") ||
    lower.includes("tagline") ||
    lower.includes("motto") ||
    lower.includes("what is csc") ||
    lower.includes("about csc") ||
    lower.includes("about community") ||
    lower.includes("about the community") ||
    lower.includes("what are they doing") ||
    lower.includes("what are you doing") ||
    lower.includes("what do they do") ||
    lower.includes("what do you do") ||
    lower.includes("what does csc do") ||
    lower.includes("what is this community") ||
    lower.includes("mission") ||
    lower.includes("vision") ||
    lower.includes("purpose") ||
    lower.includes("நோக்கம்") ||
    lower.includes("பற்றி") ||
    lower.includes("ஒரே வரி") ||
    (lower.includes("community") && (lower.includes("info") || lower.includes("tell") || lower.includes("know") || lower.includes("explain")));

  if (isCommunityQuery) {
    if (isPureTamil) {
      return `**கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டி (CSC Circle)** ✨

📌 **ஒரே வரி குறிக்கோள் (Tagline)**:
*“${CSC_IDENTITY.tagline}”*

🎯 **எங்கள் நோக்கம் & செயல்பாடுகள்**:
${CSC_IDENTITY.description}

🚀 **முக்கிய நோக்கங்கள்**:
${CSC_IDENTITY.mission}

🌐 **முக்கிய இணைப்புகள்**:
• **நிகழ்வுகள்**: https://csc.logicintelligencetechnologies.in/events
• **ஸ்டார்ட்அப் பட்டியல்**: https://csc.logicintelligencetechnologies.in/directory
• **உறுப்பினர் பதிவு**: https://csc.logicintelligencetechnologies.in/join (5 நிமிடங்களில் உடனடி அனுமதி)
• **WhatsApp குழு**: ${CSC_COMMUNITY_CONTACTS.whatsappGroup}

உங்களுக்கு வேறு என்ன விவரங்கள் தேவை? தயங்காமல் கேளுங்கள்!`;
    }

    if (isTanglish) {
      return `**Coimbatore Startup Community (CSC Circle)** ✨

📌 **Tagline & One-Liner**:
*“${CSC_IDENTITY.tagline}”*

🎯 **CSC Enna Panranga?**:
${CSC_IDENTITY.description}

🚀 **Mission**:
${CSC_IDENTITY.mission}

🌐 **Quick Links**:
• **Events & Meetups**: https://csc.logicintelligencetechnologies.in/events
• **Founder Directory**: https://csc.logicintelligencetechnologies.in/directory
• **Membership Join**: https://csc.logicintelligencetechnologies.in/join (5 mins automated approval)
• **Official WhatsApp Group**: ${CSC_COMMUNITY_CONTACTS.whatsappGroup}

Innum edhavadhu info venuma bro? Sollunga, guide panren!`;
    }

    return `**Coimbatore Startup Community (CSC Circle)** ✨

📌 **One-Liner / Tagline**:
*“${CSC_IDENTITY.tagline}”*

🎯 **What We Do**:
${CSC_IDENTITY.description}

🚀 **Our Mission**:
${CSC_IDENTITY.mission}

🌐 **Ecosystem Highlights**:
• **Upcoming Events & Meetups**: https://csc.logicintelligencetechnologies.in/events
• **Founder Directory**: https://csc.logicintelligencetechnologies.in/directory
• **Membership & Digital Pass**: https://csc.logicintelligencetechnologies.in/join (Auto-approved within 5 minutes)
• **Official WhatsApp Group**: ${CSC_COMMUNITY_CONTACTS.whatsappGroup}

How can I assist you with your startup journey today?`;
  }

  // Intent B: Leadership - Founder
  const isFounderQuery =
    (lower.includes("founder") ||
      lower.includes("reyash") ||
      lower.includes("who started") ||
      lower.includes("who found") ||
      lower.includes("who created") ||
      lower.includes("நிறுவனர்")) &&
    !lower.includes("co-founder") &&
    !lower.includes("cofounder") &&
    !lower.includes("sharan");

  if (isFounderQuery) {
    const leader = CSC_LEADERSHIP.founder;
    if (isPureTamil) {
      return `**CSC Circle நிறுவனர் (Founder)**:
👤 **${leader.name}**
• **பொறுப்பு**: ${leader.roleTitle}
• **கூடுதல் நிறுவனம்**: ${leader.additionalRole}
• **செயல்பாடு**: ${leader.responsibility}

🌐 இணையதளம்: ${CSC_IDENTITY.portalUrl}`;
    }
    if (isTanglish) {
      return `**CSC Circle Founder**:
👤 **${leader.name}**
• **Role**: ${leader.roleTitle}
• **Other Venture**: ${leader.additionalRole}
• **Details**: ${leader.responsibility}

🌐 Website: ${CSC_IDENTITY.portalUrl}`;
    }
    return `**CSC Circle Founder**:
👤 **${leader.name}**
• **Role**: ${leader.roleTitle}
• **Additional Venture**: ${leader.additionalRole}
• **Profile**: ${leader.responsibility}

🌐 Learn more: ${CSC_IDENTITY.portalUrl}`;
  }

  // Intent C: Leadership - Co-Founder
  const isCoFounderQuery =
    lower.includes("co-founder") ||
    lower.includes("cofounder") ||
    lower.includes("sharan") ||
    lower.includes("இணை நிறுவனர்");

  if (isCoFounderQuery) {
    const leader = CSC_LEADERSHIP.cofounder;
    if (isPureTamil) {
      return `**CSC Circle இணை நிறுவனர் (Co-Founder)**:
👤 **${leader.name}**
• **பொறுப்பு**: ${leader.roleTitle}
• **கூடுதல் நிறுவனம்**: ${leader.additionalRole}
• **செயல்பாடு**: ${leader.responsibility}`;
    }
    if (isTanglish) {
      return `**CSC Circle Co-Founder**:
👤 **${leader.name}**
• **Role**: ${leader.roleTitle}
• **Other Venture**: ${leader.additionalRole}
• **Details**: ${leader.responsibility}`;
    }
    return `**CSC Circle Co-Founder**:
👤 **${leader.name}**
• **Role**: ${leader.roleTitle}
• **Additional Venture**: ${leader.additionalRole}
• **Profile**: ${leader.responsibility}`;
  }

  // Intent D: Leadership - CTO & Technical Partner
  const isCTOQuery =
    lower.includes("cto") ||
    lower.includes("chief technology officer") ||
    lower.includes("vikash") ||
    lower.includes("saravanan") ||
    lower.includes("logic intelligence") ||
    lower.includes("technical partner") ||
    lower.includes("tech lead");

  if (isCTOQuery) {
    const leader = CSC_LEADERSHIP.cto;
    if (isPureTamil) {
      return `**CSC Circle தலைமை தொழில்நுட்ப அதிகாரி (CTO) & Technical Partner**:
👤 **${leader.name}**
• **பொறுப்பு**: ${leader.roleTitle}
• **நிறுவனம்**: ${leader.additionalRole}
• **செயல்பாடு**: ${leader.responsibility}
• **தொழில்நுட்ப பங்குதாரர்**: ${CSC_TECHNICAL_PARTNER.name} (${CSC_TECHNICAL_PARTNER.url})`;
    }
    if (isTanglish) {
      return `**CSC Circle CTO & Technical Partner**:
👤 **${leader.name}**
• **Role**: ${leader.roleTitle}
• **Venture**: ${leader.additionalRole}
• **Details**: ${leader.responsibility}
• **Tech Partner**: ${CSC_TECHNICAL_PARTNER.name} (${CSC_TECHNICAL_PARTNER.url})`;
    }
    return `**Chief Technology Officer (CTO) & Technical Partner**:
👤 **${leader.name}**
• **Role**: ${leader.roleTitle}
• **Primary Role**: ${leader.additionalRole}
• **Profile**: ${leader.responsibility}
• **Technical Partner**: ${CSC_TECHNICAL_PARTNER.name} (${CSC_TECHNICAL_PARTNER.url})`;
  }

  // Intent E: Leadership - CEO
  const isCEOQuery =
    lower.includes("ceo") ||
    lower.includes("chief executive officer") ||
    lower.includes("mirra") ||
    lower.includes("mahendran");

  if (isCEOQuery) {
    const leader = CSC_LEADERSHIP.ceo;
    return `**Chief Executive Officer (CEO) of CSC Circle**:
👤 **${leader.name}**
• **Role**: ${leader.roleTitle}
• **Background**: Pursuing BA (Hons) International Business at PSG Institute of Advanced Studies.
• **Profile**: ${leader.responsibility}`;
  }

  // Intent F: Leadership - COO
  const isCOOQuery =
    lower.includes("coo") ||
    lower.includes("chief operating officer") ||
    lower.includes("kishore") ||
    lower.includes("apare");

  if (isCOOQuery) {
    const leader = CSC_LEADERSHIP.coo;
    return `**Chief Operating Officer (COO) of CSC Circle**:
👤 **${leader.name}**
• **Role**: ${leader.roleTitle}
• **Additional Venture**: ${leader.additionalRole}
• **Profile**: ${leader.responsibility}`;
  }

  // Intent G: Leadership - CBO
  const isCBOQuery =
    lower.includes("cbo") ||
    lower.includes("chief brand officer") ||
    lower.includes("jaibharath") ||
    lower.includes("flickkora");

  if (isCBOQuery) {
    const leader = CSC_LEADERSHIP.cbo;
    return `**Chief Brand Officer (CBO) of CSC Circle**:
👤 **${leader.name}**
• **Role**: ${leader.roleTitle}
• **Additional Venture**: ${leader.additionalRole}
• **Profile**: ${leader.responsibility}`;
  }

  // Intent H: Leadership - CCO
  const isCCOQuery =
    lower.includes("cco") ||
    lower.includes("chief community officer") ||
    lower.includes("swathi");

  if (isCCOQuery) {
    const leader = CSC_LEADERSHIP.cco;
    return `**Chief Community Officer (CCO) of CSC Circle**:
👤 **${leader.name}**
• **Role**: ${leader.roleTitle}
• **Profile**: ${leader.responsibility}`;
  }

  // Intent I: General Leadership / Core Team Roster
  const isLeadershipRosterQuery =
    lower.includes("leadership") ||
    lower.includes("core team") ||
    lower.includes("team members") ||
    lower.includes("who runs") ||
    lower.includes("who is leading") ||
    lower.includes("organizers") ||
    lower.includes("board members") ||
    lower.includes("தலைமை") ||
    lower.includes("நிர்வாகம்");

  if (isLeadershipRosterQuery) {
    return `**Coimbatore Startup Community (CSC Circle) — Leadership Team**:

• **Founder**: ${CSC_LEADERSHIP.founder.name} (${CSC_LEADERSHIP.founder.additionalRole})
• **Co-Founder**: ${CSC_LEADERSHIP.cofounder.name} (${CSC_LEADERSHIP.cofounder.additionalRole})
• **CEO**: ${CSC_LEADERSHIP.ceo.name} (PSG IAS)
• **CTO**: ${CSC_LEADERSHIP.cto.name} (${CSC_LEADERSHIP.cto.additionalRole})
• **COO**: ${CSC_LEADERSHIP.coo.name} (${CSC_LEADERSHIP.coo.additionalRole})
• **CBO**: ${CSC_LEADERSHIP.cbo.name} (${CSC_LEADERSHIP.cbo.additionalRole})
• **CCO**: ${CSC_LEADERSHIP.cco.name}

Technical Partner: **${CSC_TECHNICAL_PARTNER.name}** (${CSC_TECHNICAL_PARTNER.url})
🌐 Community Portal: ${CSC_IDENTITY.portalUrl}`;
  }

  // Intent J: Community WhatsApp Group & Networking
  const isWhatsAppGroupQuery =
    lower.includes("whatsapp group") ||
    lower.includes("group link") ||
    lower.includes("join group") ||
    lower.includes("community link") ||
    lower.includes("chat link") ||
    lower.includes("வாட்ஸ்அப் குழு");

  if (isWhatsAppGroupQuery) {
    if (isPureTamil) {
      return `**CSC Circle அதிகாரப்பூர்வ WhatsApp குழுவில் இணைய**:
🔗 ${CSC_COMMUNITY_CONTACTS.whatsappGroup}

💡 **புதிய உறுப்பினர்களுக்கான வழிகாட்டுதல்**:
1. குழுவில் இணைந்தவுடன் உங்களையும் உங்கள் ஸ்டார்ட்அப் நிறுவனத்தையும் அறிமுகப்படுத்துங்கள்.
2. மற்ற நிறுவனர்களுடன் கலந்துரையாடி ஆலோசனைகளைப் பெறுங்கள்.
3. புதிய வாய்ப்புகள் மற்றும் கூட்டணிகளைப் பகிர்ந்து பயன் பெறுங்கள்! ✨`;
    }
    if (isTanglish) {
      return `**Join Official CSC Community WhatsApp Group**:
🔗 ${CSC_COMMUNITY_CONTACTS.whatsappGroup}

💡 **Member Guidelines**:
1. Group-la join pannitu ungalaiyum unga startup/idea-vaiyum introduce pannunga.
2. Fellow founders kooda active-ah engage and network pannunga.
3. Collabs and opportunities share panni connect aagunga! ✨`;
    }
    return `**Join the Official CSC Community WhatsApp Group**:
🔗 ${CSC_COMMUNITY_CONTACTS.whatsappGroup}

💡 **Member Guidelines**:
1. Join the group and introduce yourself and your startup/idea.
2. Actively engage with fellow founders in ecosystem discussions.
3. Share relevant opportunities, collaborations, and queries.
4. Support and connect with other builders across Coimbatore! ✨`;
  }

  // Intent K: Opportunities & Job Board
  const isOpportunitiesQuery =
    lower.includes("opportunity") ||
    lower.includes("opportunities") ||
    lower.includes("job") ||
    lower.includes("hiring") ||
    lower.includes("internship") ||
    lower.includes("வேலை");

  if (isOpportunitiesQuery) {
    return `**CSC Opportunities Portal**:
Looking for startup jobs, internships, co-founder search, or hiring talent for your venture?

Explore verified opportunities across Coimbatore startups:
🔗 https://csc.logicintelligencetechnologies.in/opportunities`;
  }

  // Intent L: Resources & Playbooks
  const isResourcesQuery =
    lower.includes("resource") ||
    lower.includes("resources") ||
    lower.includes("playbook") ||
    lower.includes("guide") ||
    lower.includes("template") ||
    lower.includes("வழிகாட்டி");

  if (isResourcesQuery) {
    return `**CSC Founder Resources & Guides**:
Access practical playbooks, pitch deck frameworks, legal templates, and technical resources:
🔗 https://csc.logicintelligencetechnologies.in/resources`;
  }

  // Intent M: Collaborations
  const isCollaborationsQuery =
    lower.includes("collaboration") ||
    lower.includes("collaborations") ||
    lower.includes("partner") ||
    lower.includes("incubator") ||
    lower.includes("கூட்டணி");

  if (isCollaborationsQuery) {
    return `**CSC Ecosystem Collaborations**:
We collaborate with universities, student entrepreneurship cells, incubators, and industry bodies across Coimbatore.

Explore or propose a partnership:
🔗 https://csc.logicintelligencetechnologies.in/collaborations`;
  }

  // Intent N: Contact / Feedback / Support
  const isContactQuery =
    lower.includes("contact") ||
    lower.includes("support") ||
    lower.includes("help desk") ||
    lower.includes("email") ||
    lower.includes("feedback") ||
    lower.includes("complaint") ||
    lower.includes("தொடர்பு");

  if (isContactQuery) {
    return `**Get in Touch with CSC Circle**:
• **Website Contact Form**: https://csc.logicintelligencetechnologies.in/contact
• **Email**: ${CSC_COMMUNITY_CONTACTS.supportEmail} or ${CSC_COMMUNITY_CONTACTS.communityEmail}
• **Official WhatsApp Agent**: ${CSC_COMMUNITY_CONTACTS.whatsappAgentPhone}

We welcome your questions, feedback, and collaboration proposals!`;
  }

  // Events / Meetups
  if (
    lower.includes("event") ||
    lower.includes("meetup") ||
    lower.includes("நிகழ்வு") ||
    lower.includes("ஈவென்ட்") ||
    lower.includes("மீட்டப்")
  ) {
    if (isPureTamil) {
      return "வணக்கம்! கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டியின் (CSC Circle) அடுத்த நிகழ்வுகள் மற்றும் மீட்டப்களைப் பற்றி அறிய விரும்புகிறீர்களா?\n\nநமது வரவிருக்கும் நிகழ்வுகளைக் காண மற்றும் பதிவு செய்ய:\n🔗 https://csc.logicintelligencetechnologies.in/events\n\nவேறு ஏதேனும் விவரங்கள் தேவைப்பட்டால் தயங்காமல் கேளுங்கள்! ✨";
    }
    if (isTanglish) {
      return "Vanakkam! CSC Circle oda upcoming events & meetups pathi therinjika virumbureengala? Scheduled events paaka and pass book panna:\n🔗 https://csc.logicintelligencetechnologies.in/events\n\nSpecific event pathi info venumna kooda sollunga, naan guide panren! ✨";
    }
    return "Hello! Here are the upcoming events at Coimbatore Startup Community (CSC Circle).\n\nYou can view all scheduled events and reserve your pass here:\n🔗 https://csc.logicintelligencetechnologies.in/events\n\nLet me know if you would like details on any specific event! ✨";
  }

  // Membership & Passes
  if (
    lower.includes("membership") ||
    lower.includes("member") ||
    lower.includes("உறுப்பினர்") ||
    lower.includes("card") ||
    lower.includes("id")
  ) {
    if (isPureTamil) {
      return "வணக்கம்! CSC Circle உறுப்பினர் அட்டை (Membership Card) மற்றும் நிலையை சரிபார்க்க விரும்புகிறீர்களா?\n\nஉறுப்பினர் அடையாள அட்டைக்கான அங்கீகாரம் 5 நிமிடங்களுக்குள் தானாகவே செயல்படுத்தப்படுகிறது.\n\n• உங்கள் கணக்கின் நிலையை அல்லது டிஜிட்டல் கார்டைப் பார்க்க:\n🔗 https://csc.logicintelligencetechnologies.in/member/card\n• புதிய உறுப்பினராக இணைய:\n🔗 https://csc.logicintelligencetechnologies.in/join\n\nஏற்கனவே விண்ணப்பித்திருந்தால், உங்கள் மின்னஞ்சல் முகவரியை அனுப்பவும்.";
    }
    if (isTanglish) {
      return "Vanakkam! CSC Circle membership claim panna & digital pass paaka virumbureengala? Membership claims 5 mins kula automatically approve aagidum.\n\n• Unga pass/card paaka: https://csc.logicintelligencetechnologies.in/member/card\n• New member apply panna: https://csc.logicintelligencetechnologies.in/join\n\nAlready apply pannirundha unga registered email address share pannunga, verify pannikalam!";
    }
    return "Welcome to Coimbatore Startup Community (CSC Circle)!\n\nMembership claims are automatically approved within 5 minutes of submission.\n\n• To check your membership or view your digital pass: https://csc.logicintelligencetechnologies.in/member/card\n• To apply for membership: https://csc.logicintelligencetechnologies.in/join\n\nIf you have already applied, reply with your registered email or phone number to check your status.";
  }

  // Startup Directory
  if (
    lower.includes("startup") ||
    lower.includes("directory") ||
    lower.includes("நிறுவனம்")
  ) {
    if (isPureTamil) {
      return "வணக்கம்! கோயம்புத்தூர் ஸ்டார்ட்அப் நிறுவனங்களின் விபரங்களை ஆராய விரும்புகிறீர்களா?\n\n• முழு ஸ்டார்ட்அப் பட்டியல்:\n🔗 https://csc.logicintelligencetechnologies.in/directory\n• உங்கள் நிறுவனத்தை சேர்க்க:\n🔗 https://csc.logicintelligencetechnologies.in/profile/startups/new";
    }
    if (isTanglish) {
      return "Vanakkam! Coimbatore startup directory & founders list paaka virumbureengala?\n\n• Full Startup Directory: https://csc.logicintelligencetechnologies.in/directory\n• Unga startup-ah list panna: https://csc.logicintelligencetechnologies.in/profile/startups/new";
    }
    return "Explore the thriving ecosystem of Coimbatore startups!\n\n• View the Startup Directory: https://csc.logicintelligencetechnologies.in/directory\n• Register your startup: https://csc.logicintelligencetechnologies.in/profile/startups/new";
  }

  // General Greetings
  if (isPureTamil) {
    return "வணக்கம்! கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டிக்கு (CSC Circle) உங்களை அன்போடு வரவேற்கிறோம். ✨\n\nஉங்களுக்கு என்ன உதவி வேண்டும்? வரவிருக்கும் நிகழ்வுகள், உறுப்பினர் சேர்க்கை, ஸ்டார்ட்அப் பட்டியல் அல்லது கம்யூனிட்டி வழிகாட்டிகள் எதுவாக இருந்தாலும் சொல்லுங்கள், உடனடியாக உதவுகிறேன்!\n\n🌐 இணையதளம்: https://csc.logicintelligencetechnologies.in";
  }

  if (isTanglish) {
    return "Vanakkam! Welcome to Coimbatore Startup Community (CSC Circle)! ✨\n\nUngaluku enna help venum? Upcoming events, membership claim, startup directory and ecosystem updates pathi therinjikkanuma? Sollunga, immediately help panren!\n\n🌐 Website: https://csc.logicintelligencetechnologies.in";
  }

  return "Welcome to Coimbatore Startup Community (CSC Circle)! ✨\n\nHow can I help you today? Tell me what you're looking for — upcoming events, membership passes, startup directory, or community connections, and I will assist you right away!\n\n🌐 Website: https://csc.logicintelligencetechnologies.in";
}
