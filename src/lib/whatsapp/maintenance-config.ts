/**
 * WhatsApp Gateway, AI Assistant & Phone Verification Maintenance Lock Configuration.
 * Defaults to the 24-hour maintenance window; supports dynamic API/DB override.
 */
export const WHATSAPP_MAINTENANCE_LOCK = {
  // Hardcoded baseline fallback: Nov 25, 2026, 04:55 AM IST
  FIXED_UNLOCK_EPOCH_MS: 1795562700000,
  
  isLocked(overrideEpoch?: number | null): boolean {
    const epoch = overrideEpoch ?? this.FIXED_UNLOCK_EPOCH_MS;
    return Date.now() < epoch;
  },

  getNotice(overrideReason?: string, overrideTamil?: string) {
    return {
      title: "WhatsApp Services Under Scheduled Maintenance",
      tamilTitle: overrideTamil || "WhatsApp சேவைகள் பராமரிப்பில் உள்ளன (24 மணி நேரம்)",
      message: overrideReason || "Our WhatsApp AI Agent, inbound assistance, and mobile OTP verification are paused for a 24-hour maintenance window. They will automatically resume in 24 hours.",
      tamilMessage: "எங்களின் WhatsApp AI உதவியாளர், பதில்கள் மற்றும் தொலைபேசி எண் சரிபார்ப்பு சேவை 24 மணி நேரத்திற்கு தற்காலிகமாக நிறுத்தி வைக்கப்பட்டுள்ளது. 24 மணி நேரத்திற்குப் பின் தானாகவே மீண்டும் செயல்படும்.",
      unlocksAt: "24 Hours from now",
    };
  }
};
