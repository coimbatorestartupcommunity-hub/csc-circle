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
  const lower = trimmed.toLowerCase();

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
  const isGreeting = /^(hi|hello|hey|வணக்கம்|vanakkam)$/i.test(trimmed);
  const isMenu = /^(menu|start|help|options|\?)$/i.test(trimmed) || lower === "0";

  if (isGreeting || isMenu) {
    const isTamil = /[\u0B80-\u0BFF]/.test(trimmed) || /vanakkam/i.test(trimmed);

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
          "1️⃣ *நிகழ்வுகள்* (பதில்: *1* அல்லது *EVENTS*)",
          "   அடுத்த ஆஃப்லைன் பவுண்டர் மீட்டிங் & மாஸ்டர்கிளாஸ் விவரங்கள்.",
          "",
          "2️⃣ *டிஜிட்டல் அடையாள அட்டை* (பதில்: *2* அல்லது *PASS*)",
          "   உறுப்பினர் கார்டு மற்றும் நிகழ்வு நுழைவு QR கோட்.",
          "",
          "3️⃣ *தொழில்முனைவோர் இணைப்பு* (பதில்: *3* அல்லது *MATCH <துறை>*)",
          "   கோவையின் ஸ்டார்ட்அப்கள் & இணை-நிறுவனர்கள் நெட்வொர்க்.",
          "",
          "4️⃣ *யோசனைகள் & தலைப்புகள்* (பதில்: *4* அல்லது *IDEA <யோசனை>*)",
          "   அடுத்த நிகழ்வுக்கான தலைப்புகள் (தலைமைக் குழுவுக்குச் செல்லும்).",
          "",
          "5️⃣ *அதிகாரப்பூர்வ வாட்ஸ்அப் குழு* (பதில்: *5* அல்லது *COMMUNITY*)",
          "   தலைமைக் குழு மற்றும் பவுண்டர்கள் குழுவில் இணைய.",
          "",
          "6️⃣ *நிர்வாகிகள் உதவி* (பதில்: *6* அல்லது *SUPPORT*)",
          "   ஒருங்கிணைப்பாளர்களுடன் நேரடியாகப் பேச.",
          "",
          CSC_WHATSAPP_FOOTER,
        ].join("\n")
      : [
          "🌟 *COIMBATORE STARTUP COMMUNITY*",
          "🚀 *CSC Circle — Official Quick Navigation*",
          "",
          "Welcome! Reply with a number or keyword below for instant assistance:",
          "",
          "1️⃣ *Upcoming Events* (Reply: *1* or *EVENTS*)",
          "   Explore upcoming offline founder meetups & masterclasses.",
          "",
          "2️⃣ *Digital ID & Event Passes* (Reply: *2* or *PASS*)",
          "   Retrieve your official membership card & QR door entry pass.",
          "",
          "3️⃣ *Founder Matchmaking* (Reply: *3* or *MATCH <domain>*)",
          "   Connect with local founders & co-founders (e.g. *MATCH AI*, *MATCH SAAS*).",
          "",
          "4️⃣ *Suggest Meetup Topic* (Reply: *4* or *IDEA <your idea>*)",
          "   Submit ideas directly to our 7-member Core Leadership Team.",
          "",
          "5️⃣ *Join Community Group* (Reply: *5* or *COMMUNITY*)",
          "   Join the verified leadership WhatsApp network.",
          "",
          "6️⃣ *Talk to Human Support* (Reply: *6* or *SUPPORT*)",
          "   Escalate directly to our organizing team.",
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

  // 3. Digital Gate Pass & Membership Card Lookup
  if (/^(pass|ticket|my pass|2)$/i.test(trimmed)) {
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

  // 4. Upcoming Events
  if (/^(events|event|1)$/i.test(trimmed)) {
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

  // 5. Idea & Community Feedback Collector
  if (/^idea/i.test(trimmed) || trimmed === "4") {
    const ideaContent = trimmed.replace(/^idea\s*/i, "").trim();

    if (!ideaContent || trimmed === "4") {
      const replyText = [
        "💡 *Suggest a Meetup Topic or Speaker*",
        "",
        "Please reply in this format:",
        "*IDEA <your topic or speaker suggestion>*",
        "",
        "Example: _IDEA Masterclass on B2B SaaS pricing from Coimbatore_",
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

  // 6. Community Group Link
  if (/^(community|group|whatsapp group|link|5)$/i.test(trimmed)) {
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

  // 7. Founder Matchmaking
  if (/^match/i.test(trimmed) || trimmed === "3") {
    const domain = trimmed.replace(/^match\s*/i, "").trim();

    if (!domain || trimmed === "3") {
      const replyText = [
        "🤝 *CSC Founder & Co-Founder Matchmaking*",
        "",
        "Search local founders and startups by industry or tech stack:",
        "*MATCH <sector or keyword>*",
        "",
        "Examples:",
        "• *MATCH AI*",
        "• *MATCH SaaS*",
        "• *MATCH Agritech*",
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
      "Looking for a specific introduction? Reply *SUPPORT* to connect with our organizers.",
      "",
      CSC_WHATSAPP_FOOTER,
    ].join("\n");

    await sendReplySafely(cleanPhone, replyText);
    return { handled: true, replyText, command: "MATCH_SEARCH" };
  }

  // 8. Fortnightly Sunday Community Pulse
  if (/^pulse$/i.test(trimmed)) {
    const isTa = /[\u0B80-\u0BFF]/.test(trimmed);
    const replyText = formatBiWeeklyCommunityPulse(isTa ? "ta" : "en");
    await sendReplySafely(cleanPhone, replyText);
    return { handled: true, replyText, command: "PULSE" };
  }

  // 9. Organizer / Human Support
  if (/^(support|human|admin|helpdesk|contact|6)$/i.test(trimmed)) {
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

  // 10. General AI Query Resolution (Groq AI)
  const aiReply = await answerWithGroqAI(trimmed);
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

async function answerWithGroqAI(userPrompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
  if (!apiKey) {
    const isTa = /[\u0B80-\u0BFF]/.test(userPrompt);
    if (isTa) {
      return "வணக்கம்! கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டிக்கு வரவேற்கிறோம். உடனடி வழிகாட்டுதலுக்கு *MENU* அல்லது *PASS* என்று பதில் அனுப்பவும்.";
    }
    return "Welcome to Coimbatore Startup Community (CSC Circle)! Reply *MENU* for our quick options or *PASS* to view your digital membership pass.";
  }

  const systemPrompt = `You are the official 24/7 AI WhatsApp assistant for Coimbatore Startup Community (CSC Circle), powered by Logic Intelligence Technologies (LIT).
Core Leadership Team:
- K. N. Reyash: Founder
- E. R. Sharan: Co-Founder
- Mirra Mahendran: Chief Executive Officer (CEO)
- Vikash Saravanan: Chief Technology Officer (CTO) & Head of Tech at Logic Intelligence Technologies
- Yuvraj: Design Lead
- Jeya Krishna: Operations Lead
- Ashif: Community Manager
- Technical Partner: Logic Intelligence Technologies (LIT)

Guidelines:
- Answer concisely, politely, and warmly.
- Keep answers under 3-4 sentences suitable for WhatsApp messaging.
- If asked in Tamil or Tanglish, reply in the same language.
- Always guide founders to explore events (https://csc.logicintelligencetechnologies.in/events) or digital pass (https://csc.logicintelligencetechnologies.in/profile/id-card).`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content;
      if (reply) return reply.trim();
    }
  } catch {
    // Fallback to contextual response
  }

  // Graceful contextual fallback if LLM is unavailable
  const isTa = /[\u0B80-\u0BFF]/.test(userPrompt);
  if (isTa) {
    return "வணக்கம்! கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டிக்கு வரவேற்கிறோம். உடனடி வழிகாட்டுதலுக்கு *MENU* அல்லது *PASS* என்று பதில் அனுப்பவும்.";
  }
  return "Welcome to Coimbatore Startup Community (CSC Circle)! Reply *MENU* for our quick options or *PASS* to view your digital membership pass.";
}
