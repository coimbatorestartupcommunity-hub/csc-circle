import {
  escapeHtml,
  renderLeadershipTeamStrip,
  renderCircularSocialIcons,
} from "./email-components";

export type NomuThemeVariant = "blue" | "sand" | "green";

export interface NomuEmailOptions {
  base: string;
  support: string;
  variant?: NomuThemeVariant;
  curvedHeading?: string;
  mainTitle: string;
  subtitle?: string;
  greeting?: string;
  body: string;
  heroBannerImage?: string;
  heroBannerAlt?: string;
  primaryButtonText?: string;
  primaryButtonUrl?: string;
  featureTitle?: string;
  featureItems?: Array<{
    title: string;
    description: string;
    badge?: string;
    image?: string;
  }>;
  htmlDetailsContent?: string;
  qrCodeMarkup?: string;
  customMarkup?: string;
}

/**
 * Template B: Exact replica of the Nomu High-Conversion Showcase design.
 * Features:
 * - Minimalist lowercase wordmark ("csc circle.") with circular logo
 * - Curved circular header text ("COIMBATORE STARTUP COMMUNITY")
 * - Rich dual-tone hero block (Soft Lavender/Blue, Warm Sand Clay, or Forest Green)
 * - Organic dripping / wavy section divider SVG
 * - Structured feature/pass cards with pill price badges
 * - Full 7-member leadership team strip
 * - High-contrast rounded pill action buttons
 * - Two-column clean footer with official CSC links, circular social icons, and legal disclaimers
 */
export function renderNomuShowcaseEmail(options: NomuEmailOptions): string {
  const {
    base,
    support,
    variant = "blue",
    curvedHeading = "COIMBATORE STARTUP COMMUNITY",
    mainTitle,
    subtitle = "Founder Network · Community Event Passes · Digital Ecosystem",
    greeting = "Hello Founder,",
    body,
    heroBannerImage,
    heroBannerAlt = "CSC Event Banner",
    primaryButtonText = "View in CSC Circle",
    primaryButtonUrl = `${base}/events`,
    featureTitle = "Verified Pass Tiers & Community Benefits",
    featureItems = [],
    htmlDetailsContent = "",
    qrCodeMarkup = "",
    customMarkup = "",
  } = options;

  // Theme Palette Definitions matching the Nomu three panels
  const themes = {
    blue: {
      heroBg: "#8B9FD8",
      heroText: "#FFFFFF",
      accentBg: "#3A4A7A",
      buttonBg: "#4C609C",
      buttonText: "#FFFFFF",
      canvasBg: "#F0F2F8",
      cardBg: "#FFFFFF",
      dripColor: "#8B9FD8",
      footerDrip: "#3A4A7A",
    },
    sand: {
      heroBg: "#E3DACB",
      heroText: "#2C2621",
      accentBg: "#615448",
      buttonBg: "#7A6C5D",
      buttonText: "#FFFFFF",
      canvasBg: "#F8F6F2",
      cardBg: "#FFFFFF",
      dripColor: "#E3DACB",
      footerDrip: "#615448",
    },
    green: {
      heroBg: "#1C6B38",
      heroText: "#FFFFFF",
      accentBg: "#0E3E1F",
      buttonBg: "#2B8C4D",
      buttonText: "#FFFFFF",
      canvasBg: "#EEF6F0",
      cardBg: "#FFFFFF",
      dripColor: "#1C6B38",
      footerDrip: "#0E3E1F",
    },
  };

  const theme = themes[variant];

  // SVG Dripping Wavy Divider
  const dripSvg = `
    <svg viewBox="0 0 600 50" width="100%" height="40" preserveAspectRatio="none" style="display:block;width:100%;height:38px;fill:${theme.dripColor};margin-bottom:-1px;">
      <path d="M0,0 L600,0 L600,10 C540,10 520,38 480,38 C440,38 430,12 390,12 C350,12 340,42 300,42 C260,42 250,14 210,14 C170,14 160,35 120,35 C80,35 60,10 0,10 Z"></path>
    </svg>
  `;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(mainTitle)}</title>
  <style>
    body, table, td, p, h1, h2, h3 {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${theme.canvasBg};color:#1A202C;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${theme.canvasBg};">
    <tbody>
      <tr>
        <td align="center" style="padding:28px 12px;">
          <!-- Master Container (600px) -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#FFFFFF;border-radius:28px;overflow:hidden;box-shadow:0 12px 36px rgba(0,0,0,0.07);">
            <tbody>

              <!-- TOP BAR: Minimalist Brand Header -->
              <tr>
                <td align="center" style="padding:22px 24px 18px;background-color:${theme.heroBg};">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                    <tr>
                      <td style="padding-right:8px;vertical-align:middle;">
                        <img src="${base}/brand/csc-icon.png" width="30" height="30" alt="CSC" style="display:block;width:30px;height:30px;border-radius:50%;" />
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="font-family:'Arial Black',Gadget,sans-serif;font-size:20px;font-weight:900;letter-spacing:-0.04em;color:${theme.heroText};text-transform:lowercase;">
                          csc circle.
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- HERO BANNER: Curved Typography & Bold Title -->
              <tr>
                <td align="center" style="padding:20px 32px 30px;background-color:${theme.heroBg};color:${theme.heroText};text-align:center;">
                  
                  <!-- Curved Badge Label -->
                  <div style="display:inline-block;padding:5px 16px;background:rgba(255,255,255,0.22);border-radius:999px;margin-bottom:16px;">
                    <span style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${theme.heroText};">
                      ${escapeHtml(curvedHeading)}
                    </span>
                  </div>

                  <h1 style="margin:0 0 10px;font-size:32px;line-height:38px;font-weight:900;letter-spacing:-0.03em;color:${theme.heroText};text-transform:uppercase;">
                    ${escapeHtml(mainTitle)}
                  </h1>

                  ${subtitle ? `<p style="margin:0 0 20px;font-size:13px;line-height:20px;opacity:0.92;color:${theme.heroText};max-width:440px;margin-left:auto;margin-right:auto;">${escapeHtml(subtitle)}</p>` : ""}

                  ${heroBannerImage ? `
                    <div style="max-width:460px;margin:18px auto 0;border-radius:18px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.18);">
                      <img src="${heroBannerImage}" width="460" alt="${escapeHtml(heroBannerAlt)}" style="display:block;width:100%;height:auto;max-height:260px;object-fit:cover;" />
                    </div>
                  ` : ""}
                </td>
              </tr>

              <!-- ORGANIC DRIPPING WAVY DIVIDER -->
              <tr>
                <td style="background-color:#FFFFFF;padding:0;line-height:0;">
                  ${dripSvg}
                </td>
              </tr>

              <!-- MAIN CONTENT BODY -->
              <tr>
                <td style="padding:28px 36px 20px;background-color:#FFFFFF;">
                  
                  <p style="margin:0 0 14px;font-size:16px;line-height:26px;font-weight:700;color:#1A202C;">
                    ${escapeHtml(greeting)}
                  </p>

                  <p style="margin:0 0 20px;font-size:15px;line-height:26px;color:#4A5568;white-space:pre-line;">
                    ${escapeHtml(body)}
                  </p>

                  <!-- Digital Pass QR Container (if confirmed pass) -->
                  ${qrCodeMarkup}

                  <!-- Structured Event / Verification Details -->
                  ${htmlDetailsContent}

                  <!-- Optional Custom Content (1-Click verification buttons, etc.) -->
                  ${customMarkup}

                  <!-- Feature Tier Cards (if provided) -->
                  ${featureItems.length > 0 ? `
                    <div style="margin:28px 0 16px;">
                      <h3 style="font-size:14px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#4A5568;text-align:center;margin:0 0 16px;">
                        ${escapeHtml(featureTitle)}
                      </h3>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          ${featureItems.map((item) => `
                            <td valign="top" style="padding:0 6px;width:${100 / featureItems.length}%;">
                              <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:16px 12px;text-align:center;">
                                ${item.badge ? `<span style="display:inline-block;padding:3px 10px;background:${theme.buttonBg};color:#FFFFFF;font-size:10px;font-weight:700;border-radius:999px;margin-bottom:8px;">${escapeHtml(item.badge)}</span>` : ""}
                                <h4 style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1E293B;">${escapeHtml(item.title)}</h4>
                                <p style="margin:0;font-size:11px;line-height:16px;color:#64748B;">${escapeHtml(item.description)}</p>
                              </div>
                            </td>
                          `).join("")}
                        </tr>
                      </table>
                    </div>
                  ` : ""}

                  <!-- Primary CTA Button -->
                  <div style="text-align:center;margin:32px 0 16px;">
                    <a href="${primaryButtonUrl}" style="display:inline-block;padding:15px 36px;background-color:${theme.buttonBg};color:${theme.buttonText};font-size:15px;font-weight:800;text-decoration:none;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,0.12);">
                      ${escapeHtml(primaryButtonText)} &rarr;
                    </a>
                  </div>

                  <!-- ALL 7 CORE LEADERSHIP MEMBERS STRIP -->
                  ${renderLeadershipTeamStrip(base)}

                </td>
              </tr>

              <!-- FOOTER WITH QUICK LINKS & CIRCULAR SOCIAL ICONS -->
              <tr>
                <td style="padding:32px 32px 28px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
                  
                  <!-- Quick links navigation -->
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 18px;">
                    <tr>
                      <td style="padding:0 12px;">
                        <a href="${base}/events" style="font-size:12px;font-weight:700;color:#4A5568;text-decoration:none;">Community Events</a>
                      </td>
                      <td style="padding:0 12px;">
                        <a href="${base}/directory" style="font-size:12px;font-weight:700;color:#4A5568;text-decoration:none;">Founder Directory</a>
                      </td>
                      <td style="padding:0 12px;">
                        <a href="${base}/profile/id-card" style="font-size:12px;font-weight:700;color:#4A5568;text-decoration:none;">Digital ID Card</a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0 0 16px;font-size:12px;color:#718096;">
                    Questions? Visit <a href="${base}" style="color:#2B6CB0;text-decoration:none;font-weight:700;">CSC Circle</a> or email <a href="mailto:${escapeHtml(support)}" style="color:#2B6CB0;text-decoration:none;font-weight:700;">${escapeHtml(support)}</a>
                  </p>

                  <hr style="width:140px;margin:0 auto 18px;border:0;border-top:1px solid #E2E8F0;">

                  <!-- Website-matched Circular Social Icons Bar -->
                  ${renderCircularSocialIcons(base, support)}

                  <p style="margin:0 0 6px;font-size:11px;color:#718096;">
                    CSC Circle &middot; Coimbatore Startup Community &middot; Coimbatore, Tamil Nadu &middot; Estd 2026
                  </p>
                  <p style="margin:8px 0 0;font-size:10px;line-height:16px;color:#A0AEC0;">
                    Connect. Build. Grow.<br>
                    &copy; ${new Date().getFullYear()} Coimbatore Startup Community. All rights reserved.
                  </p>
                </td>
              </tr>

            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
}
