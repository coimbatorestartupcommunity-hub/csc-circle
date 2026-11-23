import { CSC_WHATSAPP_FOOTER } from "../utils/message-template.js";

export const CSC_COMMUNITY_LINKS = {
  whatsappGroup: "https://chat.whatsapp.com/EsMyFEUTzT0G3MpMLkUNhB?s=cl&p=a&iam=2",
  instagram: "https://www.instagram.com/coimbatorestartupcommunity/",
  linkedin: "https://www.linkedin.com/in/csc-coimbatore-startup-community-b27b0b44b?utm_source=share_via&utm_content=profile&utm_medium=member_android",
  techEmail: "hello@logicintelligencetechnologies.in",
  adminEmail: "coimbatorestartupcommunity@gmail.com",
  contactUrl: "https://csc.logicintelligencetechnologies.in/contact",
  portalUrl: "https://csc.logicintelligencetechnologies.in",
} as const;

export type SupportedLanguage = "en" | "ta" | "tanglish";

/**
 * Formats the Official Coimbatore Startup Community (CSC Circle) WhatsApp Group
 * onboarding invitation, engagement guidelines, social links, and security/feedback channels.
 */
export function formatCommunityHubInvitation(language: SupportedLanguage = "en"): string {
  if (language === "ta") {
    return (
      `🚀 *கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டி (CSC Circle) அதிகாரப்பூர்வ வாட்ஸ்அப் குழுவில் இணையுங்கள்!*\n\n` +
      `கோவையின் முன்னணி நிறுவனர்கள், பில்டர்கள் மற்றும் தொழில்முனைவோர் கூட்டமைப்பில் உங்களை அன்புடன் வரவேற்கிறோம்!\n\n` +
      `🔗 *வாட்ஸ்அப் குழுவில் இணைய:* \n${CSC_COMMUNITY_LINKS.whatsappGroup}\n\n` +
      `🌟 *குழுவில் இணைந்தவுடன் நீங்கள் செய்ய வேண்டியவை:*\n` +
      `• *உங்களை அறிமுகப்படுத்துங்கள்:* உங்கள் பெயர், உங்கள் ஸ்டார்ட்அப் / வணிக முயற்சி மற்றும் உங்கள் பார்வையைப் பகிருங்கள்.\n` +
      `• *கலந்துரையாடி நெட்வொர்க் செய்யுங்கள்:* சக நிறுவனர்களுடன் இணைந்திருங்கள், யோசனைகளைப் பரிமாறிக்கொள்ளுங்கள் மற்றும் கூட்டணியை உருவாக்குங்கள்.\n` +
      `• *வாய்ப்புகளைப் பகிருங்கள்:* வளர்ச்சி மைல்கற்கள், புதிய வேலைவாய்ப்புகள் மற்றும் கூட்டு முயற்சிகளைப் பகிருங்கள்.\n\n` +
      `📱 *சமூக வலைத்தளங்களில் பின்தொடர:*\n` +
      `• *Instagram:* ${CSC_COMMUNITY_LINKS.instagram}\n` +
      `• *LinkedIn:* ${CSC_COMMUNITY_LINKS.linkedin}\n\n` +
      `🛡️ *கருத்துக்கள், ஆலோசனைகள் மற்றும் பாதுகாப்பு விசாரணைகள்:*\n` +
      `ஏதேனும் கருத்துக்கள், வழிகாட்டுதல் அல்லது பாதுகாப்பு தொடர்பான தகவல்களைத் தெரிவிக்க:\n` +
      `📧 மின்னஞ்சல்: ${CSC_COMMUNITY_LINKS.techEmail} / ${CSC_COMMUNITY_LINKS.adminEmail}\n` +
      `🌐 இணையதளம்: ${CSC_COMMUNITY_LINKS.contactUrl}\n\n` +
      CSC_WHATSAPP_FOOTER
    );
  }

  if (language === "tanglish") {
    return (
      `🚀 *Join Coimbatore Startup Community (CSC Circle) Official WhatsApp Group!*\n\n` +
      `Namma Coimbatore-oda active founder & builder ecosystem-la ungalai anbudan varaverkirom!\n\n` +
      `🔗 *CSC WhatsApp Group Link:*\n${CSC_COMMUNITY_LINKS.whatsappGroup}\n\n` +
      `🌟 *Group-la join pannadhukku approm:*\n` +
      `• *Self-Introduction Kudunga:* Unga name, startup / venture idea, and unga vision pathi introduce pannunga.\n` +
      `• *Active-ah Engage & Network Pannunga:* Co-founders, mentors & builders kooda discuss panni collaborate pannunga.\n` +
      `• *Opportunities Share Pannunga:* Hiring updates, startup milestones & collaboration opportunities-ah share pannunga.\n\n` +
      `📱 *Follow Our Social Channels:*\n` +
      `• *Instagram:* ${CSC_COMMUNITY_LINKS.instagram}\n` +
      `• *LinkedIn:* ${CSC_COMMUNITY_LINKS.linkedin}\n\n` +
      `🛡️ *Feedback, Insights & Security Support:*\n` +
      `Unga insights, feedback or security issues edhavadhu report pannanum-na, engaloda team-ku mail pannunga:\n` +
      `📧 Email: ${CSC_COMMUNITY_LINKS.techEmail} / ${CSC_COMMUNITY_LINKS.adminEmail}\n` +
      `🌐 Contact Page: ${CSC_COMMUNITY_LINKS.contactUrl}\n\n` +
      CSC_WHATSAPP_FOOTER
    );
  }

  // Default English
  return (
    `🚀 *Join the Coimbatore Startup Community (CSC Circle) Official WhatsApp Group!*\n\n` +
    `We are delighted to invite you to our vibrant founder and creator ecosystem. Connect, build, and grow alongside fellow entrepreneurs in Coimbatore!\n\n` +
    `🔗 *Join CSC WhatsApp Group:*\n${CSC_COMMUNITY_LINKS.whatsappGroup}\n\n` +
    `🌟 *What to do when you join:*\n` +
    `• *Introduce Yourself:* Share your name, your venture/startup idea, and what you are building.\n` +
    `• *Engage & Network:* Discuss ideas, seek collaborations, exchange industry insights, and meet mentors.\n` +
    `• *Share Opportunities:* Post milestones, hiring requests, or collaborative project opportunities.\n\n` +
    `📱 *Follow Our Official Social Channels:*\n` +
    `• *Instagram:* ${CSC_COMMUNITY_LINKS.instagram}\n` +
    `• *LinkedIn:* ${CSC_COMMUNITY_LINKS.linkedin}\n\n` +
    `🛡️ *Feedback, Insights & Security Inquiries:*\n` +
    `Have ecosystem suggestions, feedback, or need to report a security/technical issue? Reach out directly to our team:\n` +
    `📧 Email: ${CSC_COMMUNITY_LINKS.techEmail} / ${CSC_COMMUNITY_LINKS.adminEmail}\n` +
    `🌐 Web Portal: ${CSC_COMMUNITY_LINKS.contactUrl}\n\n` +
    CSC_WHATSAPP_FOOTER
  );
}
