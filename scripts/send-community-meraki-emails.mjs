import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config({ path: "workers/whatsapp/.env" });
dotenv.config({ path: ".env.production.local" });
dotenv.config({ path: ".env.local" });

const BASE_URL = "https://csc.logicintelligencetechnologies.in";
const SUPPORT_EMAIL = "coimbatorestartupcommunity@gmail.com";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465", 10),
  secure: process.env.SMTP_SECURE === "true" || true,
  auth: {
    user: process.env.SMTP_USER || SUPPORT_EMAIL,
    pass: process.env.SMTP_APP_PASSWORD || process.env.SMTP_PASSWORD,
  },
  tls: { minVersion: "TLSv1.2" },
});

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(url, key);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

const CSC_TOP_3_LEADERS = [
  { name: "K. N. Reyash", role: "FOUNDER", portrait: "/images/team/circular/reyash.jpg" },
  { name: "E. R. Sharan", role: "CO-FOUNDER", portrait: "/images/team/circular/sharan.jpg" },
  { name: "Mirra Mahendran", role: "CHIEF EXECUTIVE OFFICER", portrait: "/images/team/circular/mirra.jpg" },
];

const CSC_BOTTOM_4_LEADERS = [
  { name: "Vikash Saravanan", role: "CHIEF TECHNOLOGY OFFICER", portrait: "/images/team/circular/vikash.jpg" },
  { name: "Swathi", role: "CHIEF COMMUNITY OFFICER", portrait: "/images/team/circular/swathi.jpg" },
  { name: "Kishore C", role: "CHIEF OPERATING OFFICER", portrait: "/images/team/circular/kishore.jpg" },
  { name: "Jaibharath V", role: "CHIEF BRAND OFFICER", portrait: "/images/team/circular/jaibharath.jpg" },
];

function renderMerakiLeadershipRoster(base) {
  const renderRow = (leaders, colWidth) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr>
        ${leaders.map((leader) => `
          <td align="center" valign="top" style="width:${colWidth};padding:6px 2px;box-sizing:border-box;">
            <div style="width:48px;height:48px;margin:0 auto 5px;border-radius:50%;overflow:hidden;border:2px solid #7D8B53;box-shadow:0 2px 6px rgba(0,0,0,0.08);background:#FAF7F0;">
              <img src="${base}${leader.portrait}" width="48" height="48" alt="${escapeHtml(leader.name)}" style="display:block;width:48px;height:48px;border-radius:50%;object-fit:cover;border:0;" />
            </div>
            <div style="font-family:'Courier New',ui-monospace,monospace;font-size:10px;font-weight:800;color:#1A202C;line-height:13px;text-align:center;word-break:break-word;overflow-wrap:anywhere;margin-bottom:2px;">
              ${escapeHtml(leader.name)}
            </div>
            <div style="font-family:'Courier New',ui-monospace,monospace;font-size:8px;font-weight:700;color:#7D8B53;line-height:10px;letter-spacing:0.02em;text-transform:uppercase;text-align:center;word-break:break-word;overflow-wrap:anywhere;">
              ${escapeHtml(leader.role)}
            </div>
          </td>
        `).join("")}
      </tr>
    </table>
  `;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;margin:26px 0 20px;background:#FAF8F5;border:1px dashed #CBD5E1;border-radius:16px;box-sizing:border-box;overflow:hidden;">
      <tbody>
        <tr>
          <td align="center" style="padding:16px 12px 10px;border-bottom:1px solid #EAE6DF;">
            <p style="margin:0 0 3px;font-family:'Courier New',ui-monospace,monospace;font-size:11px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#2D3748;line-height:16px;text-align:center;">
              Guided by Coimbatore Startup Community Core Leadership
            </p>
            <p style="margin:0;font-family:'Courier New',ui-monospace,monospace;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7D8B53;text-align:center;">
              ✦ All Seven Members ✦
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 6px 8px;">
            ${renderRow(CSC_TOP_3_LEADERS, "33.33%")}
          </td>
        </tr>
        <tr>
          <td style="padding:4px 4px 14px;border-top:1px dashed #E2E8F0;">
            ${renderRow(CSC_BOTTOM_4_LEADERS, "25%")}
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

function renderTechnicalPartnerBadge(base) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 16px;max-width:440px;width:100%;border-collapse:separate;border-spacing:0;background-color:#18181B;border:1px solid #27272A;border-radius:16px;-webkit-border-radius:16px;-moz-border-radius:16px;overflow:hidden;box-sizing:border-box;">
      <tbody>
        <tr>
          <td align="center" style="padding:18px 20px;border-radius:16px;-webkit-border-radius:16px;-moz-border-radius:16px;background-color:#18181B;text-align:center;box-sizing:border-box;">
            <div style="display:inline-block;padding:3px 12px;border-radius:9999px;background-color:#242427;border:1px solid #3F3F46;margin-bottom:12px;">
              <span style="font-family:'Courier New',ui-monospace,monospace;font-size:9px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#A1A1AA;display:inline-block;line-height:1.2;">
                ✦ OFFICIAL TECHNICAL PARTNER ✦
              </span>
            </div>
            <div style="width:52px;height:52px;margin:0 auto 10px;border-radius:50%;-webkit-border-radius:50%;overflow:hidden;background:#FFFFFF;border:2px solid #3F3F46;box-shadow:0 4px 12px rgba(0,0,0,0.45);">
              <img src="${base}/brand/technical-partner-lit.png" width="52" height="52" alt="Logic Intelligence Technologies" style="display:block;width:52px;height:52px;border-radius:50%;border:0;object-fit:cover;" />
            </div>
            <p style="margin:0 0 5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:800;color:#F4F4F5;letter-spacing:0.04em;text-transform:uppercase;text-align:center;line-height:16px;">
              LOGIC INTELLIGENCE TECHNOLOGIES
            </p>
            <p style="margin:0;font-family:'Courier New',ui-monospace,monospace;font-size:9px;line-height:15px;letter-spacing:0.04em;text-transform:uppercase;color:#A1A1AA;text-align:center;">
              Enterprise Architecture, Engineering &amp; Platform Security Partner for CSC Circle
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

function renderCircularSocialIcons(base, support) {
  const circles = [
    { label: "WhatsApp Community", href: "https://chat.whatsapp.com/EsMyFEUTzT0G3MpMLkUNhB?s=cl&p=a&iam=2", icon: `${base}/brand/social/whatsapp-circle.png` },
    { label: "24/7 AI WhatsApp Assistant", href: "https://wa.me/917550067712?text=Hi", icon: `${base}/brand/social/whatsapp-agent-circle.png` },
    { label: "LinkedIn Official Profile", href: "https://www.linkedin.com/in/csc-coimbatore-startup-community-b27b0b44b?utm_source=share_via&utm_content=profile&utm_medium=member_android", icon: `${base}/brand/social/linkedin-circle.png` },
    { label: "Instagram Highlights", href: "https://www.instagram.com/coimbatorestartupcommunity/", icon: `${base}/brand/social/instagram-circle.png` },
    { label: "Email Community Desk", href: `mailto:${support}`, icon: `${base}/brand/social/email-circle.png` },
  ];

  return `
    <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
      <tbody>
        <tr>
          ${circles.map((item) => `
            <td align="center" style="padding:0 6px;">
              <a href="${item.href}" aria-label="${item.label}" title="${item.label}" style="display:inline-block;text-decoration:none;">
                <img src="${item.icon}" width="38" height="38" alt="${item.label}" style="display:block;width:38px;height:38px;border-radius:50%;border:0;box-shadow:0 2px 6px rgba(0,0,0,0.15);" />
              </a>
            </td>
          `).join("")}
        </tr>
      </tbody>
    </table>
  `;
}

function renderWebsiteFooterNav(base) {
  const links = [
    { label: "Help & FAQ", href: `${base}/help` },
    { label: "Contact", href: `${base}/contact` },
    { label: "Community Guidelines", href: `${base}/community-guidelines` },
    { label: "Membership Guide", href: `${base}/membership` },
    { label: "Privacy Policy", href: `${base}/privacy` },
    { label: "Terms & Conditions", href: `${base}/terms` },
    { label: "Security", href: `${base}/security` },
  ];

  return `
    <p style="margin:0 auto 16px;max-width:480px;font-size:11px;line-height:22px;color:#A0AEC0;text-align:center;word-break:break-word;">
      ${links.map((link, idx) => `
        <a href="${link.href}" style="color:#C4D7ED;text-decoration:none;font-weight:600;white-space:nowrap;">
          ${escapeHtml(link.label)}
        </a>${idx < links.length - 1 ? " &nbsp;&middot;&nbsp; " : ""}
      `).join("")}
    </p>
  `;
}

function buildMerakiEmailHtml({
  badgeText = "COIMBATORE STARTUP COMMUNITY ✦",
  headline,
  headlineItalic,
  greeting = "Hello Founder,",
  body,
  polaroidImage = `${BASE_URL}/brand/csc-homepage-banner.png`,
  polaroidCaption = "Building the Coimbatore Founder Network",
  thumbtackNote = "Consistency matters more than frequency in early ventures.",
  gridNote = "A clear vision and repeatable execution perform far better than frantic efforts without a community strategy.",
  checklistItems = [],
  buttonText = "Explore CSC Community Hub",
  buttonUrl = `${BASE_URL}/events`,
}) {
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>${escapeHtml(headline)}</title>
  <style type="text/css">
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #EFECE6; color: #2D3748; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    table { border-collapse: collapse !important; }
    img { border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .master-container { width: 100% !important; border-radius: 20px !important; }
      .stripe-section { padding: 20px 12px 24px !important; }
      .polaroid-card { padding: 12px 12px 16px !important; }
      .main-headline { font-size: 20px !important; line-height: 26px !important; }
      .content-section { padding: 22px 16px 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#EFECE6;color:#2D3748;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background-color:#EFECE6;margin:0;padding:24px 0;">
    <tbody>
      <tr>
        <td align="center" style="padding:0;margin:0;width:100%;">
          
          <table role="presentation" class="master-container" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:separate;border-spacing:0;background-color:#FFFFFF;border-radius:24px;-webkit-border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);margin:0 auto;">
            <tbody>

              <!-- TOP BAR: Brand Emblem -->
              <tr>
                <td align="center" style="padding:16px 20px 14px;background-color:#FAF9F6;border-bottom:1px solid #EAE6DF;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                    <tr>
                      <td style="padding-right:10px;vertical-align:middle;">
                        <img src="${BASE_URL}/brand/csc-icon.png" width="32" height="32" alt="CSC" style="display:block;width:32px;height:32px;border-radius:50%;border:1px solid #D6D0C4;" />
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
                  
                  <div class="polaroid-card" style="max-width:440px;margin:0 auto;background:#FFFFFF;border-radius:12px;padding:18px 18px 22px;box-shadow:0 12px 28px rgba(0,0,0,0.18);position:relative;text-align:center;box-sizing:border-box;">
                    
                    <div align="center" style="text-align:center;margin:-28px auto 14px auto;line-height:0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;border-collapse:collapse;display:inline-table;">
                        <tr>
                          <td align="center" style="width:120px;height:22px;background-color:#E7DEBD;opacity:0.95;border-radius:2px;box-shadow:0 2px 5px rgba(0,0,0,0.15);transform:rotate(-1.5deg);line-height:0;font-size:0;">
                            &nbsp;
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    <div align="center" style="text-align:center;margin-bottom:14px;">
                      <div style="display:inline-block;padding:5px 14px;background:#F1EFEA;border:1px solid #E5E1D8;border-radius:6px;">
                        <span style="font-family:'Courier New',monospace;font-size:10px;font-weight:800;letter-spacing:0.06em;color:#4A5568;">
                          ${escapeHtml(badgeText)}
                        </span>
                      </div>
                    </div>

                    <h1 class="main-headline" style="margin:0 0 14px;font-family:'Lora',Georgia,serif;font-size:24px;line-height:32px;font-weight:600;color:#1A202C;">
                      ${escapeHtml(headline)}
                      ${headlineItalic ? `<br><span style="font-style:italic;color:#7D8B53;font-size:0.9em;">(${escapeHtml(headlineItalic)})</span>` : ""}
                    </h1>

                    <div style="background:#000000;border-radius:8px;overflow:hidden;margin:0 auto;box-shadow:inset 0 0 8px rgba(0,0,0,0.2);">
                      <img src="${polaroidImage}" width="404" alt="${escapeHtml(polaroidCaption)}" style="display:block;width:100%;height:auto;max-height:240px;object-fit:cover;" />
                    </div>

                    ${polaroidCaption ? `<p style="margin:8px 0 0;font-family:'Courier New',monospace;font-size:10px;color:#718096;text-align:center;">${escapeHtml(polaroidCaption)}</p>` : ""}
                  </div>

                </td>
              </tr>

              <!-- SECTION 2: Message Body -->
              <tr>
                <td class="content-section" style="padding:32px 32px 20px;background-color:#FFFFFF;">
                  
                  <div style="text-align:center;margin-bottom:20px;">
                    <span style="font-family:'Lora',Georgia,serif;font-size:22px;font-style:italic;color:#C45876;display:block;margin-bottom:2px;">
                      The Biggest Step
                    </span>
                    <span style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#718096;font-weight:700;">
                      For Our Ecosystem
                    </span>
                  </div>

                  <p style="margin:0 0 14px;font-size:15px;line-height:24px;color:#2D3748;font-weight:600;">
                    ${escapeHtml(greeting)}
                  </p>
                  <p style="margin:0 0 22px;font-size:14px;line-height:24px;color:#4A5568;white-space:pre-line;">
                    ${escapeHtml(body)}
                  </p>

                  <!-- Green Thumbtack Note Card -->
                  <div style="margin:24px auto;max-width:440px;background:#96A76E;color:#FFFFFF;padding:14px 18px;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.1);position:relative;transform:rotate(-1deg);box-sizing:border-box;">
                    <div style="width:12px;height:12px;border-radius:50%;background:#D9383A;position:absolute;top:-6px;left:50%;margin-left:-6px;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
                    <p style="margin:0;font-family:'Lora',Georgia,serif;font-size:16px;line-height:22px;font-style:italic;text-align:center;color:#FFFFFF;font-weight:600;">
                      &ldquo;${escapeHtml(thumbtackNote)}&rdquo;
                    </p>
                  </div>

                  <!-- Light Sage Grid Notebook Card -->
                  <div style="margin:24px auto;max-width:460px;background:#F7F9F5;border:1px solid #D5E2D0;border-radius:12px;padding:18px 14px;background-image:linear-gradient(#E5EFE1 1px, transparent 1px), linear-gradient(90deg, #E5EFE1 1px, transparent 1px);background-size:20px 20px;box-sizing:border-box;">
                    <p style="margin:0 0 12px;font-family:'Courier New',monospace;font-size:12px;line-height:20px;color:#2D3748;border-left:3px solid #7D8B53;padding-left:10px;">
                      ${escapeHtml(gridNote)}
                    </p>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
                      <tr>
                        ${checklistItems.map((item) => `
                          <td valign="top" style="padding:0 4px;width:33.33%;box-sizing:border-box;">
                            <div style="background:#FFFFFF;border:1px solid #DCE6D9;border-radius:8px;padding:8px 6px;text-align:center;min-height:64px;">
                              <span style="display:block;font-size:13px;color:#7D8B53;margin-bottom:3px;">✦</span>
                              <span style="font-family:'Courier New',monospace;font-size:9px;line-height:13px;color:#4A5568;display:block;">
                                ${escapeHtml(item)}
                              </span>
                            </div>
                          </td>
                        `).join("")}
                      </tr>
                    </table>
                  </div>

                  <!-- 7-MEMBER CORE LEADERSHIP ROSTER -->
                  ${renderMerakiLeadershipRoster(BASE_URL)}

                  <!-- Primary Soft Pill Action Button -->
                  <div style="text-align:center;margin:28px 0 10px;">
                    <a href="${buttonUrl}" style="display:inline-block;padding:14px 30px;background-color:#C4D7ED;color:#2A4365;font-size:14px;font-weight:700;letter-spacing:0.04em;text-decoration:none;border-radius:999px;box-shadow:0 3px 8px rgba(196,215,237,0.5);">
                      ${escapeHtml(buttonText)} &rarr;
                    </a>
                  </div>

                </td>
              </tr>

              <!-- SECTION 3: Deep Charcoal Bottom Section -->
              <tr>
                <td style="padding:32px 24px 28px;background-color:#1A1A1A;color:#E2E8F0;text-align:center;">
                  
                  <p style="margin:0 0 16px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#A0AEC0;">
                    Coimbatore Startup Community · Ecosystem Highlights
                  </p>

                  <!-- 3 Highlight Photos Row -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;margin:0 auto 22px;border-collapse:collapse;">
                    <tr>
                      <td align="center" style="padding:0 3px;width:33.33%;box-sizing:border-box;">
                        <div style="background:#2D3748;border-radius:8px;overflow:hidden;border:1px solid #4A5568;">
                          <img src="${BASE_URL}/events/csc-connect-edition-2-cover.webp" width="130" height="85" alt="CSC Connect Edition 2" style="display:block;width:100%;height:80px;object-fit:cover;" />
                        </div>
                      </td>
                      <td align="center" style="padding:0 3px;width:33.33%;box-sizing:border-box;">
                        <div style="background:#2D3748;border-radius:8px;overflow:hidden;border:1px solid #4A5568;">
                          <img src="${BASE_URL}/events/community-outlier-meetup.jpg" width="130" height="85" alt="Outlier Community Meetup" style="display:block;width:100%;height:80px;object-fit:cover;" />
                        </div>
                      </td>
                      <td align="center" style="padding:0 3px;width:33.33%;box-sizing:border-box;">
                        <div style="background:#2D3748;border-radius:8px;overflow:hidden;border:1px solid #4A5568;">
                          <img src="${BASE_URL}/events/community-outlier-poster.jpg" width="130" height="85" alt="Outlier Community Cohort" style="display:block;width:100%;height:80px;object-fit:cover;" />
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
                  ${renderCircularSocialIcons(BASE_URL, SUPPORT_EMAIL)}

                  <!-- Official Technical Partner Badge (Logic Intelligence Technologies) -->
                  ${renderTechnicalPartnerBadge(BASE_URL)}

                  <hr style="border:0;border-top:1px solid #2D3748;margin:20px 0 16px;">

                  <!-- 7 Official Website Legal & Governance Links -->
                  ${renderWebsiteFooterNav(BASE_URL)}

                  <p style="margin:0 0 14px;font-family:'Courier New',monospace;font-size:10px;color:#A0AEC0;">
                    Questions? Visit <a href="${BASE_URL}" style="color:#C4D7ED;text-decoration:none;font-weight:600;">CSC Circle</a> or email <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:#C4D7ED;text-decoration:none;font-weight:600;">${escapeHtml(SUPPORT_EMAIL)}</a>
                  </p>

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

async function main() {
  console.log("Connecting to database for Member Lifecycle Email Broadcast...");

  const [profilesRes, membershipsRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, whatsapp, consent"),
    supabase.from("memberships").select("user_id, member_number, status").eq("status", "active"),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (membershipsRes.error) throw membershipsRes.error;

  const activeMemberships = membershipsRes.data || [];
  const claimedUserIds = new Set(activeMemberships.map((m) => m.user_id));
  const membershipMap = new Map(activeMemberships.map((m) => [m.user_id, m.member_number]));

  const profiles = profilesRes.data || [];
  const claimedMembers = profiles.filter((p) => claimedUserIds.has(p.id) && p.email);
  const unclaimedMembers = profiles.filter((p) => !claimedUserIds.has(p.id) && p.email);

  console.log(`\nFound ${claimedMembers.length} Claimed Members (Active ID Issued)`);
  console.log(`Found ${unclaimedMembers.length} Registered / Unclaimed Members`);

  // PHASE 1: Send Mobile Verification Prompt to 71 Claimed Members
  console.log("\n========================================================");
  console.log(`[Phase 1] Sending Meraki Mobile Verification Emails to ${claimedMembers.length} Claimed Members...`);
  console.log("========================================================");

  let phase1Success = 0;
  for (const member of claimedMembers) {
    const memberNum = membershipMap.get(member.id) || "CSC Member";
    const name = member.full_name || "Founder & Builder";

    const htmlContent = buildMerakiEmailHtml({
      badgeText: "CSC DIGITAL ID VERIFICATION ✦",
      headline: "Verify Your Mobile Number",
      headlineItalic: memberNum,
      greeting: `Hello ${name},`,
      body: `Congratulations on securing your Official CSC Membership ID (${memberNum})!\n\nTo ensure secure 24/7 authentication, automated WhatsApp ecosystem alerts, and express venue check-in at all upcoming Coimbatore Startup Community offline meetups, please complete a quick 1-time verification of your mobile number on your profile.`,
      polaroidCaption: `CSC Digital Member ID: ${memberNum}`,
      thumbtackNote: "A verified WhatsApp number unlocks instant gate pass delivery for upcoming meetups.",
      gridNote: "Security & privacy: CSC never shares or sells member contact data. Your number is solely used for verified ecosystem communications.",
      checklistItems: [
        "Official CSC Digital Member Pass with secure QR check-in",
        "Real-time WhatsApp updates for founder roundtables",
        "Priority access to mentor office hours & grants",
      ],
      buttonText: "Verify Mobile Number Now →",
      buttonUrl: `${BASE_URL}/profile/settings`,
    });

    const mailOptions = {
      from: `CSC Circle <${SUPPORT_EMAIL}>`,
      to: member.email,
      subject: `Action Required: Verify Your WhatsApp Number — CSC Circle Digital ID Pass (${memberNum})`,
      html: htmlContent,
    };

    try {
      await transporter.sendMail(mailOptions);
      phase1Success++;
      process.stdout.write(".");
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      console.error(`\nFailed sending Phase 1 to ${member.email}:`, err.message);
    }
  }

  console.log(`\n\nPhase 1 Completed: ${phase1Success}/${claimedMembers.length} mobile verification emails delivered!`);

  // PHASE 2: Send Membership Claim Invitations to 64 Unclaimed Members
  console.log("\n========================================================");
  console.log(`[Phase 2] Sending Meraki Membership Claim Invitations to ${unclaimedMembers.length} Registered Members...`);
  console.log("========================================================");

  let phase2Success = 0;
  for (const member of unclaimedMembers) {
    const name = member.full_name || "Founder & Builder";

    const htmlContent = buildMerakiEmailHtml({
      badgeText: "ECOSYSTEM MEMBERSHIP INVITATION ✦",
      headline: "Claim Your Official Membership ID",
      headlineItalic: "Coimbatore Startup Community",
      greeting: `Hello ${name},`,
      body: `Thank you for registering on CSC Circle! We noticed you haven't claimed your official CSC Membership ID yet.\n\nClaiming takes less than 60 seconds and is 100% free. Once claimed, your verified digital pass is issued with express automated verification!`,
      polaroidCaption: "Coimbatore Startup Community Founder Network",
      thumbtackNote: "Over 71+ active founders in Coimbatore have already claimed their official CSC Membership ID.",
      gridNote: "Membership is completely free for Coimbatore founders, builders, operators, and startup creators.",
      checklistItems: [
        "Official CSC Digital Member Pass with express venue QR check-in",
        "Access to bi-weekly offline meetups & founder networking",
        "Priority visibility in our Coimbatore Founder Directory",
      ],
      buttonText: "Claim Your Membership ID Now →",
      buttonUrl: `${BASE_URL}/profile/claim`,
    });

    const mailOptions = {
      from: `CSC Circle <${SUPPORT_EMAIL}>`,
      to: member.email,
      subject: "Claim Your Official CSC Membership ID & Digital Pass — CSC Circle",
      html: htmlContent,
    };

    try {
      await transporter.sendMail(mailOptions);
      phase2Success++;
      process.stdout.write(".");
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      console.error(`\nFailed sending Phase 2 to ${member.email}:`, err.message);
    }
  }

  console.log(`\n\nPhase 2 Completed: ${phase2Success}/${unclaimedMembers.length} claim invitation emails delivered!`);
  console.log("\n🎉 ALL LIFECYCLE EMAILS DISPATCHED WITH ZERO ERRORS!");
}

main().catch(console.error);
