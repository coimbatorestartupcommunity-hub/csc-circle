import { CSC_WHATSAPP_FOOTER } from "../utils/message-template.js";

export type SupportedLanguage = "en" | "ta" | "tanglish";

/**
 * WhatsApp Interactive Quick Navigation Menu
 * Provides fast 1-tap/1-reply navigation for events, digital passes, matchmaking, ideas, and support.
 */
export function formatQuickMenu(language: SupportedLanguage = "en"): string {
  if (language === "ta") {
    return (
      `🌟 *கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டி (CSC Circle) — விரைவு வழிகாட்டி*\n\n` +
      `வணக்கம்! தேவையான தகவலைப் பெற கீழே உள்ள எண் அல்லது முக்கிய வார்த்தையை (Keyword) அனுப்பவும்:\n\n` +
      `1️⃣ *நிகழ்வுகள் & கூட்டங்கள்* (பதில்: *1* அல்லது *EVENTS*)\n` +
      `   அடுத்த ஈவென்ட்கள், நேரம் மற்றும் பதிவு இணைப்புகள்.\n\n` +
      `2️⃣ *டிஜிட்டல் அடையாள அட்டை & பாஸ்* (பதில்: *2* அல்லது *PASS*)\n` +
      `   உறுப்பினர் அட்டை மற்றும் நிகழ்வு நுழைவு QR கோட்.\n\n` +
      `3️⃣ *தொழில்முனைவோர் இணைப்பு* (பதில்: *3* அல்லது *MATCH <துறை>*)\n` +
      `   கோவையின் ஸ்டார்ட்அப்கள், இணை-நிறுவனர்கள் & முதலீட்டாளர்கள்.\n\n` +
      `4️⃣ *கருத்துக்கள் & யோசனைகள்* (பதில்: *4* அல்லது *IDEA <உங்கள் யோசனை>*)\n` +
      `   அடுத்த நிகழ்வுக்கான தலைப்புகள் மற்றும் பரிந்துரைகள்.\n\n` +
      `5️⃣ *அதிகாரப்பூர்வ வாட்ஸ்அப் குழு* (பதில்: *5* அல்லது *COMMUNITY*)\n` +
      `   CSC நெட்வொர்க் மற்றும் தலைமைக் குழுவில் இணைய.\n\n` +
      `6️⃣ *நிர்வாகிகள் உதவி* (பதில்: *6* அல்லது *SUPPORT*)\n` +
      `   CSC ஒருங்கிணைப்பாளர்களுடன் நேரடியாகப் பேச.\n\n` +
      `💡 _உங்களுக்குத் தேவையான எந்த ஒரு கேள்வியையும் நேரடியாகத் தட்டச்சு செய்தும் கேட்கலாம்!_\n\n` +
      CSC_WHATSAPP_FOOTER
    );
  }

  if (language === "tanglish") {
    return (
      `🌟 *CSC Circle WhatsApp — Quick Menu & Options*\n\n` +
      `Vanakkam! Neenga thedura details-ku keezhe irukura number or keyword-ah reply pannunga:\n\n` +
      `1️⃣ *Upcoming Events* (Reply *1* or *EVENTS*)\n` +
      `   Adutha meetups, workshops & venue details.\n\n` +
      `2️⃣ *My Pass & Digital ID* (Reply *2* or *PASS*)\n` +
      `   Unga membership card & event QR entry ticket.\n\n` +
      `3️⃣ *Founder Matchmaking* (Reply *3* or *MATCH <sector>*)\n` +
      `   Find co-founders, startups & tech partners in Kovai.\n\n` +
      `4️⃣ *Suggest Meetup Idea* (Reply *4* or *IDEA <your text>*)\n` +
      `   Next event-la enna topics venum-nu share pannunga.\n\n` +
      `5️⃣ *Official WhatsApp Group* (Reply *5* or *COMMUNITY*)\n` +
      `   Join CSC verified founder network group.\n\n` +
      `6️⃣ *Human Support / Help* (Reply *6* or *SUPPORT*)\n` +
      `   Connect directly with CSC core organizers.\n\n` +
      `💡 _Or simple-ah unga question-ah text message-ah send pannunga, instant-ah answer panren!_\n\n` +
      CSC_WHATSAPP_FOOTER
    );
  }

  // Default English
  return (
    `🌟 *Coimbatore Startup Community (CSC Circle) — Quick Navigation*\n\n` +
    `Welcome! Please reply with an option number or keyword to explore:\n\n` +
    `1️⃣ *Upcoming Meetups & Workshops* (Reply *1* or *EVENTS*)\n` +
    `   View scheduled offline sessions, speaker details & RSVPs.\n\n` +
    `2️⃣ *Digital Member ID & Event Passes* (Reply *2* or *PASS*)\n` +
    `   Retrieve your active membership pass & event gate QR code.\n\n` +
    `3️⃣ *Founder & Co-Founder Matchmaking* (Reply *3* or *MATCH <sector>*)\n` +
    `   Discover builders, startups, and tech collaborators in Coimbatore.\n\n` +
    `4️⃣ *Suggest an Event Idea / Feedback* (Reply *4* or *IDEA <suggestion>*)\n` +
    `   Tell us what topics, speakers, or workshops you want next.\n\n` +
    `5️⃣ *Official Community Group* (Reply *5* or *COMMUNITY*)\n` +
    `   Join our verified WhatsApp Group and social channels.\n\n` +
    `6️⃣ *Human Support & Organizers* (Reply *6* or *SUPPORT*)\n` +
    `   Escalate an inquiry directly to the CSC organizing committee.\n\n` +
    `💡 _You can also type any general question in plain English, Tamil, or Tanglish at any time!_\n\n` +
    CSC_WHATSAPP_FOOTER
  );
}
