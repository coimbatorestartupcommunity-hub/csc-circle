export type PulseLanguage = "en" | "ta" | "tanglish";

export const CSC_WHATSAPP_FOOTER = [
  "🚀 *Connect • Build • Grow*",
  "🌐 *Coimbatore Startup Community (CSC Circle)*",
  "🤍 ⚙️ *Powered by Logic Intelligence Technologies*",
].join("\n");

/**
 * Formats the Bi-Weekly Sunday 10:00 AM Community Pulse & Founder Check-in prompt.
 * Focuses on:
 * 1. Monthly startup milestones & wins.
 * 2. Real roadblocks/problems where the community can help.
 * 3. Next meetup topic & format ideas (Reply IDEA <topic>).
 * 4. Monthly onboarding/feedback survey form (with notice to ignore if already submitted).
 */
export function formatBiWeeklyCommunityPulse(lang: PulseLanguage = "en"): string {
  if (lang === "ta") {
    return (
      `🌟 *கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டி (CSC Circle) — இருவார கம்யூனிட்டி செக்-இன்* 🚀\n\n` +
      `வணக்கம் பில்டர்ஸ் & பவுண்டர்ஸ்! இந்த இருவாரத்தில் உங்கள் ஸ்டார்ட்அப் பயணம் எப்படி செல்கிறது என்பதைத் தெரிந்துகொள்ள விரும்புகிறோம்:\n\n` +
      `1️⃣ *இந்த மாதம் உங்கள் புதிய சாதனைகள் அல்லது வெளியீடுகள் என்ன?*\n` +
      `   புதிய தயாரிப்பு அறிமுகம், வாடிக்கையாளர்கள், அல்லது குழு மைல்கற்களைப் பகிருங்கள்!\n\n` +
      `2️⃣ *உங்கள் ஸ்டார்ட்அப்பில் ஏதேனும் சவால்கள் அல்லது தடைகள் உள்ளதா?*\n` +
      `   தொழில்நுட்பம், முதலீடு, வேலைவாய்ப்பு அல்லது வாடிக்கையாளர் பெறுவதில் சிக்கல்கள் இருந்தால் எங்களிடம் கூறுங்கள்; கோவையின் மூத்த நிறுவனர்கள் உதவத் தயார்.\n\n` +
      `3️⃣ *அடுத்த ஆஃப்லைன் மீட்டப்பில் என்ன தலைப்புகள் விவாதிக்கப்பட வேண்டும்?*\n` +
      `   உங்களுக்குத் தேவையான தலைப்பை உடனே பகிர: *IDEA <உங்கள் யோசனை>* என்று பதில் அனுப்புங்கள்!\n\n` +
      `4️⃣ *மாதாந்திர கருத்துக்கணிப்பு படிவம் (Survey Form):*\n` +
      `   எங்கள் கம்யூனிட்டி சேவைகளை மேம்படுத்த உங்கள் கருத்துக்களைப் பகிருங்கள்:\n` +
      `   🔗 https://csc.logicintelligencetechnologies.in/survey/member-onboarding\n` +
      `   _(குறிப்பு: ஏற்கனவே நீங்கள் இந்தப் படிவத்தைப் பூர்த்தி செய்திருந்தால், தயவுசெய்து இந்த இணைப்பைத் தவிர்க்கவும்!)_\n\n` +
      `உத்வேகத்துடன் தொடர்ந்து உருவாக்குங்கள்!\n\n` +
      CSC_WHATSAPP_FOOTER
    );
  }

  if (lang === "tanglish") {
    return (
      `🌟 *CSC Circle — Fortnightly Founder Pulse & Community Check-In* 🚀\n\n` +
      `Vanakkam Founders! Ungaloda startup journey indha month epdi pogudhu-nu therinjuka aavala irukkom:\n\n` +
      `1️⃣ *Indha month enna pudhusa build / launch panneenga?*\n` +
      `   Customer wins, product milestones or revenue updates irundha share pannunga!\n\n` +
      `2️⃣ *Startup-la edhavadhu hurdles / problems face panreengala?*\n` +
      `   Tech architecture, funding or hiring blockers irundha sollunga, namma CSC network mentors kooda connect pannalam.\n\n` +
      `3️⃣ *Next Offline Meetup-ku enna topics & speakers venum?*\n` +
      `   Unga ideas-ah share panna: *IDEA <your topic>* nu reply pannunga!\n\n` +
      `4️⃣ *Monthly Community Feedback Survey:*\n` +
      `   Help us make CSC even better:\n` +
      `   🔗 https://csc.logicintelligencetechnologies.in/survey/member-onboarding\n` +
      `   _(Note: Neenga already indha survey fill pannirundha, please ignore this link!)_\n\n` +
      `Have a great productive week ahead!\n\n` +
      CSC_WHATSAPP_FOOTER
    );
  }

  // Default English
  return (
    `🌟 *Coimbatore Startup Community (CSC Circle) — Fortnightly Pulse Check-In* 🚀\n\n` +
    `Hello Founders & Builders! As part of our fortnightly community check-in, we would love to know how your entrepreneurial journey is shaping up this month:\n\n` +
    `1️⃣ *What did you build, launch, or achieve recently?*\n` +
    `   Share your latest product milestones, customer wins, or hiring updates with the community!\n\n` +
    `2️⃣ *Are you facing any startup roadblocks or challenges?*\n` +
    `   Whether it's go-to-market traction, tech architecture, funding, or hiring—let us know so fellow CSC founders & mentors can support you.\n\n` +
    `3️⃣ *What topics or speaker sessions do you want in our next offline meetup?*\n` +
    `   Suggest topics directly by replying: *IDEA <your suggested topic or format>*\n\n` +
    `4️⃣ *Monthly Community Pulse Survey:*\n` +
    `   Help shape upcoming CSC initiatives, workshops, and founder perks:\n` +
    `   🔗 https://csc.logicintelligencetechnologies.in/survey/member-onboarding\n` +
    `   _(Note: If you have already completed this survey, please feel free to disregard this link!)_\n\n` +
    `Keep building and innovating from Coimbatore!\n\n` +
    CSC_WHATSAPP_FOOTER
  );
}
