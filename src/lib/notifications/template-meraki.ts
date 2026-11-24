import {
  escapeHtml,
  renderEditorialLeadershipGrid,
  renderCircularSocialIcons,
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
 * Template A: Exact replica of the Meraki Editorial Journal design.
 * Features:
 * - Olive & Cream Candy-Stripe header (#7D8B53 & #FAF7F0)
 * - Taped paper polaroid hero card with shadow
 * - Elegant Serif italic typography + Typewriter monospace notes
 * - Red thumbtack pinned note card ("Consistency matters more than frequency")
 * - Light-green notebook grid section with checkable insight bullets
 * - Full 7-member leadership team roster
 * - Pastel pill button (#C4D7ED)
 * - Deep charcoal bottom container (#1C1C1E) with 3 photo story highlights and Instagram CTA
 * - Circular social icon badges (WhatsApp, WhatsApp AI Agent, LinkedIn, Instagram, Email)
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
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(headline)}</title>
  <style>
    @font-face {
      font-family: 'Lora';
      font-style: italic;
      font-weight: 500;
      src: local('Georgia'), serif;
    }
    body, table, td, p, h1 {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .mono-note {
      font-family: 'Courier New', Courier, ui-monospace, monospace;
    }
    .serif-title {
      font-family: 'Lora', Georgia, 'Times New Roman', serif;
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#EFECE6;color:#2D3748;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EFECE6;">
    <tbody>
      <tr>
        <td align="center" style="padding:28px 12px;">
          <!-- Master Container (600px) -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
            <tbody>

              <!-- TOP BAR: Brand Emblem -->
              <tr>
                <td align="center" style="padding:18px 24px 14px;background-color:#FAF9F6;border-bottom:1px solid #EAE6DF;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                    <tr>
                      <td style="padding-right:12px;vertical-align:middle;">
                        <img src="${base}/brand/csc-icon.png" width="34" height="34" alt="CSC" style="display:block;width:34px;height:34px;border-radius:50%;border:1px solid #D6D0C4;" />
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="font-family:'Courier New',monospace;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#4A5568;">
                          COIMBATORE STARTUP COMMUNITY
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- SECTION 1: Vintage Olive/Cream Candy Stripes with Polaroid Cutout -->
              <tr>
                <td style="padding:32px 24px 36px;background:repeating-linear-gradient(90deg, #8A9A5B 0px, #8A9A5B 24px, #FAF7F0 24px, #FAF7F0 48px);text-align:center;">
                  
                  <!-- Polaroid Frame -->
                  <div style="max-width:440px;margin:0 auto;background:#FFFFFF;border-radius:12px;padding:18px 18px 22px;box-shadow:0 12px 28px rgba(0,0,0,0.18);position:relative;text-align:center;">
                    
                    <!-- Top Paper Tape Accent -->
                    <div style="width:110px;height:24px;background:#E7DEBD;opacity:0.9;margin:-28px auto 14px;box-shadow:0 1px 3px rgba(0,0,0,0.1);transform:rotate(-1.5deg);"></div>
                    
                    <!-- Author/Badge Chip -->
                    <div style="display:inline-block;padding:4px 14px;background:#F1EFEA;border-radius:4px;margin-bottom:12px;">
                      <span class="mono-note" style="font-size:11px;font-weight:700;letter-spacing:0.04em;color:#4A5568;">
                        ${escapeHtml(badgeText)}
                      </span>
                    </div>

                    <!-- Main Headline -->
                    <h1 class="serif-title" style="margin:0 0 16px;font-size:26px;line-height:34px;font-weight:600;color:#1A202C;">
                      ${escapeHtml(headline)}
                      ${headlineItalic ? `<br><span style="font-style:italic;color:#7D8B53;">(${escapeHtml(headlineItalic)})</span>` : ""}
                    </h1>

                    <!-- Polaroid Image -->
                    <div style="background:#000000;border-radius:8px;overflow:hidden;margin:0 auto;box-shadow:inset 0 0 8px rgba(0,0,0,0.2);">
                      <img src="${polaroidImage}" width="404" alt="${escapeHtml(polaroidCaption)}" style="display:block;width:100%;height:auto;max-height:260px;object-fit:cover;" />
                    </div>

                    ${polaroidCaption ? `<p class="mono-note" style="margin:10px 0 0;font-size:11px;color:#718096;text-align:center;">${escapeHtml(polaroidCaption)}</p>` : ""}
                  </div>

                </td>
              </tr>

              <!-- SECTION 2: The Core Message on Soft Cream Paper -->
              <tr>
                <td style="padding:32px 36px 20px;background-color:#FFFFFF;">
                  
                  <!-- Pink Script Section Heading -->
                  <div style="text-align:center;margin-bottom:20px;">
                    <span class="serif-title" style="font-size:24px;font-style:italic;color:#C45876;display:block;margin-bottom:4px;">
                      The Biggest Step
                    </span>
                    <span class="mono-note" style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#718096;font-weight:700;">
                      For Our Ecosystem
                    </span>
                  </div>

                  <!-- Greeting & Message Body -->
                  <p style="margin:0 0 16px;font-size:15px;line-height:26px;color:#2D3748;font-weight:600;">
                    ${escapeHtml(greeting)}
                  </p>
                  <p style="margin:0 0 24px;font-size:15px;line-height:26px;color:#4A5568;white-space:pre-line;">
                    ${escapeHtml(body)}
                  </p>

                  <!-- Embedded Structured Details -->
                  ${htmlDetailsContent}

                  <!-- Green Thumbtack Note Card -->
                  <div style="margin:26px auto;max-width:440px;background:#96A76E;color:#FFFFFF;padding:16px 22px;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.1);position:relative;transform:rotate(-1deg);">
                    <div style="width:12px;height:12px;border-radius:50%;background:#D9383A;position:absolute;top:-6px;left:50%;margin-left:-6px;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
                    <p class="serif-title" style="margin:0;font-size:18px;line-height:24px;font-style:italic;text-align:center;color:#FFFFFF;font-weight:600;">
                      &ldquo;${escapeHtml(thumbtackNote)}&rdquo;
                    </p>
                  </div>

                  <!-- Light Sage Grid Notebook Card -->
                  <div style="margin:26px auto;max-width:460px;background:#F7F9F5;border:1px solid #D5E2D0;border-radius:12px;padding:22px;background-image:linear-gradient(#E5EFE1 1px, transparent 1px), linear-gradient(90deg, #E5EFE1 1px, transparent 1px);background-size:20px 20px;">
                    <p class="mono-note" style="margin:0 0 14px;font-size:13px;line-height:22px;color:#2D3748;border-left:3px solid #7D8B53;padding-left:12px;">
                      ${escapeHtml(gridNote)}
                    </p>

                    <!-- Checkable Bullet Grid -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                      <tr>
                        ${checklistItems.map((item) => `
                          <td valign="top" style="padding:0 6px;width:33.33%;">
                            <div style="background:#FFFFFF;border:1px solid #DCE6D9;border-radius:8px;padding:10px 8px;text-align:center;min-height:70px;">
                              <span style="display:block;font-size:14px;color:#7D8B53;margin-bottom:4px;">✦</span>
                              <span class="mono-note" style="font-size:10px;line-height:14px;color:#4A5568;display:block;">
                                ${escapeHtml(item)}
                              </span>
                            </div>
                          </td>
                        `).join("")}
                      </tr>
                    </table>
                  </div>

                  <!-- ALL 7 CORE LEADERSHIP MEMBERS STRIP -->
                  ${renderEditorialLeadershipGrid(base)}

                  <!-- Custom Content (Pass QR, verification link, etc.) -->
                  ${customMarkup}

                  <!-- Primary Soft Pill Action Button -->
                  <div style="text-align:center;margin:32px 0 12px;">
                    <a href="${buttonUrl}" style="display:inline-block;padding:14px 32px;background-color:#C4D7ED;color:#2A4365;font-size:14px;font-weight:700;letter-spacing:0.04em;text-decoration:none;border-radius:999px;box-shadow:0 3px 8px rgba(196,215,237,0.5);">
                      ${escapeHtml(buttonText)} &rarr;
                    </a>
                  </div>

                </td>
              </tr>

              <!-- SECTION 3: Deep Charcoal Bottom Section with Community Highlights & Social Bar -->
              <tr>
                <td style="padding:32px 28px 28px;background-color:#1A1A1A;color:#E2E8F0;text-align:center;">
                  
                  <p class="mono-note" style="margin:0 0 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#A0AEC0;">
                    Coimbatore Startup Community · Ecosystem Highlights
                  </p>

                  <!-- 3 Highlight Photos Row -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;margin:0 auto 24px;">
                    <tr>
                      <td align="center" style="padding:0 4px;width:33.33%;">
                        <div style="background:#2D3748;border-radius:8px;overflow:hidden;border:1px solid #4A5568;">
                          <img src="${base}/events/csc-connect-edition-2-cover.webp" width="130" height="90" alt="Meetup 1" style="display:block;width:100%;height:85px;object-fit:cover;" />
                        </div>
                      </td>
                      <td align="center" style="padding:0 4px;width:33.33%;">
                        <div style="background:#2D3748;border-radius:8px;overflow:hidden;border:1px solid #4A5568;">
                          <img src="${base}/events/csc-first-online-google-meet-cover.webp" width="130" height="90" alt="Meetup 2" style="display:block;width:100%;height:85px;object-fit:cover;" />
                        </div>
                      </td>
                      <td align="center" style="padding:0 4px;width:33.33%;">
                        <div style="background:#2D3748;border-radius:8px;overflow:hidden;border:1px solid #4A5568;">
                          <img src="${base}/brand/csc-homepage-banner.png" width="130" height="90" alt="Meetup 3" style="display:block;width:100%;height:85px;object-fit:cover;" />
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Instagram Follow Button -->
                  <div style="margin:0 auto 20px;">
                    <a href="https://www.instagram.com/coimbatorestartupcommunity/" style="display:inline-block;padding:11px 26px;background-color:#C4D7ED;color:#1A202C;font-size:12px;font-weight:700;border-radius:999px;text-decoration:none;">
                      Follow us on Instagram (@coimbatorestartupcommunity)
                    </a>
                  </div>

                  <!-- Website-matched Circular Social Icons Bar -->
                  ${renderCircularSocialIcons(base, support)}

                  <p class="mono-note" style="margin:0 0 16px;font-size:11px;color:#A0AEC0;">
                    Questions? Visit <a href="${base}" style="color:#C4D7ED;text-decoration:none;">CSC Circle</a> or email <a href="mailto:${escapeHtml(support)}" style="color:#C4D7ED;text-decoration:none;">${escapeHtml(support)}</a>
                  </p>

                  <hr style="border:0;border-top:1px solid #2D3748;margin:20px 0;">

                  <!-- Legal & Footer Links -->
                  <p style="margin:0 0 8px;font-size:11px;line-height:18px;color:#718096;">
                    CSC Circle &middot; Coimbatore, Tamil Nadu &middot; Estd 2026<br>
                    Connect. Build. Grow.
                  </p>
                  <p style="margin:0;font-size:10px;color:#4A5568;">
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
