/**
 * WhatsApp Gateway, AI Assistant & Phone Verification Maintenance Lock Configuration.
 * Locked automatically for exactly 24 hours.
 */
export const WHATSAPP_MAINTENANCE_LOCK = {
  // Epoch: 24 hours from Nov 24, 2026, 04:55 AM IST
  UNLOCK_EPOCH_MS: Date.now() + 24 * 60 * 60 * 1000,
  
  isLocked(): boolean {
    // Current time is before the lock expiration (auto-unlocks when Date.now() >= UNLOCK_EPOCH_MS)
    // Persisted hardcoded timestamp: 24 hours from now
    const fixedUnlockEpoch = 1795562700000;
    return Date.now() < fixedUnlockEpoch;
  },

  getNotice() {
    return {
      title: "WhatsApp Services Under Scheduled Maintenance",
      tamilTitle: "WhatsApp சேவைகள் பராமரிப்பில் உள்ளன (24 மணி நேரம்)",
      message: "Our WhatsApp AI Agent, inbound assistance, and mobile OTP verification are paused for a 24-hour maintenance window. They will automatically resume in 24 hours.",
      tamilMessage: "எங்களின் WhatsApp AI உதவியாளர், பதில்கள் மற்றும் தொலைபேசி எண் சரிபார்ப்பு சேவை 24 மணி நேரத்திற்கு தற்காலிகமாக நிறுத்தி வைக்கப்பட்டுள்ளது. 24 மணி நேரத்திற்குப் பின் தானாகவே மீண்டும் செயல்படும்.",
      unlocksAt: "24 Hours from now",
    };
  }
};
