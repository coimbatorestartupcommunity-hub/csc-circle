import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBiWeeklyCommunityPulse, CSC_WHATSAPP_FOOTER } from "@/lib/services/community-pulse";
import { dispatchTeamWhatsAppAlert } from "@/lib/services/team-alerts";
import { sendMsg91WhatsAppTextMessage } from "@/lib/services/msg91";
import { formatForWhatsApp } from "@/lib/notifications/whatsapp-outbox";

export type SupportedLanguage = "en" | "ta" | "tanglish";

/**
 * Detects whether the user is typing in Pure Tamil script, Tanglish, or English.
 */
export function detectLanguage(text: string): SupportedLanguage {
  if (!text) return "en";

  // 1. Pure Tamil script Unicode range
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return "ta";
  }

  // 2. Tanglish markers (Tamil phrases/words written in Latin script)
  const tanglishRegex =
    /\b(vanakkam|epdi|eppadi|irukinga|irukenga|irukku|iruku|yenna|enna|ethu|edhu|solunga|solla|pannunga|panna|pannalam|vanga|vaanga|nanba|nanbare|macha|machan|bro|seri|sari|thala|theriyuma|theriyum|illai|illa|ila|eppo|enga|engalukku|ungalukku|namma|nalla|nallaa|super-a|semma|pathu|pathi|paathu|kudunga|kudukanum|varum|varuma|aachu|aagum|aaguma|pesanum|pesalaam|puriyala|puriyudhu|venum|vendaam|kooda|mattum|aarambikalam|epdiyavadhu|kekkura|kekren|thambi|akka|anna)\b/i;

  if (tanglishRegex.test(text)) {
    return "tanglish";
  }

  return "en";
}

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
  const lang = detectLanguage(trimmed || cmd);

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
  const isGreeting =
    (/^(hi|hello|hey|vanakkam|hai|hoi)\b/i.test(cmd) || /^(வணக்கம்)/u.test(cmd)) &&
    cmd.split(/\s+/).length <= 3;
  const isMenu = /^(menu|start|options|select)$/i.test(cmd) || lower === "0";

  if (isGreeting || isMenu) {
    // If it's a greeting ("hi", "hello", "hey", etc.), send the warm Welcome Message FIRST
    if (isGreeting) {
      const welcomeText =
        lang === "ta"
          ? [
              "👋 *கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டிக்கு அன்புடன் வரவேற்கிறோம்!*",
              "",
              "வணக்கம்! கோவையின் முன்னணி தொழில்முனைவோர் & பில்டர்கள் நெட்வொர்க்கான *CSC Circle*-க்கு உங்களை அன்புடன் வரவேற்கிறோம் 🚀",
              "",
              "இணை-நிறுவனர்களைக் கண்டறிய, வரவிருக்கும் நிகழ்வுகளை அறிய, உங்கள் டிஜிட்டல் உறுப்பினர் அடையாள அட்டையைப் பெற அல்லது யோசனைகளைப் பகிர — நாங்கள் உங்களுக்கு உதவத் தயாராக உள்ளோம்.",
              "",
              CSC_WHATSAPP_FOOTER,
            ].join("\n")
          : lang === "tanglish"
          ? [
              "👋 *Coimbatore Startup Community-ku Anbana Varaverpu!*",
              "",
              "Vanakkam! Kovaiyin leading founder & builder network-aana *CSC Circle*-ku ungalai anbodu varaverkirom 🚀",
              "",
              "Co-founders-ah meet panna, upcoming offline meetups therinjukka, digital membership pass eduka, illa namma core leadership team kooda ideas share panna — ungalukku help panna naanga 24/7 ready!",
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
      // Wait 600ms so MSG91 & WhatsApp strictly deliver Message 1 (Welcome) before Message 2 (Menu)
      await new Promise((r) => setTimeout(r, 600));
    }

    const navigationMenuText =
      lang === "ta"
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
            "7️⃣ *கம்யூனிட்டி & குழு வழிகாட்டுதல்கள்* (பதில்: *7* அல்லது */rules*)",
            "   அதிகாரப்பூர்வ வாட்ஸ்அப் குழு விதிகள் & நடத்தை நெறிமுறைகள்.",
            "",
            "ℹ️ *கட்டளைகள் வழிகாட்டி:* */help* என அனுப்பவும்.",
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n")
        : lang === "tanglish"
        ? [
            "🌟 *COIMBATORE STARTUP COMMUNITY*",
            "🚀 *CSC Circle — Official Quick Navigation*",
            "",
            "Vanakkam! Instant updates & options therinjuka keela irukkura number illa command-ah reply pannunga:",
            "",
            "1️⃣ *Upcoming Events* (Reply: *1* or */events*)",
            "   Next offline founder meetups & masterclasses details.",
            "",
            "2️⃣ *Digital ID & Event Passes* (Reply: *2* or */pass*)",
            "   Unga verified membership card & QR door entry pass.",
            "",
            "3️⃣ *Founder Matchmaking* (Reply: *3* or */match <domain>*)",
            "   Kovai founders & co-founders kooda connect panna (/match AI, /match SaaS).",
            "",
            "4️⃣ *Suggest Meetup Topic* (Reply: *4* or */idea <idea>*)",
            "   Next meetup-ku topic suggest panna (Core leadership group-ku direct-a pogum).",
            "",
            "5️⃣ *Join Community Group* (Reply: *5* or */community*)",
            "   Verified leadership WhatsApp network-la join panna.",
            "",
            "6️⃣ *Talk to Human Support* (Reply: *6* or */support*)",
            "   Organizers kooda direct-a connect panna.",
            "",
            "7️⃣ *Community & Group Guidelines* (Reply: *7* or */rules*)",
            "   Official WhatsApp group rules & moderation policy.",
            "",
            "ℹ️ *Slash Commands Guide:* Type */help* anytime.",
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
            "7️⃣ *Community & Group Guidelines* (Reply: *7* or */rules*)",
            "   Review official WhatsApp group rules & code of conduct.",
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
    const replyText =
      lang === "ta"
        ? [
            "📋 *CSC Circle அதிகாரப்பூர்வ கட்டளைகள் வழிகாட்டி*",
            "",
            "நீங்கள் எப்போது வேண்டுமானாலும் இந்த எண்கள் அல்லது கட்டளைகளை அனுப்பலாம்:",
            "",
            "• *1* அல்லது */events* — வரவிருக்கும் நிகழ்வுகள் & மாஸ்டர்கிளாஸ்",
            "• *2* அல்லது */pass* — டிஜிட்டல் அடையாள அட்டை & QR பாஸ்",
            "• *3* அல்லது */match <துறை>* — தொழில்முனைவோர் இணைப்பு",
            "• *4* அல்லது */idea <யோசனை>* — தலைப்புகள் அல்லது பேச்சாளர் பரிந்துரை",
            "• *5* அல்லது */community* — அதிகாரப்பூர்வ வாட்ஸ்அப் குழு",
            "• *6* அல்லது */support* — நிர்வாகிகள் உதவி",
            "• *7* அல்லது */rules* — கம்யூனிட்டி & வாட்ஸ்அப் குழு வழிகாட்டுதல்கள்",
            "• */menu* — முதன்மை விரைவு வழிகாட்டி",
            "• */pulse* — இருவார கம்யூனிட்டி செக்-இன்",
            "• */help* — கட்டளைகள் வழிகாட்டி",
            "",
            "💡 *கேள்விகள் கேட்கலாம்:* எங்கள் கம்யூனிட்டி, தலைமை குழு அல்லது நிகழ்வுகள் பற்றி எதையும் நீங்கள் கேட்கலாம்!",
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n")
        : lang === "tanglish"
        ? [
            "📋 *CSC Circle Official Commands Guide*",
            "",
            "Endha number, keyword, illa slash command venumnalum send pannalam:",
            "",
            "• *1* or */events* — Upcoming Founder Meetups & Masterclasses",
            "• *2* or */pass* — Digital Membership Card & QR Gate Pass",
            "• *3* or */match <domain>* — Founder & Co-Founder Matchmaking",
            "• *4* or */idea <topic>* — Submit Meetup Topic / Speaker Idea",
            "• *5* or */community* — Official Leadership WhatsApp Group",
            "• *6* or */support* — Connect with Community Organizers",
            "• *7* or */rules* — Community & WhatsApp Group Guidelines",
            "• */menu* — Main Navigation Menu",
            "• */pulse* — Fortnightly Ecosystem Pulse",
            "• */help* — Indha Guide-ah paaka",
            "",
            "💡 *Ask Me Anything:* Namma CSC community, events, membership, or leadership team pathi enna question venumnalum natural-a kekaலாம்!",
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n")
        : [
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
            "• *7* or */rules* — Community & WhatsApp Group Guidelines",
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
    const replyText =
      lang === "ta"
        ? [
            "🎟️ *CSC Circle — டிஜிட்டல் அடையாள அட்டை & நுழைவு பாஸ்*",
            "",
            "உங்கள் சரிபார்க்கப்பட்ட உறுப்பினர் கார்டு மற்றும் நிகழ்வு நுழைவு பாஸை பெற:",
            `👉 ${passLink}`,
            "",
            "• Apple Wallet அல்லது Google Wallet-ல் ஒரே கிளிக்கில் சேமிக்கலாம்.",
            "• அரங்க நுழைவாயிலில் உங்கள் டைனமிக் QR குறியீட்டைக் காட்டி உடனடியாக நுழையலாம்.",
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n")
        : lang === "tanglish"
        ? [
            "🎟️ *CSC Circle — Digital ID & Event Passes*",
            "",
            "Unga verified membership card & dynamic QR entry pass-ah inga access pannunga:",
            `👉 ${passLink}`,
            "",
            "• 1-tap-la Apple Wallet or Google Wallet-ku save pannikalam.",
            "• Registration gate-la dynamic QR code kaati instant entry eduthukalam.",
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n")
        : [
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
    const replyText =
      lang === "ta"
        ? [
            "📅 *வரவிருக்கும் CSC கம்யூனிட்டி நிகழ்வுகள்*",
            "",
            "கோயம்புத்தூரில் அடுத்த பவுண்டர் மீட்டிங் & மாஸ்டர்கிளாஸ் விவரங்களை அறிய:",
            `👉 ${eventsLink}`,
            "",
            "• உறுப்பினர்கள் உடனடி 1-கிளிக் RSVP மற்றும் டிஜிட்டல் நுழைவு பாஸ் பெறலாம்.",
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n")
        : lang === "tanglish"
        ? [
            "📅 *Upcoming CSC Community Events*",
            "",
            "Kovai-la nadaka irukura founder mixers, pitch battles & masterclass details inga paarkalam:",
            `👉 ${eventsLink}`,
            "",
            "• Active members-ku instant 1-click RSVP & digital gate pass kedaikum.",
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n")
        : [
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
      const replyText =
        lang === "ta"
          ? [
              "💡 *மீட்டப் தலைப்பு அல்லது பேச்சாளரை பரிந்துரைக்க*",
              "",
              "தயவுசெய்து இந்த வடிவில் அனுப்பவும்:",
              "*/idea <உங்கள் யோசனை அல்லது தலைப்பு>*",
              "",
              "உதாரணம்: _/idea கோவையில் B2B SaaS விலை நிர்ணயம் பற்றிய மாஸ்டர்கிளாஸ்_",
              "",
              "உங்கள் பரிந்துரை நேரடியாக எங்களின் 7 பேர் கொண்ட தலைமைக் குழுவுக்குச் செல்லும்!",
              "",
              CSC_WHATSAPP_FOOTER,
            ].join("\n")
          : lang === "tanglish"
          ? [
              "💡 *Suggest a Meetup Topic or Speaker*",
              "",
              "Indha format-la reply pannunga:",
              "*/idea <unga topic or speaker suggestion>*",
              "",
              "Example: _/idea B2B SaaS pricing strategy masterclass in Kovai_",
              "",
              "Unga idea direct-a namma 7-member Core Leadership Team-ku pogum!",
              "",
              CSC_WHATSAPP_FOOTER,
            ].join("\n")
          : [
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

    // Alert the 7-member Core Leadership Team WhatsApp Group & Admin Phones
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

    const replyText =
      lang === "ta"
        ? [
            `💡 *எங்கள் சுற்றுச்சூழல் அமைப்பை வடிவமைக்க உதவியதற்கு நன்றி!* (குறிப்பு: *${ideaRef}*)`,
            "",
            `உங்கள் யோசனை எங்கள் தலைமைக் குழுவுக்கு அனுப்பப்பட்டுள்ளது:`,
            `_"${ideaContent}"_`,
            "",
            "அடுத்த நிகழ்வுகளை வடிவமைக்கும்போது எங்கள் குழு இதை மதிப்பாய்வு செய்யும்.",
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n")
        : lang === "tanglish"
        ? [
            `💡 *Thank You for Shaping Our Ecosystem!* (Ref: *${ideaRef}*)`,
            "",
            `Unga idea capture aagi direct-a namma Core Leadership Team-ku routed aagiduchu:`,
            `_"${ideaContent}"_`,
            "",
            "Next offline meetups plan pannumbodhu namma team unga idea-va review pannuvanga.",
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n")
        : [
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
    const replyText =
      lang === "ta"
        ? [
            "👥 *அதிகாரப்பூர்வ CSC தலைமை & சமூக வாட்ஸ்அப் குழு*",
            "",
            "வாட்ஸ்அப்பில் எங்கள் சரிபார்க்கப்பட்ட சமூக நெட்வொர்க்கில் இணையுங்கள்:",
            "👉 https://chat.whatsapp.com/H3Nbi9oKWBcEmPQop0B5X3",
            "",
            "கோவை முழுவதும் உள்ள தொழில்முனைவோர், முதலீட்டாளர்கள் மற்றும் தலைமைக் குழுவுடன் இணையுங்கள்!",
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n")
        : lang === "tanglish"
        ? [
            "👥 *Official CSC Leadership & Community Group*",
            "",
            "Namma verified WhatsApp community network-la join pannunga:",
            "👉 https://chat.whatsapp.com/H3Nbi9oKWBcEmPQop0B5X3",
            "",
            "Kovai founders, angel investors, and core team kooda direct-a connect aagunga!",
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n")
        : [
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
      const replyText =
        lang === "ta"
          ? [
              "🤝 *CSC தொழில்முனைவோர் & இணை-நிறுவனர் இணைப்பு*",
              "",
              "தொழில் அல்லது தொழில்நுட்பம் மூலம் உள்ளூர் நிறுவனர்களைத் தேடுங்கள்:",
              "*/match <துறை அல்லது முக்கிய சொல்>*",
              "",
              "உதாரணங்கள்: */match AI*, */match SaaS*, */match Agritech*",
              "",
              CSC_WHATSAPP_FOOTER,
            ].join("\n")
          : lang === "tanglish"
          ? [
              "🤝 *CSC Founder & Co-Founder Matchmaking*",
              "",
              "Industry or tech stack moolama local founders & startups-ah thedunga:",
              "*/match <sector or keyword>*",
              "",
              "Examples: */match AI*, */match SaaS*, */match Agritech*",
              "",
              CSC_WHATSAPP_FOOTER,
            ].join("\n")
          : [
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
    const replyText =
      lang === "ta"
        ? [
            `🔍 *"${domain.toUpperCase()}" துறையில் உள்ள நிறுவனர்கள்*`,
            "",
            `*${domain}* துறையில் செயல்படும் கோவை நிறுவனங்களை அறிய:`,
            `👉 ${directoryLink}`,
            "",
            "ஒரு குறிப்பிட்ட அறிமுகம் தேவையா? எங்கள் அமைப்பாளர்களைத் தொடர்பு கொள்ள */support* எனப் பதிலளிக்கவும்.",
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n")
        : lang === "tanglish"
        ? [
            `🔍 *Founders Matching "${domain.toUpperCase()}"*`,
            "",
            `*${domain}* domain-la Kovai founders and startups explore panna:`,
            `👉 ${directoryLink}`,
            "",
            "Specific introduction venuma? Namma organizers kooda pesa */support* reply pannunga.",
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n")
        : [
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
    const replyText = formatBiWeeklyCommunityPulse(lang);
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

    const replyText =
      lang === "ta"
        ? [
            "📞 *CSC ஒருங்கிணைப்பாளர் உதவி*",
            "",
            "நீங்கள் ஒருங்கிணைப்பாளரைத் தொடர்பு கொள்ள விரும்புவதாக எங்கள் குழுவிற்கு தகவல் அனுப்பியுள்ளோம்.",
            "",
            "• நேரடி தொடர்பு: csc@logicintelligencetechnologies.in",
            "• தொலைபேசி: +91 75500 67712",
            "",
            "எங்கள் ஒருங்கிணைப்பாளர் விரைவில் உங்களைத் தொடர்புகொள்வார்!",
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n")
        : lang === "tanglish"
        ? [
            "📞 *CSC Organizer Support Escalate*",
            "",
            "Neenga organizer kooda connect panna virumbura request-ah namma organizing team-ku alert pannitom.",
            "",
            "• Direct Contact: csc@logicintelligencetechnologies.in",
            "• Phone: +91 75500 67712",
            "",
            "Namma organizing team organizer ungalai seekirama reach out pannuvanga!",
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n")
        : [
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

  // 11. Official Community & WhatsApp Group Guidelines
  if (/^(guidelines|rules|code of conduct|group rules|community guidelines|7)$/i.test(cmd)) {
    const guidelinesUrl = "https://csc.logicintelligencetechnologies.in/community-guidelines";
    const replyText =
      lang === "ta"
        ? [
            "📜 *CSC Circle — அதிகாரப்பூர்வ வாட்ஸ்அப் குழு & கம்யூனிட்டி வழிகாட்டுதல்கள்*",
            "✨ *Connect • Build • Grow — உயர்தர பயனுள்ள தகவல் பரிமாற்றம்*",
            "",
            "கோவை பவுண்டர்கள், டெவலப்பர்கள் மற்றும் முதலீட்டாளர்களுக்கான நம்பகமான தளமாக இதைத் தக்கவைக்க, அனைத்து உறுப்பினர்களும் இந்த நெறிமுறைகளைப் பின்பற்ற வேண்டும்:",
            "",
            "✅ *அனுமதிக்கப்பட்டவை & வரவேற்கப்படுபவை:*",
            "• *உறுப்பினர் அறிமுகம்:* குழுவில் இணைந்தவுடன் உங்கள் பெயர், ஸ்டார்ட்அப்/யோசனை மற்றும் நீங்கள் தீர்க்கும் பிரச்சனை பற்றி பகிரவும்.",
            "• *தயாரிப்பு முன்னேற்றம்:* உங்கள் தயாரிப்பு வெளியீடுகள், UI/UX மற்றும் தொழில்நுட்ப முன்னேற்றங்களை பகிர்ந்து சக நிறுவனர்களின் கருத்தைப் பெறவும்.",
            "• *நிகழ்வுகள் & வாய்ப்புகள்:* உண்மையான ஸ்டார்ட்அப் மீட்டிங், ஹேக்கத்தான் மற்றும் அரசு மானியங்கள் (TANSEED, SISFS).",
            "• *ஆலோசனை & கலந்துரையாடல்:* தயாரிப்பு சந்தை பொருத்தம் (PMF), நிதி திரட்டல் மற்றும் குழு அமைப்பது குறித்த விவாதங்கள்.",
            "",
            "❌ *கண்டிப்பாக தடைசெய்யப்பட்டவை:*",
            "• 🚫 *நேரடி விற்பனை விளம்பரங்கள்:* வணிகரீதியான விளம்பரங்கள், தள்ளுபடி சலுகைகள் மற்றும் விற்பனை முயற்சிகள்.",
            "• 🚫 *தொடர்பற்ற குழு இணைப்புகள்:* அனுமதி பெறாத வாட்ஸ்அப்/டெலிகிராம் குழு இணைப்புகள் அல்லது அரசியல்/மத விவாதங்கள்.",
            "• 🚫 *அனுமதியின்றி தனிப்பட்ட மெசேஜ் (Cold DMs):* குழுவில் அனுமதி பெறாமல் சக உறுப்பினர்களுக்கு தனிப்பட்ட மெசேஜ் அனுப்புவது முற்றிலும் தடைசெய்யப்பட்டுள்ளது.",
            "• 🚫 *MLM / Crypto ஸ்பேம்:* கிரிப்டோ அல்லது உடனடி பணத் திட்டங்கள்.",
            "",
            "⚖️ *3-நிலை ஒழுங்குமுறை நடவடிக்கை:*",
            "1️⃣ *நிலை 1:* எழுத்துப்பூர்வ எச்சரிக்கை & மெசேஜ் நீக்கம்.",
            "2️⃣ *நிலை 2:* 30 நாட்கள் இடைநீக்கம் & நிகழ்வு பாஸ் ரத்து.",
            "3️⃣ *நிலை 3:* டிஜிட்டல் அடையாள அட்டை ரத்து & கம்யூனிட்டியிலிருந்து நிரந்தர நீக்கம்.",
            "",
            `🔗 முழு வழிகாட்டுதல்களையும் படிக்க: ${guidelinesUrl}`,
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n")
        : lang === "tanglish"
        ? [
            "📜 *CSC Circle — Official Community & WhatsApp Group Guidelines*",
            "✨ *Connect • Build • Grow — High Signal, Zero Noise*",
            "",
            "Kovai founders, builders & investors-ku oru high-trust ecosystem maintain panna, members indha rules strictly follow pannanum:",
            "",
            "✅ *ALLOWED & ENCOURAGED:*",
            "• *New Member Intro:* Join pannadhume unga name, startup/idea, solve panra problem & collaboration requirements share pannunga.",
            "• *Startup Showcases:* Product launches, traction updates & peer UI/UX feedback requests.",
            "• *Genuine Opportunities:* Verified startup meetups, pitch fests, hackathons & seed grants (TANSEED, SISFS).",
            "• *Tactical Discussions:* PMF, hiring, regulatory compliance & fundraising discussions.",
            "",
            "❌ *STRICTLY PROHIBITED:*",
            "• 🚫 *No Direct Sales Pitches:* No commercial flyers, discount coupons, or treating the group as a sales funnel.",
            "• 🚫 *No Unrelated Group Links:* Third-party WhatsApp/Telegram links, promotional invites, politics or religion strictly banned.",
            "• 🚫 *No Unsolicited Private DMs:* Group-la prior consent illama members-ku cold DMs pitch pannakudathu.",
            "• 🚫 *No MLM, Crypto, or Scams:* Zero tolerance for get-rich-quick schemes or crypto speculation.",
            "",
            "⚖️ *3-Stage Moderation Protocol:*",
            "1️⃣ *Stage 1:* Written warning & removal of offending post.",
            "2️⃣ *Stage 2:* 30-day suspension & temporary event pass revocation.",
            "3️⃣ *Stage 3:* Permanent Digital ID cancellation & ecosystem ban.",
            "",
            `🔗 Read Complete Guidelines: ${guidelinesUrl}`,
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n")
        : [
            "📜 *CSC Circle — Official Community & WhatsApp Group Guidelines*",
            "✨ *Connect • Build • Grow — High Signal, Zero Noise*",
            "",
            "To preserve an authentic, trusted, high-value ecosystem for Coimbatore founders, builders, and investors, all members adhere to our official code of conduct:",
            "",
            "✅ *ALLOWED & ENCOURAGED:*",
            "• *Member Introductions:* Share your name, current venture or concept stage, problem being solved, and collaboration needs.",
            "• *Startup Showcases:* Share progress, request authentic founder feedback, UI/UX audits, and beta testers.",
            "• *Ecosystem Opportunities:* Share verified startup meetups, pitch arenas, incubator calls, and government grant schemes (TANSEED, SISFS).",
            "• *Founder Discourse:* Tactical discussions on PMF, unit economics, fundraising, and regional policies.",
            "",
            "❌ *STRICTLY PROHIBITED:*",
            "• 🚫 *No Direct Advertising or Sales Pitches:* No commercial sales flyers, generic discounts, or using the group as a marketing funnel.",
            "• 🚫 *No Unrelated Group Links:* Third-party WhatsApp or Telegram links, speculative promotions, political/religious debates are deleted on sight.",
            "• 🚫 *No Unsolicited Private DMs:* Cold pitching or messaging members privately without prior public permission in the group is strictly forbidden.",
            "• 🚫 *No Multi-Level Marketing or Crypto Speculation:* Zero tolerance for fraudulent or speculative schemes.",
            "",
            "⚖️ *3-Stage Moderation Protocol:*",
            "1️⃣ *Stage 1:* Formal warning from moderators and deletion of offending material.",
            "2️⃣ *Stage 2:* 30-day suspension of member portal access and event pass revocation.",
            "3️⃣ *Stage 3:* Permanent cancellation of CSC Digital ID Card and irreversible ecosystem ban.",
            "",
            `🔗 Read Complete Community Guidelines: ${guidelinesUrl}`,
            "",
            CSC_WHATSAPP_FOOTER,
          ].join("\n");

    await sendReplySafely(cleanPhone, replyText);
    return { handled: true, replyText, command: "GUIDELINES" };
  }

  // 12. Deep Community AI Knowledge Hub (Groq AI + Modal + xAI Grok / Musk API)
  const aiReply = await answerWithCommunityAI(trimmed);
  const formattedAiReply = formatForWhatsApp(aiReply);
  const finalReply = formatForWhatsApp(`${formattedAiReply}\n\n${CSC_WHATSAPP_FOOTER}`);
  await sendReplySafely(cleanPhone, finalReply);
  return { handled: true, replyText: finalReply, command: "AI_REPLY" };
}

async function sendReplySafely(phone: string, text: string): Promise<void> {
  const cleanPhone = phone.replace(/\D/g, "");
  const formattedText = formatForWhatsApp(text);
  try {
    const res = await sendMsg91WhatsAppTextMessage({
      recipientPhone: cleanPhone,
      text: formattedText,
    });
    try {
      const admin = createAdminClient();
      await admin.from("whatsapp_message_outbox").insert({
        contact_id: "00000000-0000-0000-0000-000000000000",
        recipient_phone: cleanPhone,
        recipient_chat_id: `${cleanPhone}@c.us`,
        message_type: "inbound_ai_reply",
        message_payload: {
          text: formattedText,
          sentAt: new Date().toISOString(),
          gatewaySuccess: res.success,
          message: res.message,
        },
        status: res.success ? "delivered" : "failed",
        last_error_message: res.success ? null : (res.message || "Dispatch error"),
        idempotency_key: `reply-${cleanPhone}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      });
    } catch {}
  } catch (err) {
    console.error("[sendReplySafely] Failed to send via MSG91 API:", err);
  }
}

const CSC_KNOWLEDGE_BASE_SYSTEM_PROMPT = `You are the official 24/7 AI WhatsApp assistant for Coimbatore Startup Community (CSC Circle), powered by Logic Intelligence Technologies (LIT).

### Community Overview & Ethos:
- Coimbatore Startup Community (CSC Circle), established 2026, is Coimbatore and Western Tamil Nadu's premier founder-centric startup ecosystem.
- Tagline & Motto: Connect. Build. Grow.
- Official Website: https://csc.logicintelligencetechnologies.in
- Audience: Founders, Co-founders, Builders, Developers, Idea-stage Innovators, Investors, Angel Syndicates, and Mentors across Coimbatore and Western Tamil Nadu.

### 5 Official WhatsApp Ecosystem Groups (Bios & Scopes):
1. Group 1: CSC Announcements (Official Broadcast Channel)
   - Scope: Verified ecosystem updates, zero noise, high-signal, admin-only. Flagship summits, Startup TN / Startup India partnerships, regulatory alerts, pass rollouts.
2. Group 2: CSC Circle (Main Community Hub)
   - Scope: Peer networking, collaborative founder discussions, product showcases, UI/UX audits, problem-solving, founder matchmaking.
3. Group 3: CSC Mindsprint (Innovation, Challenges & Growth)
   - Scope: Daily algorithmic sprints (Monday Logic), product teardowns (Tuesday), Build-in-Public LinkedIn sprints (Wednesday), tech stack challenges (Thursday), weekend hackathons & student builder fellowships.
4. Group 4: CSC Business Network (Enterprise, Capital & Alliances)
   - Scope: Commercial B2B matchmaking, corporate pilots, connecting legacy industrial manufacturers (pumps, foundries, textiles, automotive components) with modern tech startups, angel syndicates.
5. Group 5: CSC Opportunities (Grants, Funding & Ecosystem Calls)
   - Scope: Capital intelligence, non-dilutive seed grants: TANSEED (Startup TN up to ₹15 Lakhs equity-free), SISFS (Startup India Seed Fund Scheme up to ₹50 Lakhs), BIRAC, NIDHI-PRAYAS, tier-1 accelerator cohorts (Forge, PSG-STEP, T-Hub, YC).

### Core Leadership Team (7 Members):
- K. N. Reyash: Founder, Coimbatore Startup Community (Founder, Belvoria) — Overall community leadership, long-term vision, ecosystem approvals.
- E. R. Sharan: Co-Founder, Coimbatore Startup Community (Founder, CECIL Groups of Companies & Industries) — Organizational strategy, corporate and industrial alliances.
- Mirra Mahendran: Chief Executive Officer (CEO), Coimbatore Startup Community (PSG Institute of Advanced Studies) — Day-to-day operations and structured execution.
- Vikash Saravanan: Chief Technology Officer (CTO), Coimbatore Startup Community (Founder & CEO, Logic Intelligence Technologies - LIT) — Technology strategy, digital platform architecture, member verification, Digital ID card approvals.
- Swathi: Chief Community Officer (CCO), Coimbatore Startup Community — Member coordination, community engagement, and healthcare support.
- Kishore C: Chief Operating Officer (COO), Coimbatore Startup Community (Founder, APARÈ Clothing) — Logistics, venue coordination, and event execution.
- Jaibharath V: Chief Brand Officer (CBO), Coimbatore Startup Community (Founder, Flickkora Agency) — Brand strategy, visual storytelling, and creative media.
- Technical Architecture & Infrastructure Partner: Logic Intelligence Technologies (LIT) (https://www.logicintelligencetechnologies.in)

### Community Code of Conduct & WhatsApp Group Guidelines:
- Allowed & Encouraged: Introductions (name, startup, problem being solved), genuine startup showcases, requesting peer feedback/critique, verified funding news, sharing ecosystem events and grants (TANSEED, SISFS).
- Strictly Prohibited: Direct sales pitches, marketing flyers, commercial discounts, unrelated group links (WhatsApp/Telegram), MLM or crypto speculation, unsolicited cold private DMs to members without prior public group consent, political/religious debates, and forwarded noise.
- 3-Stage Moderation Protocol:
  1. Stage 1: Formal warning and deletion of offending material.
  2. Stage 2: 30-day suspension and event pass revocation.
  3. Stage 3: Permanent cancellation of CSC Digital ID Card and irreversible ecosystem ban.
- Privacy & Safety: Leadership will never ask for account passwords, OTPs, or financial payment details.

### Card & Membership Terminology (MANDATORY):
- NEVER refer to the membership card as "pump set" or "pumpset". Always call it "Coimbatore Startup Community Membership ID Card" or "CSC Digital ID Card".
- Membership is 100% Free with automated 5-minute approval: https://csc.logicintelligencetechnologies.in/membership
- Digital ID Card & Event QR Pass: https://csc.logicintelligencetechnologies.in/profile/id-card
- Verified Leadership WhatsApp Group Link: https://chat.whatsapp.com/H3Nbi9oKWBcEmPQop0B5X3?s=cl&p=i&iam=2

### Core Portal Links:
- Events & Meetups: https://csc.logicintelligencetechnologies.in/events
- Startup Directory: https://csc.logicintelligencetechnologies.in/directory
- Opportunities: https://csc.logicintelligencetechnologies.in/opportunities
- Resources: https://csc.logicintelligencetechnologies.in/resources
- Collaborations: https://csc.logicintelligencetechnologies.in/collaborations
- Community Guidelines: https://csc.logicintelligencetechnologies.in/community-guidelines
- Official Email: coimbatorestartupcommunity@gmail.com
- Technical Support Email: hello@logicintelligencetechnologies.in / helpline: +91 75500 67712

### Language Policy & Response Formatting (Strict Rules):
- If the user asks about the community AND guidelines, provide a concise, balanced summary including BOTH the community overview (mission/purpose) AND the WhatsApp group guidelines (allowed vs prohibited conduct & 3-stage moderation).
- If the user writes in Tamil script, reply strictly in clean, polite Tamil.
- If the user writes in Tanglish (Tamil words written in English letters, e.g. "vanakkam bro, events epdi check panradhu?"), reply in natural, relatable, friendly Tanglish!
- If the user writes in English, reply strictly in crisp, professional English.
- Always provide structured, concise replies with bullet points and bold text, ready for WhatsApp formatting.`;

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
          max_tokens: 1000,
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
          max_tokens: 1500,
        }),
        signal: AbortSignal.timeout(11000),
      });

      if (res.ok) {
        const data = await res.json();
        const reply =
          data?.choices?.[0]?.message?.content ||
          data?.text ||
          data?.output ||
          data?.response;
        if (
          reply &&
          typeof reply === "string" &&
          reply.trim().length > 10 &&
          !reply.trim().startsWith("<|")
        ) {
          let trimmedReply = reply.trim();
          if (
            /guideline|rules|conduct/i.test(userPrompt) &&
            !trimmedReply.includes("community-guidelines")
          ) {
            trimmedReply += "\n\n🔗 Official Guidelines: https://csc.logicintelligencetechnologies.in/community-guidelines";
          }
          return trimmedReply;
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
          max_tokens: 1000,
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

  // 4. Authoritative Deterministic Knowledge Engine Fallback (100% Uptime Grounded in Bios & Guidelines)
  const lower = userPrompt.toLowerCase();
  const trimmed = userPrompt.trim();
  const lang = detectLanguage(userPrompt);

  const hasGuidelineIntent = /(guideline|rule|conduct|etiquette|allowed|prohibited|spam|dm|ban|strike|விதிகள்|வழிகாட்டுதல்)/i.test(lower);
  const hasCommunityIntent = /(about (the |our |your )?community|what is (csc|circle)|tell me about (csc|the community|circle)|know about (your |the )?community|ecosystem|mission|tagline|purpose|கம்யூனிட்டி பற்றி|சமூகம்)/i.test(lower);

  // Intent A: Combined Request (Community Overview AND WhatsApp Group Guidelines)
  if (hasGuidelineIntent && hasCommunityIntent) {
    if (lang === "ta") {
      return [
        "👋 *வணக்கம்! கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டி (CSC Circle)* ✨",
        "",
        "🌟 *எங்கள் கம்யூனிட்டி பற்றி:*",
        "CSC Circle என்பது கோவை மற்றும் மேற்கு தமிழ்நாட்டின் முன்னணி தொழில்முனைவோர், பவுண்டர்கள், டெவலப்பர்கள் மற்றும் முதலீட்டாளர்களை இணைக்கும் அதிகாரப்பூர்வ அமைப்பாகும் (Powered by *Logic Intelligence Technologies*).",
        "• *குறிக்கோள் (Tagline):* _Connect • Build • Grow_",
        "• *இலவசம்:* 5 நிமிட தானியங்கி ஒப்புதலுடன் வாழ்நாள் இலவச உறுப்பினர் சேர்க்கை.",
        "",
        "📜 *வாட்ஸ்அப் குழு வழிகாட்டுதல்கள் (Code of Conduct):*",
        "1. *அனுமதிக்கப்பட்டவை:* புதிய பவுண்டர் அறிமுகம், தயாரிப்பு வெளியீடுகள் (Showcases), உண்மையான நிகழ்வுகள் & அரசு மானியங்கள் (TANSEED, SISFS) பற்றிய விவாதங்கள்.",
        "2. *கண்டிப்பாக தடைசெய்யப்பட்டவை:* வணிக விற்பனை விளம்பரங்கள், தொடர்பற்ற குழு இணைப்புகள், அனுமதியின்றி தனிப்பட்ட மெசேஜ் (No Cold DMs), மற்றும் MLM/Crypto ஸ்பேம்.",
        "3. *3-நிலை ஒழுங்குமுறை:* மீறல்களுக்கு எச்சரிக்கை ➡️ 30 நாள் இடைநீக்கம் ➡️ டிஜிட்டல் உறுப்பினர் அட்டை ரத்து & நிரந்தர நீக்கம்.",
        "",
        "🌐 *முக்கிய இணைப்புகள்:*",
        "• வலைத்தளம்: https://csc.logicintelligencetechnologies.in",
        "• அதிகாரப்பூர்வ வாட்ஸ்அப் குழு: https://chat.whatsapp.com/H3Nbi9oKWBcEmPQop0B5X3",
        "• வழிகாட்டுதல்கள்: https://csc.logicintelligencetechnologies.in/community-guidelines",
      ].join("\n");
    }

    if (lang === "tanglish") {
      return [
        "👋 *Welcome to Coimbatore Startup Community (CSC Circle)!* ✨",
        "",
        "🌟 *About CSC Circle:*",
        "Coimbatore Startup Community (CSC Circle) is Coimbatore's premier founder-first startup ecosystem powered by *Logic Intelligence Technologies (LIT)*. Namma mission founders, builders, developers, and investors-ah connect panni startup execution-ah accelerate panradhu.",
        "• *Tagline:* _Connect • Build • Grow_",
        "• *Membership:* 100% Free with 5-minute automated approval.",
        "",
        "📜 *WhatsApp Group Guidelines (Strictly Enforced):*",
        "1. *Allowed & Encouraged:* Member intros, startup showcases, peer feedback, tech discussions & verified grants (TANSEED, SISFS).",
        "2. *Strictly Prohibited:* Direct commercial sales flyers, unrelated group links, MLM/crypto schemes & cold DMs without prior public consent.",
        "3. *3-Stage Moderation:* Warning & post deletion ➡️ 30-day suspension ➡️ Permanent Digital ID revocation & ecosystem ban.",
        "",
        "🌐 *Official Links:*",
        "• Website: https://csc.logicintelligencetechnologies.in",
        "• Join Official WhatsApp Group: https://chat.whatsapp.com/H3Nbi9oKWBcEmPQop0B5X3",
        "• Complete Guidelines: https://csc.logicintelligencetechnologies.in/community-guidelines",
      ].join("\n");
    }

    return [
      "👋 *Welcome to Coimbatore Startup Community (CSC Circle)!* ✨",
      "",
      "🌟 *About Our Community:*",
      "Coimbatore Startup Community (CSC Circle) is Coimbatore and Western Tamil Nadu's premier founder-centric startup ecosystem, powered by *Logic Intelligence Technologies (LIT)*. We connect early-stage builders, technical operators, and seasoned mentors with institutional capital and grant programs.",
      "• *Motto:* _Connect • Build • Grow_",
      "• *Membership:* 100% Free with automated 5-minute approval.",
      "",
      "📜 *Official WhatsApp Group Guidelines:*",
      "1. *Allowed & Encouraged:* Member introductions, startup problem showcases, peer UI/UX feedback, and verified ecosystem opportunities & grants (TANSEED, SISFS).",
      "2. *Strictly Prohibited:* Direct sales pitches, promotional flyers, unrelated WhatsApp/Telegram links, speculative schemes, and unsolicited private cold DMs.",
      "3. *3-Stage Moderation Protocol:* Warning & deletion ➡️ 30-day suspension & pass revocation ➡️ Permanent Digital ID cancellation & ecosystem ban.",
      "",
      "🌐 *Official Links:*",
      "• Portal: https://csc.logicintelligencetechnologies.in",
      "• Official WhatsApp Community: https://chat.whatsapp.com/H3Nbi9oKWBcEmPQop0B5X3",
      "• Detailed Guidelines: https://csc.logicintelligencetechnologies.in/community-guidelines",
    ].join("\n");
  }

  // Intent B: Community Guidelines / Group Rules Alone
  if (hasGuidelineIntent) {
    if (lang === "ta") {
      return [
        "📜 *CSC Circle — அதிகாரப்பூர்வ வாட்ஸ்அப் குழு & கம்யூனிட்டி வழிகாட்டுதல்கள்*",
        "✨ *Connect • Build • Grow — உயர்தர பயனுள்ள தகவல் பரிமாற்றம்*",
        "",
        "கோவை பவுண்டர்கள் மற்றும் முதலீட்டாளர்களுக்கான நம்பகமான தளமாக இதைத் தக்கவைக்க, அனைத்து உறுப்பினர்களும் இந்த நெறிமுறைகளைப் பின்பற்ற வேண்டும்:",
        "",
        "✅ *அனுமதிக்கப்பட்டவை & வரவேற்கப்படுபவை:*",
        "• *அறிமுகம்:* குழுவில் இணைந்தவுடன் உங்கள் பெயர், ஸ்டார்ட்அப் மற்றும் நீங்கள் தீர்க்கும் பிரச்சனை பற்றி பகிரவும்.",
        "• *தயாரிப்பு முன்னேற்றம்:* உங்கள் தயாரிப்பு வெளியீடுகள், UI/UX மற்றும் தொழில்நுட்ப முன்னேற்றங்களை பகிரவும்.",
        "• *நிகழ்வுகள் & வாய்ப்புகள்:* உண்மையான ஸ்டார்ட்அப் மீட்டிங் மற்றும் அரசு மானியங்கள் (TANSEED, SISFS).",
        "",
        "❌ *கண்டிப்பாக தடைசெய்யப்பட்டவை:*",
        "• 🚫 நேரடி விற்பனை விளம்பரங்கள் மற்றும் தள்ளுபடி சலுகைகள்.",
        "• 🚫 தொடர்பற்ற குழு அல்லது டெலிகிராம் இணைப்புகள்.",
        "• 🚫 குழுவின் முன் அனுமதியின்றி சக உறுப்பினர்களுக்கு தனிப்பட்ட மெசேஜ் (Cold DMs) அனுப்புவது.",
        "• 🚫 MLM அல்லது கிரிப்டோ விளம்பரங்கள்.",
        "",
        "⚖️ *3-நிலை ஒழுங்குமுறை நடவடிக்கை:*",
        "1️⃣ நிலை 1: எச்சரிக்கை & மெசேஜ் நீக்கம்.",
        "2️⃣ நிலை 2: 30 நாட்கள் இடைநீக்கம் & பாஸ் ரத்து.",
        "3️⃣ நிலை 3: நிரந்தர நீக்கம் & டிஜிட்டல் உறுப்பினர் அட்டை ரத்து.",
        "",
        "🔗 முழு வழிகாட்டுதல்கள்: https://csc.logicintelligencetechnologies.in/community-guidelines",
      ].join("\n");
    }

    if (lang === "tanglish") {
      return [
        "📜 *CSC Circle — Official WhatsApp Group Guidelines*",
        "✨ *High Signal • Zero Noise*",
        "",
        "✅ *Allowed & Encouraged:*",
        "• Member introductions (Name, Startup, Problem Statement).",
        "• Product showcases & asking for UI/UX or architecture feedback.",
        "• Genuine ecosystem events, hackathons & grant updates (TANSEED, SISFS).",
        "",
        "❌ *Strictly Prohibited:*",
        "• 🚫 Direct commercial advertising, retail sales, discount flyers.",
        "• 🚫 Third-party WhatsApp/Telegram links or speculative crypto promos.",
        "• 🚫 Unsolicited private DMs to members without prior group consent.",
        "• 🚫 Forwarded spam, political, or religious debates.",
        "",
        "⚖️ *Moderation:* Strike 1 (Warning) ➡️ Strike 2 (30-day suspension) ➡️ Strike 3 (Permanent Ban & ID cancellation).",
        "",
        "🔗 Detailed Guidelines: https://csc.logicintelligencetechnologies.in/community-guidelines",
      ].join("\n");
    }

    return [
      "📜 *CSC Circle — Official WhatsApp Group Guidelines*",
      "✨ *High Signal • Zero Noise*",
      "",
      "✅ *Allowed & Encouraged:*",
      "• *Introductions:* Name, startup stage, problem statement, and collaboration needs.",
      "• *Showcases:* Product updates, traction, and peer feedback requests.",
      "• *Opportunities:* Verified events, hackathons, and grant announcements (TANSEED, SISFS).",
      "",
      "❌ *Strictly Prohibited:*",
      "• 🚫 Direct sales pitches, promotional flyers, or commercial advertising.",
      "• 🚫 Unrelated third-party group links (WhatsApp/Telegram).",
      "• 🚫 Unsolicited cold private DMs to group members without consent.",
      "• 🚫 Multi-level marketing (MLM), crypto speculation, or forwarded noise.",
      "",
      "⚖️ *3-Stage Moderation:* Formal Warning ➡️ 30-Day Suspension ➡️ Permanent Digital ID Revocation & Ban.",
      "",
      "🔗 Complete Guidelines: https://csc.logicintelligencetechnologies.in/community-guidelines",
    ].join("\n");
  }

  // Intent C: Community Overview Alone
  if (hasCommunityIntent) {
    if (lang === "ta") {
      return [
        "🌟 *கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டி (CSC Circle)* ✨",
        "",
        "📌 *எங்கள் குறிக்கோள் (Tagline):*",
        "*“Connect • Build • Grow”*",
        "",
        "🎯 *எங்கள் நோக்கம்:*",
        "கோவை மற்றும் மேற்கு தமிழ்நாட்டில் உள்ள ஸ்டார்ட்அப் பவுண்டர்கள், டெவலப்பர்கள், முதலீட்டாளர்கள் மற்றும் மாணவர்களை இணைத்து, புதிய கண்டுபிடிப்புகளை வணிக ரீதியாக உயர்த்த உதவும் அதிகாரப்பூர்வ தளம்.",
        "",
        "🚀 *முக்கிய சேவைகள்:*",
        "• *ஆஃப்லைன் நிகழ்வுகள்:* https://csc.logicintelligencetechnologies.in/events",
        "• *ஸ்டார்ட்அப் பட்டியல்:* https://csc.logicintelligencetechnologies.in/directory",
        "• *இலவச உறுப்பினர் சேர்க்கை:* https://csc.logicintelligencetechnologies.in/membership (5 நிமிடங்களில் அனுமதி)",
        "• *அதிகாரப்பூர்வ வாட்ஸ்அப் குழு:* https://chat.whatsapp.com/H3Nbi9oKWBcEmPQop0B5X3",
      ].join("\n");
    }

    if (lang === "tanglish") {
      return [
        "🌟 *Coimbatore Startup Community (CSC Circle)* ✨",
        "",
        "📌 *Tagline:* *“Connect • Build • Grow”*",
        "",
        "🎯 *What We Do:*",
        "CSC Circle is Coimbatore's premier startup network powered by *Logic Intelligence Technologies*. We connect local founders, developers, innovators, and angel investors to eliminate founder isolation and build resilient businesses.",
        "",
        "🚀 *Platform Highlights:*",
        "• Offline Meetups: https://csc.logicintelligencetechnologies.in/events",
        "• Founder Directory: https://csc.logicintelligencetechnologies.in/directory",
        "• Free Membership: https://csc.logicintelligencetechnologies.in/membership (5 mins approval)",
        "• Official WhatsApp Community: https://chat.whatsapp.com/H3Nbi9oKWBcEmPQop0B5X3",
      ].join("\n");
    }

    return [
      "🌟 *Coimbatore Startup Community (CSC Circle)* ✨",
      "",
      "📌 *Motto:* *“Connect • Build • Grow”*",
      "",
      "🎯 *About Us:*",
      "Coimbatore Startup Community (CSC Circle) is an independent, founder-centric platform dedicated to catalyzing high-impact entrepreneurship across Coimbatore and Western Tamil Nadu, powered by *Logic Intelligence Technologies*.",
      "",
      "🚀 *Platform Capabilities:*",
      "• *Offline Events & Pitch Arenas:* https://csc.logicintelligencetechnologies.in/events",
      "• *Verified Founder Directory:* https://csc.logicintelligencetechnologies.in/directory",
      "• *Digital Membership Pass:* https://csc.logicintelligencetechnologies.in/membership (Auto-approved within 5 minutes)",
      "• *Official WhatsApp Community:* https://chat.whatsapp.com/H3Nbi9oKWBcEmPQop0B5X3",
    ].join("\n");
  }

  // Intent D: 5 Official WhatsApp Ecosystem Groups & Bios
  if (/(5 groups|five groups|whatsapp groups|ecosystem bios|group bios|mindsprint|announcements|business network|opportunities channel)/i.test(lower)) {
    return [
      "📢 *CSC 5 Official WhatsApp Ecosystem Groups*",
      "",
      "1️⃣ *CSC Announcements* — Official broadcast channel, zero-noise, admin-only. Major summits, partnerships (Startup TN/Startup India), and policy alerts.",
      "2️⃣ *CSC Circle* — Main community hub for peer founder discussions, product showcases, UI/UX critiques, and collaboration.",
      "3️⃣ *CSC Mindsprint* — Daily engineering sprints (Monday Logic), product teardowns, Build-in-Public sprints, and hackathons.",
      "4️⃣ *CSC Business Network* — B2B procurement, corporate pilots, connecting legacy industrial manufacturing with startups & angel syndicates.",
      "5️⃣ *CSC Opportunities* — Non-dilutive capital radar: TANSEED (up to ₹15L), SISFS (up to ₹50L), BIRAC, and top accelerator cohorts.",
      "",
      "👉 *Join Official Leadership & Community Hub:* https://chat.whatsapp.com/H3Nbi9oKWBcEmPQop0B5X3",
    ].join("\n");
  }

  // Intent E: Leadership Team Queries
  const isFounderQuery =
    /^(who is the founder|who are the founders|who started csc|who started|who founded|founder\?|co-founder\?)/i.test(trimmed) ||
    /^(founder|co-founder|founders|co-founders|leadership)$/i.test(trimmed) ||
    /(who (is|are) (the )?(founder|co-founder|founders)|who started (csc|coimbatore startup))/i.test(lower) ||
    /நிறுவனர் யார்|யார் நிறுவனர்|நிறுவனர்|founder yaaru|founder yaaru-nu/i.test(trimmed);

  if (/(who (is|are) (the )?)?(cto|head of tech|tech lead)\b|vikash/i.test(lower)) {
    return lang === "ta"
      ? "கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டியின் தலைமை தொழில்நுட்ப அதிகாரி (CTO) மற்றும் தொழில்நுட்பத் தலைவர் *விகாஷ் சரவணன்* (Vikash Saravanan). இவர் Logic Intelligence Technologies (LIT) நிறுவனத்தின் நிறுவனர் & CEO ஆவார்."
      : lang === "tanglish"
      ? "CSC Circle-yoda CTO & Head of Tech *Vikash Saravanan* (Founder & CEO, Logic Intelligence Technologies - LIT). Digital platform architecture and member verification இவரால் நிர்வகிக்கப்படுகிறது."
      : "*Vikash Saravanan* is the Chief Technology Officer (CTO) & Head of Tech for Coimbatore Startup Community (CSC Circle) and Founder & CEO of Logic Intelligence Technologies (LIT). He oversees digital platform architecture, software development, and member ID approvals.";
  }

  if (/(who (is|are) (the )?)?(ceo|chief executive)\b|mirra/i.test(lower)) {
    return lang === "ta"
      ? "கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டியின் தலைமை நிர்வாக அதிகாரி (CEO) *மிர்ரா மகேந்திரன்* (Mirra Mahendran) ஆவார். இவர் PSG Institute of Advanced Studies-ல் சர்வதேச வணிகம் படித்து வருகிறார்."
      : lang === "tanglish"
      ? "CSC Circle-yoda CEO *Mirra Mahendran* aavarga (PSG Institute of Advanced Studies). Day-to-day operations and structured execution இவரால் வழிநடத்தப்படுகிறது."
      : "*Mirra Mahendran* is the Chief Executive Officer (CEO) of Coimbatore Startup Community (CSC Circle). Pursuing International Business at PSG IAS, she drives day-to-day operations and execution.";
  }

  if (isFounderQuery) {
    return lang === "ta"
      ? "CSC Circle அமைப்பின் நிறுவனர் *K. N. ரேயாஷ்* (K. N. Reyash - Founder, Belvoria) மற்றும் இணை நிறுவனர் *E. R. சரண்* (E. R. Sharan - Founder, CECIL Groups) ஆவர். தொழில்நுட்ப கூட்டாண்மை: Logic Intelligence Technologies (LIT)."
      : lang === "tanglish"
      ? "Coimbatore Startup Community-ah start pannadhu *K. N. Reyash* (Founder, Belvoria) and *E. R. Sharan* (Co-Founder, Founder of CECIL Groups). Technical Partner: Logic Intelligence Technologies (LIT)."
      : "Coimbatore Startup Community was founded by *K. N. Reyash* (Founder, Belvoria) and *E. R. Sharan* (Co-Founder, Founder of CECIL Groups). Technical Partner: Logic Intelligence Technologies (LIT).";
  }

  if (/(who (is|are) (the )?)?(cco|community officer|community lead)\b|swathi/i.test(lower)) {
    return lang === "ta"
      ? "கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டியின் தலைமை சமூக அதிகாரி (Chief Community Officer - CCO) *சுவாதி* (Swathi) ஆவார்."
      : lang === "tanglish"
      ? "CSC Circle-yoda Chief Community Officer (CCO) *Swathi* aavarga. Member coordination and community engagement-ஐ நிர்வகிக்கிறார்."
      : "*Swathi* is the Chief Community Officer (CCO) of Coimbatore Startup Community (CSC Circle), spearheading member coordination and community engagement.";
  }

  if (/(who (is|are) (the )?)?(coo|operating officer|operations lead)\b|kishore/i.test(lower)) {
    return lang === "ta"
      ? "கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டியின் தலைமை செயல்பாட்டு அதிகாரி (Chief Operating Officer - COO) *கிஷோர் சி* (Kishore C) ஆவார். இவர் APARÈ Clothing நிறுவனத்தின் நிறுவனர்."
      : lang === "tanglish"
      ? "CSC Circle-yoda Chief Operating Officer (COO) *Kishore C* (Founder, APARÈ Clothing). Event planning and on-ground logistics இவரால் வழிநடத்தப்படுகிறது."
      : "*Kishore C* is the Chief Operating Officer (COO) of Coimbatore Startup Community (CSC Circle) and Founder of APARÈ Clothing, leading on-ground logistics and event planning.";
  }

  if (/(who (is|are) (the )?)?(cbo|brand officer|brand lead|branding)\b|jaibharath|jai bharath/i.test(lower)) {
    return lang === "ta"
      ? "கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டியின் தலைமை பிராண்ட் அதிகாரி (Chief Brand Officer - CBO) *ஜெய்பரத் வி* (Jaibharath V) ஆவார். இவர் Flickkora Agency நிறுவனத்தின் நிறுவனர்."
      : lang === "tanglish"
      ? "CSC Circle-yoda Chief Brand Officer (CBO) *Jaibharath V* (Founder, Flickkora Agency). Brand strategy and media production-ஐ நிர்வகிக்கிறார்."
      : "*Jaibharath V* is the Chief Brand Officer (CBO) of Coimbatore Startup Community (CSC Circle) and Founder of Flickkora Agency, leading brand strategy and creative media.";
  }

  if (/(leadership team|core team|organizers|who runs csc|board members)/i.test(lower)) {
    return [
      "👑 *CSC Circle Core Leadership Desk*",
      "",
      "• *Founder:* K. N. Reyash (Founder, Belvoria)",
      "• *Co-Founder:* E. R. Sharan (Founder, CECIL Groups)",
      "• *CEO:* Mirra Mahendran (PSG IAS)",
      "• *CTO:* Vikash Saravanan (Founder & CEO, Logic Intelligence Technologies)",
      "• *CCO:* Swathi (Community Engagement & Member Support)",
      "• *COO:* Kishore C. (Founder, APARÈ Clothing)",
      "• *CBO:* Jaibharath V. (Founder, Flickkora Agency)",
      "",
      "Technical Infrastructure Partner: *Logic Intelligence Technologies (LIT)*",
    ].join("\n");
  }

  // Intent F: Membership Inquiries
  if (/membership|free|join|cost|fees|fee/i.test(lower)) {
    return lang === "ta"
      ? "CSC Circle உறுப்பினர் சேர்க்கை 100% முற்றிலும் இலவசம்! 5 நிமிடங்களில் தானியங்கி ஒப்புதல் பெற இணையுங்கள்: https://csc.logicintelligencetechnologies.in/membership"
      : lang === "tanglish"
      ? "CSC Circle membership 100% free! 5 mins-la automated approval kedaikum. Join panna: https://csc.logicintelligencetechnologies.in/membership"
      : "Membership in CSC Circle is 100% free with automated 5-minute approval! Join here: https://csc.logicintelligencetechnologies.in/membership";
  }

  // Intent G: Event Inquiries
  if (/event|meetup|masterclass|pitch/i.test(lower)) {
    return lang === "ta"
      ? "கோவையின் அடுத்த ஆஃப்லைன் பவுண்டர் மீட்டிங் & மாஸ்டர்கிளாஸ் விவரங்களை அறிய: https://csc.logicintelligencetechnologies.in/events அல்லது */events* என அனுப்பவும்."
      : lang === "tanglish"
      ? "Kovaiyin adutha offline founder meetup & masterclass details therinjuka: https://csc.logicintelligencetechnologies.in/events illa */events* send pannunga."
      : "Explore upcoming offline founder meetups and masterclasses in Coimbatore at: https://csc.logicintelligencetechnologies.in/events or reply */events*.";
  }

  // Intent H: Digital ID Card / Passes (Strictly NO "pump set")
  if (/pass|ticket|card|digital id|membership card|qr/i.test(lower)) {
    return lang === "ta"
      ? "உங்கள் கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டி டிஜிட்டல் உறுப்பினர் அட்டை (CSC Digital ID Card) மற்றும் நிகழ்வு நுழைவு QR பாஸை பெற: https://csc.logicintelligencetechnologies.in/profile/id-card அல்லது */pass* என அனுப்பவும்."
      : lang === "tanglish"
      ? "Unga Coimbatore Startup Community Digital ID Card & event QR gate pass eduka: https://csc.logicintelligencetechnologies.in/profile/id-card illa */pass* send pannunga."
      : "Access your official Coimbatore Startup Community Membership ID Card & dynamic event QR gate pass at: https://csc.logicintelligencetechnologies.in/profile/id-card or reply */pass*.";
  }

  // Intent I: Opportunities & Grants (TANSEED, SISFS)
  if (/opportunity|opportunities|grant|funding|tanseed|sisfs|investor/i.test(lower)) {
    return [
      "💰 *CSC Funding & Opportunities Radar*",
      "",
      "Explore non-dilutive government seed grants, investor pitch calls, and startup accelerators:",
      "• *TANSEED (Startup TN):* Up to ₹15 Lakhs equity-free grant.",
      "• *SISFS (Startup India):* Up to ₹50 Lakhs seed funding via incubators.",
      "• *Live Opportunities Feed:* https://csc.logicintelligencetechnologies.in/opportunities",
      "• *Founder Pitch & Grant Templates:* https://csc.logicintelligencetechnologies.in/resources",
    ].join("\n");
  }

  // Fallback Greeting
  if (lang === "ta") {
    return "வணக்கம்! கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டிக்கு வரவேற்கிறோம். உடனடி வழிகாட்டுதலுக்கு */menu* அல்லது கட்டளைகளுக்கு */help* என அனுப்பவும்.";
  }
  if (lang === "tanglish") {
    return "Vanakkam! Coimbatore Startup Community-ku varaverkirom. Instant navigation-ku */menu* illa commands list-ku */help* send pannunga.";
  }
  return "Welcome to Coimbatore Startup Community (CSC Circle)! Reply */menu* for our quick options or */help* for all slash commands.";
}
