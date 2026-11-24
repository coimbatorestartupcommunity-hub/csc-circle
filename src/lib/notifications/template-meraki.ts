import {
  escapeHtml,
  renderMerakiLeadershipRoster,
  renderTechnicalPartnerBadge,
  renderCircularSocialIcons,
  renderWebsiteFooterNav,
} from "./email-components";

export interface MerakiEmailOptions {
  base: string;
  support: string;
  badgeText?: string;
  headline: string;
  headlineItalic?: string;
  greeting?: string;
  body: string;
  polaroidImage?: string;
  polaroidCaption?: string;
  thumbtackNote?: string;
  gridNote?: string;
  checklistItems?: string[];
  buttonText?: string;
  buttonUrl?: string;
  htmlDetailsContent?: string;
  customMarkup?: string;
}

/**
 * Template A: Official MERAKI Editor Master Email Template.
 * Single Master Standard across 100% of CSC Circle emails.
 *
 * Engineered with:
 * - Fluid mobile responsiveness (zero clipping, zero cut-off, zero horizontal overflow)
 * - Olive & Cream Candy-Stripe header with taped polaroid card
 * - Vintage typewriter monospace notes + Editorial Serif typography
 * - Green thumbtack note card + Light sage grid insight card
 * - Official 7 Core Leaders in a 3 (top) + 4 (bottom) executive layout
 * - 3 Curated Ecosystem Story photos (CSC Connect 2, Outlier Meetup, Outlier Cohort Poster)
 * - Official Technical Partner badge for Logic Intelligence Technologies with brain circuit emblem
 * - 5 Circular social badges (WhatsApp, AI WhatsApp Agent, LinkedIn, Instagram, Email)
 * - 7 Official website governance links (Help, Contact, Guidelines, Membership, Privacy, Terms, Security)
 */
export function renderMerakiEditorialEmail(options: MerakiEmailOptions): string {
  const {
    base,
    support,
    badgeText = "COIMBATORE STARTUP COMMUNITY ✦",
    headline,
    headlineItalic,
    greeting = "Hello Founder,",
    body,
    polaroidImage = `${base}/brand/csc-homepage-banner.png`,
    polaroidCaption = "Building the Coimbatore Founder Network",
    thumbtackNote = "Consistency matters more than frequency in early ventures.",
    gridNote = "A clear vision and repeatable execution perform far better than frantic efforts without a community strategy.",
    checklistItems = [
      "Prioritizing deep founder connections over superficial vanity metrics",
      "Sharing real operational learnings and building high-trust cohorts",
      "Leveraging Coimbatore's manufacturing & tech talent pool",
    ],
    buttonText = "Explore CSC Community Hub",
    buttonUrl = `${base}/events`,
    htmlDetailsContent = "",
    customMarkup = "",
  } = options;

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>${escapeHtml(headline)}</title>
  <style type="text/css">
    body, table, td, p, h1, h2, h3, div, span, a {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      box-sizing: border-box;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #EFECE6;
      color: #2D3748;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    table {
      border-collapse: collapse !important;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }
    .mono-note {
      font-family: 'Courier New', Courier, ui-monospace, monospace;
    }
    .serif-title {
      font-family: 'Lora', Georgia, 'Times New Roman', serif;
    }
    @media only screen and (max-width: 600px) {
      .outer-td {
        padding: 0 !important;
        margin: 0 !important;
      }
      .master-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 20px !important;
        -webkit-border-radius: 20px !important;
        -moz-border-radius: 20px !important;
      }
      .stripe-section {
        padding: 20px 12px 24px !important;
      }
      .polaroid-card {
        padding: 12px 12px 16px !important;
        margin: 0 auto !important;
      }
      .polaroid-img {
        max-height: 180px !important;
      }
      .main-headline {
        font-size: 20px !important;
        line-height: 26px !important;
      }
      .content-section {
        padding: 22px 16px 16px !important;
      }
      .charcoal-section {
        padding: 24px 14px 20px !important;
      }
      .highlight-photo {
        height: 68px !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#EFECE6;color:#2D3748;">
  <!-- Outer Canvas Table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background-color:#EFECE6;margin:0;padding:0;">
    <tbody>
      <tr>
        <td class="outer-td" align="center" style="padding:0;margin:0;width:100%;">
          
          <!-- Master Email Box (600px max, 100% fluid on mobile, 4-corner curved layout) -->
          <table role="presentation" class="master-container" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:separate;border-spacing:0;background-color:#FFFFFF;border-radius:24px;-webkit-border-radius:24px;-moz-border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);margin:0 auto;">
            <tbody>

              <!-- TOP BAR: Brand Emblem -->
              <tr>
                <td align="center" style="padding:16px 20px 14px;background-color:#FAF9F6;border-bottom:1px solid #EAE6DF;border-top-left-radius:24px;border-top-right-radius:24px;-webkit-border-top-left-radius:24px;-webkit-border-top-right-radius:24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                    <tr>
                      <td style="padding-right:10px;vertical-align:middle;">
                        <img src="${base}/brand/csc-icon.png" width="32" height="32" alt="CSC" style="display:block;width:32px;height:32px;border-radius:50%;border:1px solid #D6D0C4;" />
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="font-family:'Courier New',monospace;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#4A5568;">
                          COIMBATORE STARTUP COMMUNITY
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- SECTION 1: Vintage Olive/Cream Candy Stripes with Polaroid Cutout -->
              <tr>
                <td class="stripe-section" style="padding:32px 20px 36px;background:repeating-linear-gradient(90deg, #8A9A5B 0px, #8A9A5B 20px, #FAF7F0 20px, #FAF7F0 40px);text-align:center;">
                  
                  <!-- Polaroid Frame -->
                  <div class="polaroid-card" style="max-width:440px;margin:0 auto;background:#FFFFFF;border-radius:12px;padding:18px 18px 22px;box-shadow:0 12px 28px rgba(0,0,0,0.18);position:relative;text-align:center;box-sizing:border-box;">
                    
                    <!-- Top Paper Tape Accent -->
                    <div style="width:100px;height:22px;background:#E7DEBD;opacity:0.92;margin:-26px auto 12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);transform:rotate(-1.5deg);"></div>
                    
                    <!-- Author/Badge Chip -->
                    <div style="display:inline-block;padding:4px 12px;background:#F1EFEA;border-radius:4px;margin-bottom:12px;">
                      <span class="mono-note" style="font-size:10px;font-weight:700;letter-spacing:0.04em;color:#4A5568;">
                        ${escapeHtml(badgeText)}
                      </span>
                    </div>

                    <!-- Main Headline -->
                    <h1 class="serif-title main-headline" style="margin:0 0 14px;font-size:24px;line-height:32px;font-weight:600;color:#1A202C;">
                      ${escapeHtml(headline)}
                      ${headlineItalic ? `<br><span style="font-style:italic;color:#7D8B53;font-size:0.9em;">(${escapeHtml(headlineItalic)})</span>` : ""}
                    </h1>

                    <!-- Polaroid Image -->
                    <div style="background:#000000;border-radius:8px;overflow:hidden;margin:0 auto;box-shadow:inset 0 0 8px rgba(0,0,0,0.2);">
                      <img class="polaroid-img" src="${polaroidImage}" width="404" alt="${escapeHtml(polaroidCaption)}" style="display:block;width:100%;height:auto;max-height:240px;object-fit:cover;" />
                    </div>

                    ${polaroidCaption ? `<p class="mono-note" style="margin:8px 0 0;font-size:10px;color:#718096;text-align:center;">${escapeHtml(polaroidCaption)}</p>` : ""}
                  </div>

                </td>
              </tr>

              <!-- SECTION 2: The Core Message on Soft Cream Paper -->
              <tr>
                <td class="content-section" style="padding:32px 32px 20px;background-color:#FFFFFF;">
                  
                  <!-- Pink Script Section Heading -->
                  <div style="text-align:center;margin-bottom:20px;">
                    <span class="serif-title" style="font-size:22px;font-style:italic;color:#C45876;display:block;margin-bottom:2px;">
                      The Biggest Step
                    </span>
                    <span class="mono-note" style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#718096;font-weight:700;">
                      For Our Ecosystem
                    </span>
                  </div>

                  <!-- Greeting & Message Body -->
                  <p style="margin:0 0 14px;font-size:15px;line-height:24px;color:#2D3748;font-weight:600;">
                    ${escapeHtml(greeting)}
                  </p>
                  <p style="margin:0 0 22px;font-size:14px;line-height:24px;color:#4A5568;white-space:pre-line;">
                    ${escapeHtml(body)}
                  </p>

                  <!-- Custom / Pass QR / OTP Verification Content -->
                  ${customMarkup}

                  <!-- Embedded Structured Details Table -->
                  ${htmlDetailsContent}

                  <!-- Green Thumbtack Note Card -->
                  <div style="margin:24px auto;max-width:440px;background:#96A76E;color:#FFFFFF;padding:14px 18px;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.1);position:relative;transform:rotate(-1deg);box-sizing:border-box;">
                    <div style="width:12px;height:12px;border-radius:50%;background:#D9383A;position:absolute;top:-6px;left:50%;margin-left:-6px;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
                    <p class="serif-title" style="margin:0;font-size:16px;line-height:22px;font-style:italic;text-align:center;color:#FFFFFF;font-weight:600;">
                      &ldquo;${escapeHtml(thumbtackNote)}&rdquo;
                    </p>
                  </div>

                  <!-- Light Sage Grid Notebook Card -->
                  <div style="margin:24px auto;max-width:460px;background:#F7F9F5;border:1px solid #D5E2D0;border-radius:12px;padding:18px 14px;background-image:linear-gradient(#E5EFE1 1px, transparent 1px), linear-gradient(90deg, #E5EFE1 1px, transparent 1px);background-size:20px 20px;box-sizing:border-box;">
                    <p class="mono-note" style="margin:0 0 12px;font-size:12px;line-height:20px;color:#2D3748;border-left:3px solid #7D8B53;padding-left:10px;">
                      ${escapeHtml(gridNote)}
                    </p>

                    <!-- Checkable Bullet Grid -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
                      <tr>
                        ${checklistItems.map((item) => `
                          <td valign="top" style="padding:0 4px;width:33.33%;box-sizing:border-box;">
                            <div style="background:#FFFFFF;border:1px solid #DCE6D9;border-radius:8px;padding:8px 6px;text-align:center;min-height:64px;">
                              <span style="display:block;font-size:13px;color:#7D8B53;margin-bottom:3px;">✦</span>
                              <span class="mono-note" style="font-size:9px;line-height:13px;color:#4A5568;display:block;">
                                ${escapeHtml(item)}
                              </span>
                            </div>
                          </td>
                        `).join("")}
                      </tr>
                    </table>
                  </div>

                  <!-- ALL 7 CORE LEADERSHIP MEMBERS (3+4 EXECUTIVE SPLIT) -->
                  ${renderMerakiLeadershipRoster(base)}

                  <!-- Primary Soft Pill Action Button -->
                  <div style="text-align:center;margin:28px 0 10px;">
                    <a href="${buttonUrl}" style="display:inline-block;padding:14px 30px;background-color:#C4D7ED;color:#2A4365;font-size:14px;font-weight:700;letter-spacing:0.04em;text-decoration:none;border-radius:999px;box-shadow:0 3px 8px rgba(196,215,237,0.5);">
                      ${escapeHtml(buttonText)} &rarr;
                    </a>
                  </div>

                </td>
              </tr>

              <!-- SECTION 3: Deep Charcoal Bottom Section with Community Highlights & Social Bar -->
              <tr>
                <td class="charcoal-section" style="padding:32px 24px 28px;background-color:#1A1A1A;color:#E2E8F0;text-align:center;border-bottom-left-radius:24px;border-bottom-right-radius:24px;-webkit-border-bottom-left-radius:24px;-webkit-border-bottom-right-radius:24px;">
                  
                  <p class="mono-note" style="margin:0 0 16px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#A0AEC0;">
                    Coimbatore Startup Community · Ecosystem Highlights
                  </p>

                  <!-- 3 Highlight Photos Row -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;margin:0 auto 22px;border-collapse:collapse;">
                    <tr>
                      <td align="center" style="padding:0 3px;width:33.33%;box-sizing:border-box;">
                        <div style="background:#2D3748;border-radius:8px;overflow:hidden;border:1px solid #4A5568;">
                          <img class="highlight-photo" src="${base}/events/csc-connect-edition-2-cover.webp" width="130" height="85" alt="CSC Connect Edition 2" style="display:block;width:100%;height:80px;object-fit:cover;" />
                        </div>
                      </td>
                      <td align="center" style="padding:0 3px;width:33.33%;box-sizing:border-box;">
                        <div style="background:#2D3748;border-radius:8px;overflow:hidden;border:1px solid #4A5568;">
                          <img class="highlight-photo" src="${base}/events/community-outlier-meetup.jpg" width="130" height="85" alt="Outlier Community Meetup" style="display:block;width:100%;height:80px;object-fit:cover;" />
                        </div>
                      </td>
                      <td align="center" style="padding:0 3px;width:33.33%;box-sizing:border-box;">
                        <div style="background:#2D3748;border-radius:8px;overflow:hidden;border:1px solid #4A5568;">
                          <img class="highlight-photo" src="${base}/events/community-outlier-poster.jpg" width="130" height="85" alt="Outlier Community Cohort" style="display:block;width:100%;height:80px;object-fit:cover;" />
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Instagram Follow Button -->
                  <div style="margin:0 auto 18px;">
                    <a href="https://www.instagram.com/coimbatorestartupcommunity/" style="display:inline-block;padding:10px 24px;background-color:#C4D7ED;color:#1A202C;font-size:12px;font-weight:700;border-radius:999px;text-decoration:none;">
                      Follow us on Instagram (@coimbatorestartupcommunity)
                    </a>
                  </div>

                  <!-- Website-matched Circular Social Icons Bar -->
                  ${renderCircularSocialIcons(base, support)}

                  <!-- Official Technical Partner Badge (Logic Intelligence Technologies) -->
                  ${renderTechnicalPartnerBadge(base)}

                  <hr style="border:0;border-top:1px solid #2D3748;margin:20px 0 16px;">

                  <!-- 7 Official Website Legal & Governance Links -->
                  ${renderWebsiteFooterNav(base)}

                  <p class="mono-note" style="margin:0 0 14px;font-size:10px;color:#A0AEC0;">
                    Questions? Visit <a href="${base}" style="color:#C4D7ED;text-decoration:none;font-weight:600;">CSC Circle</a> or email <a href="mailto:${escapeHtml(support)}" style="color:#C4D7ED;text-decoration:none;font-weight:600;">${escapeHtml(support)}</a>
                  </p>

                  <!-- Legal & Footer Links -->
                  <p style="margin:0 0 6px;font-size:10px;line-height:16px;color:#718096;">
                    CSC Circle &middot; Coimbatore Startup Community &middot; Coimbatore, Tamil Nadu &middot; Estd 2026<br>
                    Connect. Build. Grow.
                  </p>
                  <p style="margin:0;font-size:9px;color:#4A5568;">
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
