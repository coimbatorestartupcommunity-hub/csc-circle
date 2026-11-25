import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBiWeeklyCommunityPulse, CSC_WHATSAPP_FOOTER } from "@/lib/services/community-pulse";
import { dispatchTeamWhatsAppAlert } from "@/lib/services/team-alerts";
import { sendMsg91WhatsAppTextMessage } from "@/lib/services/msg91";

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

  // 11. Deep Community AI Knowledge Hub (Groq AI + Modal + xAI Grok / Musk API)
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

### Language Policy (Strict Multi-lingual Routing):
- If the user writes in Tamil script, reply strictly in clean Tamil.
- If the user writes in Tanglish (Tamil words written in English letters, e.g. "vanakkam bro, events epdi check panradhu?"), reply in natural, friendly, conversational Tanglish!
- If the user writes in English, reply strictly in crisp, professional English.
- Always provide concise replies (2-4 sentences suitable for WhatsApp messaging) and cite relevant official links.`;

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
  const trimmed = userPrompt.trim();
  const lang = detectLanguage(userPrompt);

  const isFounderQuery =
    /^(who is the founder|who are the founders|who started csc|who started|who founded|founder\?|co-founder\?)/i.test(trimmed) ||
    /^(founder|co-founder|founders|co-founders|leadership)$/i.test(trimmed) ||
    /(who (is|are) (the )?(founder|co-founder|founders)|who started (csc|coimbatore startup))/i.test(lower) ||
    /நிறுவனர் யார்|யார் நிறுவனர்|நிறுவனர்|founder yaaru|founder yaaru-nu/i.test(trimmed);

  if (/(who (is|are) (the )?)?(cto|head of tech|tech lead)\b|vikash/i.test(lower)) {
    return lang === "ta"
      ? "கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டியின் தலைமை தொழில்நுட்ப அதிகாரி (CTO) மற்றும் தொழில்நுட்பத் தலைவர் *விகாஷ் சரவணன்* (Vikash Saravanan). தொழில்நுட்ப கூட்டாண்மை: Logic Intelligence Technologies (LIT)."
      : lang === "tanglish"
      ? "CSC Circle-yoda CTO & Head of Tech *Vikash Saravanan* (Founder & CEO, Logic Intelligence Technologies - LIT)."
      : "*Vikash Saravanan* is the Chief Technology Officer (CTO) & Head of Tech for Coimbatore Startup Community (CSC Circle) and Founder & CEO of Logic Intelligence Technologies (LIT).";
  }

  if (/(who (is|are) (the )?)?(ceo|chief executive)\b|mirra/i.test(lower)) {
    return lang === "ta"
      ? "கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டியின் தலைமை நிர்வாக அதிகாரி (CEO) *மிர்ரா மகேந்திரன்* (Mirra Mahendran) ஆவார்."
      : lang === "tanglish"
      ? "CSC Circle-yoda CEO *Mirra Mahendran* aavarga."
      : "*Mirra Mahendran* is the Chief Executive Officer (CEO) of Coimbatore Startup Community (CSC Circle).";
  }

  if (isFounderQuery) {
    return lang === "ta"
      ? "CSC Circle அமைப்பின் நிறுவனர் *K. N. ரேயாஷ்* (K. N. Reyash) மற்றும் இணை நிறுவனர் *E. R. சரண்* (E. R. Sharan) ஆவர். தொழில்நுட்ப கூட்டாண்மை: Logic Intelligence Technologies (LIT)."
      : lang === "tanglish"
      ? "Coimbatore Startup Community-ah start pannadhu *K. N. Reyash* (Founder, Belvoria) and *E. R. Sharan* (Co-Founder, Founder of CECIL Groups). Technical Partner: Logic Intelligence Technologies (LIT)."
      : "Coimbatore Startup Community was founded by *K. N. Reyash* (Founder, Belvoria) and *E. R. Sharan* (Co-Founder, Founder of CECIL Groups). Technical Partner: Logic Intelligence Technologies (LIT).";
  }

  if (/(who (is|are) (the )?)?(cco|community officer|community lead)\b|swathi/i.test(lower)) {
    return lang === "ta"
      ? "கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டியின் தலைமை சமூக அதிகாரி (Chief Community Officer - CCO) *சுவாதி* (Swathi) ஆவார்."
      : lang === "tanglish"
      ? "CSC Circle-yoda Chief Community Officer (CCO) *Swathi* aavarga."
      : "*Swathi* is the Chief Community Officer (CCO) of Coimbatore Startup Community (CSC Circle).";
  }

  if (/(who (is|are) (the )?)?(coo|operating officer|operations lead)\b|kishore/i.test(lower)) {
    return lang === "ta"
      ? "கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டியின் தலைமை செயல்பாட்டு அதிகாரி (Chief Operating Officer - COO) *கிஷோர் சி* (Kishore C) ஆவார். இவர் APARÈ Clothing நிறுவனத்தின் நிறுவனர்."
      : lang === "tanglish"
      ? "CSC Circle-yoda Chief Operating Officer (COO) *Kishore C* (Founder, APARÈ Clothing)."
      : "*Kishore C* is the Chief Operating Officer (COO) of Coimbatore Startup Community (CSC Circle) and Founder of APARÈ Clothing.";
  }

  if (/(who (is|are) (the )?)?(cbo|brand officer|brand lead|branding)\b|jaibharath|jai bharath/i.test(lower)) {
    return lang === "ta"
      ? "கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டியின் தலைமை பிராண்ட் அதிகாரி (Chief Brand Officer - CBO) *ஜெய்பரத் வி* (Jaibharath V) ஆவார். இவர் Flickkora Agency நிறுவனத்தின் நிறுவனர்."
      : lang === "tanglish"
      ? "CSC Circle-yoda Chief Brand Officer (CBO) *Jaibharath V* (Founder, Flickkora Agency)."
      : "*Jaibharath V* is the Chief Brand Officer (CBO) of Coimbatore Startup Community (CSC Circle) and Founder of Flickkora Agency.";
  }

  if (/membership|free|join|cost|fees|fee/i.test(lower)) {
    return lang === "ta"
      ? "CSC Circle உறுப்பினர் சேர்க்கை 100% முற்றிலும் இலவசம்! 5 நிமிடங்களில் தானியங்கி ஒப்புதல் பெற இணையுங்கள்: https://csc.logicintelligencetechnologies.in/membership"
      : lang === "tanglish"
      ? "CSC Circle membership 100% free! 5 mins-la automated approval kedaikum. Join panna: https://csc.logicintelligencetechnologies.in/membership"
      : "Membership in CSC Circle is 100% free with automated 5-minute approval! Join here: https://csc.logicintelligencetechnologies.in/membership";
  }

  if (/event|meetup|masterclass|pitch/i.test(lower)) {
    return lang === "ta"
      ? "கோவையின் அடுத்த ஆஃப்லைன் பவுண்டர் மீட்டிங் & மாஸ்டர்கிளாஸ் விவரங்களை அறிய: https://csc.logicintelligencetechnologies.in/events அல்லது */events* என அனுப்பவும்."
      : lang === "tanglish"
      ? "Kovaiyin adutha offline founder meetup & masterclass details therinjuka: https://csc.logicintelligencetechnologies.in/events illa */events* send pannunga."
      : "Explore upcoming offline founder meetups and masterclasses in Coimbatore at: https://csc.logicintelligencetechnologies.in/events or reply */events*.";
  }

  if (/pass|ticket|card|qr/i.test(lower)) {
    return lang === "ta"
      ? "உங்கள் டிஜிட்டல் உறுப்பினர் அட்டை மற்றும் நிகழ்வு நுழைவு QR கோட் பெற: https://csc.logicintelligencetechnologies.in/profile/id-card அல்லது */pass* என அனுப்பவும்."
      : lang === "tanglish"
      ? "Unga digital membership card & event QR gate pass eduka: https://csc.logicintelligencetechnologies.in/profile/id-card illa */pass* send pannunga."
      : "Access your digital membership card & event QR gate pass at: https://csc.logicintelligencetechnologies.in/profile/id-card or reply */pass*.";
  }

  if (lang === "ta") {
    return "வணக்கம்! கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டிக்கு வரவேற்கிறோம். உடனடி வழிகாட்டுதலுக்கு */menu* அல்லது கட்டளைகளுக்கு */help* என அனுப்பவும்.";
  }
  if (lang === "tanglish") {
    return "Vanakkam! Coimbatore Startup Community-ku varaverkirom. Instant navigation-ku */menu* illa commands list-ku */help* send pannunga.";
  }
  return "Welcome to Coimbatore Startup Community (CSC Circle)! Reply */menu* for our quick options or */help* for all slash commands.";
}
