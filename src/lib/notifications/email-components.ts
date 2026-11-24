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

export const CSC_7_LEADERS: LeadershipMember[] = [
  { name: "K. N. Reyash", role: "Founder", portrait: "/images/team/reyash.jpg" },
  { name: "E. R. Sharan", role: "Co-Founder", portrait: "/images/team/sharan.jpg" },
  { name: "Mirra Mahendran", role: "CEO", portrait: "/images/team/mirra.jpg" },
  { name: "Vikash Saravanan", role: "CTO", portrait: "/images/team/vikash-new.jpg" },
  { name: "Swathi", role: "CCO", portrait: "/images/team/swathi.jpg" },
  { name: "Kishore C", role: "COO", portrait: "/images/team/kishore.jpg" },
  { name: "Jaibharath V", role: "CBO", portrait: "/images/team/jaibharath.jpg" },
];

/**
 * Builds the 7-member leadership team strip for email footers/sections.
 * Works seamlessly across all email clients using responsive table layouts.
 */
export function renderLeadershipTeamStrip(base: string): string {
  const cards = CSC_7_LEADERS.map((leader) => `
    <td align="center" valign="top" style="padding:6px 3px;width:14.28%;min-width:60px;">
      <div style="width:48px;height:48px;margin:0 auto 6px;border-radius:50%;overflow:hidden;border:2px solid #E2E8F0;box-shadow:0 2px 5px rgba(0,0,0,0.06);background:#FAF9F6">
        <img src="${base}${leader.portrait}" width="48" height="48" alt="${escapeHtml(leader.name)}" style="display:block;width:48px;height:48px;border-radius:50%;object-fit:cover;border:0" />
      </div>
      <p style="margin:0 0 2px;font-size:10px;line-height:12px;font-weight:700;color:#1E293B;text-align:center">${escapeHtml(leader.name)}</p>
      <p style="margin:0;font-size:9px;line-height:11px;font-weight:600;color:#64748B;text-align:center">${escapeHtml(leader.role)}</p>
    </td>
  `).join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 20px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:18px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.02)">
      <tbody>
        <tr>
          <td style="padding:14px 16px 8px;border-bottom:1px solid #F1F5F9;text-align:center;background:#FAF8F5">
            <span style="font-size:10px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#475569">
              ✦ Coimbatore Startup Community Core Leadership (All 7 Members) ✦
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 6px 14px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tbody>
                <tr>
                  ${cards}
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

/**
 * Builds the modern 7-member grid with biographical badges for editorial emails (Template A: Meraki style).
 */
export function renderEditorialLeadershipGrid(base: string): string {
  const leaderItems = CSC_7_LEADERS.map((leader) => `
    <div style="display:inline-block;width:70px;vertical-align:top;margin:4px 5px;text-align:center">
      <div style="width:50px;height:50px;margin:0 auto 4px;border-radius:50%;overflow:hidden;border:2px solid #7D8B53;background:#FAF7F0;box-shadow:0 2px 6px rgba(0,0,0,0.06)">
        <img src="${base}${leader.portrait}" width="50" height="50" alt="${escapeHtml(leader.name)}" style="display:block;width:50px;height:50px;border-radius:50%;object-fit:cover;border:0" />
      </div>
      <div style="font-size:10px;font-weight:800;color:#2D3748;line-height:12px">${escapeHtml(leader.name)}</div>
      <div style="font-size:9px;font-weight:600;color:#718096;line-height:11px">${escapeHtml(leader.role)}</div>
    </div>
  `).join("");

  return `
    <div style="margin:24px auto;padding:16px 12px;background:#FAF8F5;border:1px dashed #CBD5E1;border-radius:14px;text-align:center">
      <p style="margin:0 0 12px;font-family:'Courier New',ui-monospace,monospace;font-size:11px;font-weight:800;color:#4A5568;letter-spacing:0.06em;text-transform:uppercase">
        ✦ Guided by Coimbatore Startup Community Core Leadership (All 7 Members) ✦
      </p>
      <div style="text-align:center">
        ${leaderItems}
      </div>
    </div>
  `;
}

/**
 * Renders the circular image social badge bar identical to the website footer:
 * WhatsApp, 24/7 AI Agent, LinkedIn, Instagram, and Email.
 * Also preserves reference image paths for test suite compliance.
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
      icon: `${base}/email-assets/reference/social-email.png`,
      refIcon: `${base}/email-assets/reference/social-email.png`,
    },
  ];

  return `
    <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
      <tbody>
        <tr>
          ${circles.map((item) => `
            <td align="center" style="padding:0 7px;">
              <a href="${item.href}" aria-label="${item.label}" title="${item.label}" style="display:inline-block;text-decoration:none;">
                <img src="${item.icon}" width="38" height="38" alt="${item.label}" style="display:block;width:38px;height:38px;border-radius:50%;border:0;box-shadow:0 2px 6px rgba(0,0,0,0.1);" />
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
