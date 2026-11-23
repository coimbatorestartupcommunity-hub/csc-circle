import { CSC_WHATSAPP_FOOTER } from "../utils/message-template.js";

/**
 * Calculates the next 1st or 3rd Saturday bi-weekly meetup dates.
 */
export function getNextBiWeeklyMeetups(): Array<{ date: Date; label: string; daysRemaining: number }> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const results: Array<{ date: Date; label: string; daysRemaining: number }> = [];

  function findSaturdays(y: number, m: number): Date[] {
    const saturdays: Date[] = [];
    const d = new Date(y, m, 1);
    while (d.getMonth() === m) {
      if (d.getDay() === 6) {
        // Saturday
        saturdays.push(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 17, 30)); // 5:30 PM IST
      }
      d.setDate(d.getDate() + 1);
    }
    return saturdays;
  }

  // Check current month and next month
  for (const mOffset of [0, 1]) {
    const targetMonth = (month + mOffset) % 12;
    const targetYear = year + Math.floor((month + mOffset) / 12);
    const sats = findSaturdays(targetYear, targetMonth);

    // 1st Saturday
    if (sats[0] && sats[0].getTime() >= now.getTime() - 2 * 60 * 60 * 1000) {
      const diffDays = Math.ceil((sats[0].getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      results.push({ date: sats[0], label: "1st Saturday Ecosystem Meetup", daysRemaining: diffDays });
    }

    // 3rd Saturday
    if (sats[2] && sats[2].getTime() >= now.getTime() - 2 * 60 * 60 * 1000) {
      const diffDays = Math.ceil((sats[2].getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      results.push({ date: sats[2], label: "3rd Saturday Founders Round-table", daysRemaining: diffDays });
    }
  }

  return results.slice(0, 2);
}

/**
 * Formats the bi-weekly meetup schedule for WhatsApp.
 */
export function formatBiWeeklyMeetupSchedule(): string {
  const meetups = getNextBiWeeklyMeetups();
  if (meetups.length === 0) {
    return `📅 *CSC Bi-Weekly Meetup Calendar*\n\nMeetups take place on the *1st and 3rd Saturdays* of every month at 5:30 PM IST in Coimbatore.\n\n🔗 View all published dates: https://csc.logicintelligencetechnologies.in/events\n\n${CSC_WHATSAPP_FOOTER}`;
  }

  let text = `📅 *CSC Circle Bi-Weekly Meetup Schedule*\n\n`;
  text += `Coimbatore Startup Community hosts regular ecosystem meetups on the *1st & 3rd Saturdays* of each month.\n\n`;

  for (const m of meetups) {
    const dateStr = m.date.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    text += `📍 *${m.label}*\n`;
    text += `🗓️ ${dateStr} at 5:30 PM IST\n`;
    text += `⏳ _In approximately ${m.daysRemaining} days_\n\n`;
  }

  text += `👉 *Reserve Passes & Calendar Sync:* https://csc.logicintelligencetechnologies.in/events\n\n`;
  text += CSC_WHATSAPP_FOOTER;

  return text;
}
