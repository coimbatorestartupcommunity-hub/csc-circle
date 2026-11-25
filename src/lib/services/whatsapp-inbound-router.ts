import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBiWeeklyCommunityPulse, CSC_WHATSAPP_FOOTER } from "@/lib/services/community-pulse";
import { dispatchTeamWhatsAppAlert } from "@/lib/services/team-alerts";
import { sendMsg91WhatsAppTextMessage } from "@/lib/services/msg91";

export interface InboundRouterInput {
  phone: string;
  text: string;
  messageId?: string;
  isAudio?: boolean;
}

export interface InboundRouterResult {
  handled: boolean;
  replyText: string;
  command?: string;
}

export async function routeInboundWhatsAppMessage(
  input: InboundRouterInput
): Promise<InboundRouterResult> {
  const cleanPhone = input.phone.replace(/\D/g, "");
  const trimmed = (input.text || "").trim();
  // Strip optional leading slash or hash (e.g. /menu -> menu, /events -> events, #events -> events)
  const cmd = trimmed.replace(/^[/#!]\s*/, "").trim();
  const lower = cmd.toLowerCase();

  // 1. Voice Note / Audio polite refusal (Zero token spend, no Whisper)
  if (input.isAudio) {
    const replyText = [
      "🎙️ *Voice Notes Not Supported*",
      "",
      "Sorry, our automated WhatsApp agent cannot process voice or audio messages. Please send your message as text!",
      "",
      "_மன்னிக்கவும், எங்கள் வாட்ஸ்அப் ஏஜென்டால் ஆடியோ செய்திகளைப் படிக்க முடியாது. தயவுசெய்து உங்கள் செய்தியை உரையாக (Text) அனுப்பவும்._",
      "",
      CSC_WHATSAPP_FOOTER,
    ].join("\n");

    await sendReplySafely(cleanPhone, replyText);
    return { handled: true, replyText, command: "VOICE_NOTE" };
  }

  // 2. Interactive Navigation Menu & Welcome Greetings
  const isGreeting = /^(hi|hello|hey|வணக்கம்|vanakkam)$/i.test(cmd);
  const isMenu = /^(menu|start|options)$/i.test(cmd) || lower === "0";

  if (isGreeting || isMenu) {
    const isTamil = /[\u0B80-\u0BFF]/.test(cmd) || /vanakkam/i.test(cmd);

    // If it's a greeting ("hi", "hello", "hey", etc.), send the warm Welcome Message FIRST
    if (isGreeting) {
      const welcomeText = isTamil
        ? [
            "👋 *கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டிக்கு அன்புடன் வரவேற்கிறோம்!*",
            "",
            "வணக்கம்! கோவையின் முன்னணி தொழில்முனைவோர் & பில்டர்கள் நெட்வொர்க்கான *CSC Circle*-க்கு உங்களை அன்புடன் வரவேற்கிறோம் 🚀",
            "",
            "இணை-நிறுவனர்களைக் கண்டறிய, வரவிருக்கும் நிகழ்வுகளை அறிய, உங்கள் டிஜிட்டல் உறுப்பினர் அடையாள அட்டையைப் பெற அல்லது யோசனைகளைப் பகிர — நாங்கள் உங்களுக்கு உதவத் தயாராக உள்ளோம்.",
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n")
        : [
            "👋 *Welcome to Coimbatore Startup Community!*",
            "",
            "Hi there! Welcome to *CSC Circle*, Coimbatore's premier founder & builder network 🚀",
            "",
            "We are thrilled to have you here. Whether you're connecting with local co-founders, discovering upcoming meetups, retrieving your digital membership pass, or sharing ideas with our core leadership team — we're here to assist you 24/7.",
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n");

      await sendReplySafely(cleanPhone, welcomeText);
    }

    const navigationMenuText = isTamil
      ? [
          "🌟 *கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டி*",
          "🚀 *CSC Circle — அதிகாரப்பூர்வ விரைவு வழிகாட்டி*",
          "",
          "வணக்கம்! உடனடி தகவல்களைப் பெற கீழே உள்ள எண் அல்லது முக்கிய வார்த்தையை அனுப்பவும்:",
          "",
          "1️⃣ *நிகழ்வுகள்* (பதில்: *1* அல்லது */events*)",
          "   அடுத்த ஆஃப்லைன் பவுண்டர் மீட்டிங் & மாஸ்டர்கிளாஸ் விவரங்கள்.",
          "",
          "2️⃣ *டிஜிட்டல் அடையாள அட்டை* (பதில்: *2* அல்லது */pass*)",
          "   உறுப்பினர் கார்டு மற்றும் நிகழ்வு நுழைவு QR கோட்.",
          "",
          "3️⃣ *தொழில்முனைவோர் இணைப்பு* (பதில்: *3* அல்லது */match <துறை>*)",
          "   கோவையின் ஸ்டார்ட்அப்கள் & இணை-நிறுவனர்கள் நெட்வொர்க்.",
          "",
          "4️⃣ *யோசனைகள் & தலைப்புகள்* (பதில்: *4* அல்லது */idea <யோசனை>*)",
          "   அடுத்த நிகழ்வுக்கான தலைப்புகள் (தலைமைக் குழுவுக்குச் செல்லும்).",
          "",
          "5️⃣ *அதிகாரப்பூர்வ வாட்ஸ்அப் குழு* (பதில்: *5* அல்லது */community*)",
          "   தலைமைக் குழு மற்றும் பவுண்டர்கள் குழுவில் இணைய.",
          "",
          "6️⃣ *நிர்வாகிகள் உதவி* (பதில்: *6* அல்லது */support*)",
          "   ஒருங்கிணைப்பாளர்களுடன் நேரடியாகப் பேச.",
          "",
          "ℹ️ *கட்டளைகள் வழிகாட்டி:* */help* என அனுப்பவும்.",
          "",
          CSC_WHATSAPP_FOOTER,
        ].join("\n")
      : [
          "🌟 *COIMBATORE STARTUP COMMUNITY*",
          "🚀 *CSC Circle — Official Quick Navigation*",
          "",
          "Welcome! Reply with a number or slash command below for instant assistance:",
          "",
          "1️⃣ *Upcoming Events* (Reply: *1* or */events*)",
          "   Explore upcoming offline founder meetups & masterclasses.",
          "",
          "2️⃣ *Digital ID & Event Passes* (Reply: *2* or */pass*)",
          "   Retrieve your official membership card & QR door entry pass.",
          "",
          "3️⃣ *Founder Matchmaking* (Reply: *3* or */match <domain>*)",
          "   Connect with local founders & co-founders (e.g. */match AI*, */match SaaS*).",
          "",
          "4️⃣ *Suggest Meetup Topic* (Reply: *4* or */idea <your idea>*)",
          "   Submit ideas directly to our 7-member Core Leadership Team.",
          "",
          "5️⃣ *Join Community Group* (Reply: *5* or */community*)",
          "   Join the verified leadership WhatsApp network.",
          "",
          "6️⃣ *Talk to Human Support* (Reply: *6* or */support*)",
          "   Escalate directly to our organizing team.",
          "",
          "ℹ️ *Slash Commands Guide:* Type */help* anytime.",
          "",
          CSC_WHATSAPP_FOOTER,
        ].join("\n");

    await sendReplySafely(cleanPhone, navigationMenuText);
    return {
      handled: true,
      replyText: navigationMenuText,
      command: isGreeting ? "WELCOME_GREETING_AND_MENU" : "MENU",
    };
  }

  // 3. Official Slash Commands & Help Menu
  if (/^(help|commands|cmd|\?)$/i.test(cmd)) {
    const replyText = [
      "📋 *CSC Circle Official Commands Guide*",
      "",
      "You can send any number, keyword, or slash command anytime:",
      "",
      "• *1* or */events* — View Upcoming Founder Meetups & Masterclasses",
      "• *2* or */pass* — Access Digital Membership Card & QR Entry Pass",
      "• *3* or */match <domain>* — Founder & Co-Founder Matchmaking",
      "• *4* or */idea <topic>* — Submit a Topic or Speaker Suggestion",
      "• *5* or */community* — Join Official Leadership WhatsApp Group",
      "• *6* or */support* — Connect with Community Organizers",
      "• */menu* — Main Navigation Menu",
      "• */pulse* — Fortnightly Ecosystem Pulse",
      "• */help* — Show this Commands Guide",
      "",
      "💡 *Ask Me Anything:* You can also ask natural questions about our ecosystem, events, membership, or leadership team!",
      "",
      CSC_WHATSAPP_FOOTER,
    ].join("\n");

    await sendReplySafely(cleanPhone, replyText);
    return { handled: true, replyText, command: "HELP" };
  }

  // 4. Digital Gate Pass & Membership Card Lookup
  if (/^(pass|ticket|my pass|id|id-card|2)$/i.test(cmd)) {
    const passLink = "https://csc.logicintelligencetechnologies.in/profile/id-card";
    const replyText = [
      "🎟️ *CSC Circle — Digital ID & Event Passes*",
      "",
      `Access your verified membership card and live event check-in passes here:`,
      `👉 ${passLink}`,
      "",
      "• Save to Apple Wallet or Google Wallet with 1-tap.",
      "• Display your dynamic QR code at the registration gate for instant entry.",
      "",
      CSC_WHATSAPP_FOOTER,
    ].join("\n");

    await sendReplySafely(cleanPhone, replyText);
    return { handled: true, replyText, command: "PASS" };
  }

  // 5. Upcoming Events
  if (/^(events|event|1)$/i.test(cmd)) {
    const eventsLink = "https://csc.logicintelligencetechnologies.in/events";
    const replyText = [
      "📅 *Upcoming CSC Community Events*",
      "",
      "Explore upcoming founder mixers, pitch days, and masterclasses in Coimbatore:",
      `👉 ${eventsLink}`,
      "",
      "• Active members receive instant 1-click RSVP and digital gate passes.",
      "",
      CSC_WHATSAPP_FOOTER,
    ].join("\n");

    await sendReplySafely(cleanPhone, replyText);
    return { handled: true, replyText, command: "EVENTS" };
  }

  // 6. Idea & Community Feedback Collector
  if (/^idea/i.test(cmd) || cmd === "4") {
    const ideaContent = cmd.replace(/^idea\s*/i, "").trim();

    if (!ideaContent || cmd === "4") {
      const replyText = [
        "💡 *Suggest a Meetup Topic or Speaker*",
        "",
        "Please reply in this format:",
        "*/idea <your topic or speaker suggestion>*",
        "",
        "Example: _/idea Masterclass on B2B SaaS pricing from Coimbatore_",
        "",
        "Your proposal goes straight to our 7-member Leadership Group!",
        "",
        CSC_WHATSAPP_FOOTER,
      ].join("\n");

      await sendReplySafely(cleanPhone, replyText);
      return { handled: true, replyText, command: "IDEA_PROMPT" };
    }

    const ideaRef = `IDEA-${Date.now().toString(36).toUpperCase()}`;

    // Alert the 7-member Core Leadership Team WhatsApp Group
    await dispatchTeamWhatsAppAlert({
      type: "feedback_submitted",
      title: "New Community Idea Submitted",
      fields: {
        "Reference": ideaRef,
        "Sender Mobile": `+${cleanPhone}`,
        "Idea / Topic": ideaContent,
        "Source": "WhatsApp 24/7 Agent",
      },
    }).catch(() => {});

    const replyText = [
      `💡 *Thank You for Shaping Our Ecosystem!* (Ref: *${ideaRef}*)`,
      "",
      `Your idea has been captured and routed directly to our Core Leadership Team:`,
      `_"${ideaContent}"_`,
      "",
      "Our team reviews ideas weekly when designing upcoming meetups & masterclasses.",
      "",
      CSC_WHATSAPP_FOOTER,
    ].join("\n");

    await sendReplySafely(cleanPhone, replyText);
    return { handled: true, replyText, command: "IDEA_RECORDED" };
  }

  // 7. Community Group Link
  if (/^(community|group|whatsapp group|link|5)$/i.test(cmd)) {
    const replyText = [
      "👥 *Official CSC Leadership & Community Group*",
      "",
      "Join our verified community network on WhatsApp:",
      "👉 https://chat.whatsapp.com/H3Nbi9oKWBcEmPQop0B5X3",
      "",
      "Connect with founders, angel investors, and the core team across Coimbatore!",
      "",
      CSC_WHATSAPP_FOOTER,
    ].join("\n");

    await sendReplySafely(cleanPhone, replyText);
    return { handled: true, replyText, command: "COMMUNITY" };
  }

  // 8. Founder Matchmaking
  if (/^match/i.test(cmd) || cmd === "3") {
    const domain = cmd.replace(/^match\s*/i, "").trim();

    if (!domain || cmd === "3") {
      const replyText = [
        "🤝 *CSC Founder & Co-Founder Matchmaking*",
        "",
        "Search local founders and startups by industry or tech stack:",
        "*/match <sector or keyword>*",
        "",
        "Examples:",
        "• */match AI*",
        "• */match SaaS*",
        "• */match Agritech*",
        "",
        CSC_WHATSAPP_FOOTER,
      ].join("\n");

      await sendReplySafely(cleanPhone, replyText);
      return { handled: true, replyText, command: "MATCH_GUIDE" };
    }

    const directoryLink = `https://csc.logicintelligencetechnologies.in/directory?q=${encodeURIComponent(domain)}`;
    const replyText = [
      `🔍 *Founders Matching "${domain.toUpperCase()}"*`,
      "",
      `Explore Coimbatore founders and startups working in *${domain}*:`,
      `👉 ${directoryLink}`,
      "",
      "Looking for a specific introduction? Reply */support* to connect with our organizers.",
      "",
      CSC_WHATSAPP_FOOTER,
    ].join("\n");

    await sendReplySafely(cleanPhone, replyText);
    return { handled: true, replyText, command: "MATCH_SEARCH" };
  }

  // 9. Fortnightly Sunday Community Pulse
  if (/^pulse$/i.test(cmd)) {
    const isTa = /[\u0B80-\u0BFF]/.test(cmd);
    const replyText = formatBiWeeklyCommunityPulse(isTa ? "ta" : "en");
    await sendReplySafely(cleanPhone, replyText);
    return { handled: true, replyText, command: "PULSE" };
  }

  // 10. Organizer / Human Support
  if (/^(support|human|admin|helpdesk|contact|6)$/i.test(cmd)) {
    await dispatchTeamWhatsAppAlert({
      type: "support_escalated",
      title: "Member Requested Organizer Support",
      fields: {
        "Sender Mobile": `+${cleanPhone}`,
        "Request": trimmed,
      },
    }).catch(() => {});

    const replyText = [
      "📞 *CSC Organizer Support Escalate*",
      "",
      "We've alerted our team that you would like to connect with an organizer.",
      "",
      "• Direct Contact: csc@logicintelligencetechnologies.in",
      "• Phone: +91 75500 67712",
      "",
      "An organizer will reach out to you shortly!",
      "",
      CSC_WHATSAPP_FOOTER,
    ].join("\n");

    await sendReplySafely(cleanPhone, replyText);
    return { handled: true, replyText, command: "SUPPORT" };
  }

  // 11. Deep Community AI Knowledge Hub (Groq AI + xAI Grok / Musk API)
  const aiReply = await answerWithCommunityAI(trimmed);
  const finalReply = `${aiReply}\n\n${CSC_WHATSAPP_FOOTER}`;
  await sendReplySafely(cleanPhone, finalReply);
  return { handled: true, replyText: finalReply, command: "AI_REPLY" };
}

async function sendReplySafely(phone: string, text: string): Promise<void> {
  try {
    await sendMsg91WhatsAppTextMessage({
      recipientPhone: phone,
      text,
    });
  } catch (err) {
    console.error("[sendReplySafely] Failed to send via MSG91 API:", err);
  }
}

const CSC_KNOWLEDGE_BASE_SYSTEM_PROMPT = `You are the official 24/7 AI WhatsApp assistant for Coimbatore Startup Community (CSC Circle), powered by Logic Intelligence Technologies (LIT).

### Community Overview & Ethos:
- Coimbatore Startup Community (CSC Circle) is Coimbatore's premier startup ecosystem, connecting founders, developers, designers, operators, and angel investors across the Kongu region.
- Motto: Connect • Build • Grow.
- Website: https://csc.logicintelligencetechnologies.in

### Core Leadership Team:
- K. N. Reyash: Founder, Coimbatore Startup Community (Belvoria)
- E. R. Sharan: Co-Founder, Coimbatore Startup Community (Founder, CECIL Groups of Companies & Industries)
- Mirra Mahendran: Chief Executive Officer (CEO), Coimbatore Startup Community
- Vikash Saravanan: Chief Technology Officer (CTO) & Head of Tech — Founder & CEO, Logic Intelligence Technologies (LIT)
- Swathi: Chief Community Officer (CCO), Coimbatore Startup Community
- Kishore C: Chief Operating Officer (COO), Coimbatore Startup Community (Founder, APARÈ Clothing)
- Jaibharath V: Chief Brand Officer (CBO), Coimbatore Startup Community (Founder, Flickkora Agency)
- Technical Architecture & Infrastructure Partner: Logic Intelligence Technologies (LIT)

### Core Offerings & Direct Links:
1. Lifelong Free Membership:
   - 100% Free with automated 5-minute approval.
   - Join: https://csc.logicintelligencetechnologies.in/membership
2. Offline Events & Masterclasses:
   - Regular offline founder mixers, pitch battles, workshops, and networking dinners in Coimbatore.
   - RSVP & Passes: https://csc.logicintelligencetechnologies.in/events
3. Digital Membership Pass:
   - Apple Wallet & Google Wallet compatible pass with dynamic QR door entry code.
   - Pass Link: https://csc.logicintelligencetechnologies.in/profile/id-card
4. Founder Directory & Matchmaking:
   - Search Coimbatore startups & co-founders in AI, SaaS, Agritech, EV, Fintech.
   - Directory: https://csc.logicintelligencetechnologies.in/directory
5. Community Feedback & Ideas:
   - Suggest topics, speakers, or pitch opportunities: /idea <your idea>
6. Official Community WhatsApp Network:
   - Direct Group: https://chat.whatsapp.com/H3Nbi9oKWBcEmPQop0B5X3
7. Human Support & Helpdesk:
   - Email: csc@logicintelligencetechnologies.in
   - Helpline: +91 75500 67712

### Legal, Security & Privacy:
- DPDP Act 2023 compliant.
- Row-Level Security (RLS) protects all user data.
- Built-in anti-scraping and honeypots protect founder phone numbers and emails.

### Guidelines for Responses:
- Answer warmly, concisely, and accurately in 2-4 sentences suitable for WhatsApp messaging.
- If asked in Tamil or Tanglish, reply in the same language.
- Mention relevant portal links and suggest typing /menu for instant navigation options.`;

async function answerWithCommunityAI(userPrompt: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  const grokKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

  // 1. Try Groq AI (Llama 3.3 70B)
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: CSC_KNOWLEDGE_BASE_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 350,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply && reply.trim()) return reply.trim();
      }
    } catch (groqErr) {
      console.warn("[answerWithCommunityAI] Groq attempt warning:", groqErr);
    }
  }

  // 2. Try Modal AI Direct Endpoint ($100 Inference Server: Muse-Spark-Open-816B-A42B)
  const modalBaseUrl = (
    process.env.MODAL_AI_ENDPOINT ||
    "https://createwithvikash--ep-muse-spark-open-816b-a42b-server.us-west.modal.direct"
  ).trim().replace(/\/+$/, "");
  const modalToken =
    process.env.MODAL_PROXY_TOKEN ||
    "wk-b1DTWrd3OBJhle19ldoPF8.ws-wznhluHnVPZ4DvGmDGiBQP";

  if (modalBaseUrl) {
    try {
      const modalUrl = `${modalBaseUrl}/v1/chat/completions`;
      const modalHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (modalToken) {
        modalHeaders["Authorization"] = `Bearer ${modalToken}`;
        if (modalToken.includes(".")) {
          const [k, s] = modalToken.split(".");
          modalHeaders["Modal-Key"] = k;
          modalHeaders["Modal-Secret"] = s;
        }
      }

      const res = await fetch(modalUrl, {
        method: "POST",
        headers: modalHeaders,
        body: JSON.stringify({
          model: "meta-models/Muse-Spark-Open-816B-A42B",
          messages: [
            { role: "system", content: CSC_KNOWLEDGE_BASE_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 350,
        }),
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const data = await res.json();
        const reply =
          data?.choices?.[0]?.message?.content ||
          data?.text ||
          data?.output ||
          data?.response;
        if (reply && typeof reply === "string" && reply.trim()) {
          return reply.trim();
        }
      }
    } catch (modalErr) {
      console.warn("[answerWithCommunityAI] Modal direct endpoint warning:", modalErr);
    }
  }

  // 3. Try xAI Grok (Musk API: grok-2-latest)
  if (grokKey) {
    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${grokKey}`,
        },
        body: JSON.stringify({
          model: "grok-2-latest",
          messages: [
            { role: "system", content: CSC_KNOWLEDGE_BASE_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 350,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply && reply.trim()) return reply.trim();
      }
    } catch (grokErr) {
      console.warn("[answerWithCommunityAI] xAI Grok attempt warning:", grokErr);
    }
  }

  // 4. Graceful Contextual Knowledge Engine Fallback (No External API Required)
  const lower = userPrompt.toLowerCase();
  const isTa = /[\u0B80-\u0BFF]/.test(userPrompt);

  if (/cto|head of tech|tech lead|vikash/i.test(lower)) {
    return isTa
      ? "கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டியின் தலைமை தொழில்நுட்ப அதிகாரி (CTO) மற்றும் தொழில்நுட்பத் தலைவர் *விகாஷ் சரவணன்* (Vikash Saravanan). தொழில்நுட்ப கூட்டாண்மை: Logic Intelligence Technologies (LIT)."
      : "*Vikash Saravanan* is the Chief Technology Officer (CTO) & Head of Tech for Coimbatore Startup Community (CSC Circle) and Founder & CEO of Logic Intelligence Technologies (LIT).";
  }

  if (/ceo|chief executive/i.test(lower)) {
    return isTa
      ? "கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டியின் தலைமை நிர்வாக அதிகாரி (CEO) *மிர்ரா மகேந்திரன்* (Mirra Mahendran) ஆவார்."
      : "*Mirra Mahendran* is the Chief Executive Officer (CEO) of Coimbatore Startup Community (CSC Circle).";
  }

  if (/founder|co-founder|reyash|sharan|who started/i.test(lower)) {
    return isTa
      ? "CSC Circle அமைப்பின் நிறுவனர் *K. N. ரேயாஷ்* (K. N. Reyash) மற்றும் இணை நிறுவனர் *E. R. சரண்* (E. R. Sharan) ஆவர்."
      : "Coimbatore Startup Community was founded by *K. N. Reyash* (Founder, Belvoria) and *E. R. Sharan* (Co-Founder, Founder of CECIL Groups).";
  }

  if (/cco|community officer|community lead|swathi/i.test(lower)) {
    return isTa
      ? "கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டியின் தலைமை சமூக அதிகாரி (Chief Community Officer - CCO) *சுவாதி* (Swathi) ஆவார்."
      : "*Swathi* is the Chief Community Officer (CCO) of Coimbatore Startup Community (CSC Circle).";
  }

  if (/coo|operating officer|operations lead|kishore/i.test(lower)) {
    return isTa
      ? "கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டியின் தலைமை செயல்பாட்டு அதிகாரி (Chief Operating Officer - COO) *கிஷோர் சி* (Kishore C) ஆவார். இவர் APARÈ Clothing நிறுவனத்தின் நிறுவனர்."
      : "*Kishore C* is the Chief Operating Officer (COO) of Coimbatore Startup Community (CSC Circle) and Founder of APARÈ Clothing.";
  }

  if (/cbo|brand officer|brand lead|branding|jaibharath|jai bharath/i.test(lower)) {
    return isTa
      ? "கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டியின் தலைமை பிராண்ட் அதிகாரி (Chief Brand Officer - CBO) *ஜெய்பரத் வி* (Jaibharath V) ஆவார். இவர் Flickkora Agency நிறுவனத்தின் நிறுவனர்."
      : "*Jaibharath V* is the Chief Brand Officer (CBO) of Coimbatore Startup Community (CSC Circle) and Founder of Flickkora Agency.";
  }

  if (/membership|free|join|cost|fees|fee/i.test(lower)) {
    return isTa
      ? "CSC Circle உறுப்பினர் சேர்க்கை 100% முற்றிலும் இலவசம்! 5 நிமிடங்களில் தானியங்கி ஒப்புதல் பெற இணையுங்கள்: https://csc.logicintelligencetechnologies.in/membership"
      : "Membership in CSC Circle is 100% free with automated 5-minute approval! Join here: https://csc.logicintelligencetechnologies.in/membership";
  }

  if (/event|meetup|masterclass|pitch/i.test(lower)) {
    return isTa
      ? "கோவையின் அடுத்த ஆஃப்லைன் பவுண்டர் மீட்டிங் & மாஸ்டர்கிளாஸ் விவரங்களை அறிய: https://csc.logicintelligencetechnologies.in/events அல்லது */events* என அனுப்பவும்."
      : "Explore upcoming offline founder meetups and masterclasses in Coimbatore at: https://csc.logicintelligencetechnologies.in/events or reply */events*.";
  }

  if (/pass|ticket|card|qr/i.test(lower)) {
    return isTa
      ? "உங்கள் டிஜிட்டல் உறுப்பினர் அட்டை மற்றும் நிகழ்வு நுழைவு QR கோட் பெற: https://csc.logicintelligencetechnologies.in/profile/id-card அல்லது */pass* என அனுப்பவும்."
      : "Access your digital membership card & event QR gate pass at: https://csc.logicintelligencetechnologies.in/profile/id-card or reply */pass*.";
  }

  if (isTa) {
    return "வணக்கம்! கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டிக்கு வரவேற்கிறோம். உடனடி வழிகாட்டுதலுக்கு */menu* அல்லது கட்டளைகளுக்கு */help* என அனுப்பவும்.";
  }
  return "Welcome to Coimbatore Startup Community (CSC Circle)! Reply */menu* for our quick options or */help* for all slash commands.";
}
