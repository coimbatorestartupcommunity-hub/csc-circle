export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]!));
}

export interface LeadershipMember {
  name: string;
  role: string;
  portrait: string;
}

/** Top Row (3 Leaders: Founder, Co-Founder, CEO) */
export const CSC_TOP_3_LEADERS: LeadershipMember[] = [
  { name: "K. N. Reyash", role: "FOUNDER", portrait: "/images/team/circular/reyash.jpg" },
  { name: "E. R. Sharan", role: "CO-FOUNDER", portrait: "/images/team/circular/sharan.jpg" },
  { name: "Mirra Mahendran", role: "CHIEF EXECUTIVE OFFICER", portrait: "/images/team/circular/mirra.jpg" },
];

/** Bottom Row (4 Leaders: CTO, CCO, COO, CBO) */
export const CSC_BOTTOM_4_LEADERS: LeadershipMember[] = [
  { name: "Vikash Saravanan", role: "CHIEF TECHNOLOGY OFFICER", portrait: "/images/team/circular/vikash.jpg" },
  { name: "Swathi", role: "CHIEF COMMUNITY OFFICER", portrait: "/images/team/circular/swathi.jpg" },
  { name: "Kishore C", role: "CHIEF OPERATING OFFICER", portrait: "/images/team/circular/kishore.jpg" },
  { name: "Jaibharath V", role: "CHIEF BRAND OFFICER", portrait: "/images/team/circular/jaibharath.jpg" },
];

/** All 7 Core Leaders combined */
export const CSC_7_LEADERS: LeadershipMember[] = [
  ...CSC_TOP_3_LEADERS,
  ...CSC_BOTTOM_4_LEADERS,
];

/**
 * Builds the official 7-member leadership team section in a 3 + 4 executive layout.
 * Engineered for 100% fluid mobile responsiveness with zero cut-off, zero overflow,
 * and high-contrast typographic hierarchy matching the Meraki editorial aesthetic.
 */
export function renderMerakiLeadershipRoster(base: string): string {
  const renderRow = (leaders: LeadershipMember[], colWidth: string) => `
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
    <!-- 7-MEMBER CORE LEADERSHIP ROSTER (3+4 EXECUTIVE SPLIT) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:100%;margin:26px 0 20px;background:#FAF8F5;border:1px dashed #CBD5E1;border-radius:16px;box-sizing:border-box;overflow:hidden;">
      <tbody>
        <!-- Header -->
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

        <!-- Row 1: Top 3 Leaders (Founder, Co-Founder, CEO) -->
        <tr>
          <td style="padding:12px 6px 8px;">
            ${renderRow(CSC_TOP_3_LEADERS, "33.33%")}
          </td>
        </tr>

        <!-- Row 2: Bottom 4 Leaders (CTO, CCO, COO, CBO) -->
        <tr>
          <td style="padding:4px 4px 14px;border-top:1px dashed #E2E8F0;">
            ${renderRow(CSC_BOTTOM_4_LEADERS, "25%")}
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

/** Legacy alias for backward compatibility */
export function renderEditorialLeadershipGrid(base: string): string {
  return renderMerakiLeadershipRoster(base);
}

/** Legacy alias for backward compatibility */
export function renderLeadershipTeamStrip(base: string): string {
  return renderMerakiLeadershipRoster(base);
}

/**
 * Official Technical Partner badge featuring Logic Intelligence Technologies circular logo.
 */
export function renderTechnicalPartnerBadge(base: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px auto 16px;max-width:440px;background:#242426;border:1px solid #38383A;border-radius:14px;box-sizing:border-box;">
      <tbody>
        <tr>
          <td align="center" style="padding:14px 16px;">
            <span style="font-family:'Courier New',ui-monospace,monospace;font-size:9px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#A0AEC0;display:block;margin-bottom:8px;">
              ✦ OFFICIAL TECHNICAL PARTNER ✦
            </span>
            <div style="width:46px;height:46px;margin:0 auto 8px;border-radius:50%;overflow:hidden;background:#FFFFFF;box-shadow:0 2px 8px rgba(0,0,0,0.35);">
              <img src="${base}/brand/technical-partner-lit.png" width="46" height="46" alt="Logic Intelligence Technologies" style="display:block;width:46px;height:46px;border-radius:50%;border:0;object-fit:cover;" />
            </div>
            <p style="margin:0 0 4px;font-size:12px;font-weight:800;color:#FFFFFF;letter-spacing:0.02em;text-align:center;">
              LOGIC INTELLIGENCE TECHNOLOGIES
            </p>
            <p style="margin:0;font-family:'Courier New',ui-monospace,monospace;font-size:9px;line-height:14px;letter-spacing:0.04em;text-transform:uppercase;color:#A0AEC0;text-align:center;">
              Enterprise Architecture, Engineering &amp; Platform Security Partner for CSC Circle
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

/**
 * Renders the circular image social badge bar identical to the website footer:
 * WhatsApp, 24/7 AI Agent, LinkedIn, Instagram, and Email.
 */
export function renderCircularSocialIcons(base: string, support: string): string {
  const circles = [
    {
      label: "WhatsApp Community",
      href: "https://chat.whatsapp.com/EsMyFEUTzT0G3MpMLkUNhB?s=cl&p=a&iam=2",
      icon: `${base}/brand/social/whatsapp-circle.png`,
      refIcon: `${base}/email-assets/reference/social-whatsapp.png`,
    },
    {
      label: "24/7 AI WhatsApp Assistant",
      href: "https://wa.me/917550067712?text=Hi",
      icon: `${base}/brand/social/whatsapp-agent-circle.png`,
      refIcon: `${base}/email-assets/reference/social-whatsapp.png`,
    },
    {
      label: "LinkedIn Official Profile",
      href: "https://www.linkedin.com/in/csc-coimbatore-startup-community-b27b0b44b?utm_source=share_via&utm_content=profile&utm_medium=member_android",
      icon: `${base}/brand/social/linkedin-circle.png`,
      refIcon: `${base}/email-assets/reference/social-website.png`,
    },
    {
      label: "Instagram Highlights",
      href: "https://www.instagram.com/coimbatorestartupcommunity/",
      icon: `${base}/brand/social/instagram-circle.png`,
      refIcon: `${base}/email-assets/reference/social-instagram.png`,
    },
    {
      label: "Email Community Desk",
      href: `mailto:${support}`,
      icon: `${base}/brand/social/email-circle.png`,
      refIcon: `${base}/email-assets/reference/social-email.png`,
    },
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
              <!-- Reference icon tag for compatibility -->
              <span style="display:none;opacity:0;font-size:0;line-height:0;"><img src="${item.refIcon}" width="1" height="1" alt="" /></span>
            </td>
          `).join("")}
        </tr>
      </tbody>
    </table>
  `;
}

/**
 * 7 Official Website Governance & Legal Navigation Links matching the website footer.
 */
export function renderWebsiteFooterNav(base: string): string {
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
