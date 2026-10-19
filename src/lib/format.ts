import { siteConfig } from "@/lib/content/site";

/**
 * Validate a user/content-supplied URL before it is rendered as a link.
 * Only http(s) is allowed. Returns the normalised href or `null`.
 */
export function safeExternalUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Human-friendly host (e.g. "example.com") for display on link buttons. */
export function displayHost(value?: string | null): string | null {
  const safe = safeExternalUrl(value);
  if (!safe) return null;
  try {
    return new URL(safe).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Initials fallback (max 2 letters) for avatars/logos when no image exists. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const DATE_TZ = siteConfig.timezone;

/** e.g. "Sat, 14 Mar 2026" in Asia/Kolkata. */
export function formatEventDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: DATE_TZ,
  }).format(new Date(iso));
}

/** e.g. "6:30 PM" in Asia/Kolkata. */
export function formatEventTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: DATE_TZ,
  }).format(new Date(iso));
}

/** e.g. "Sat, 14 Mar 2026 · 6:30–8:30 PM IST". */
export function formatEventRange(startIso: string, endIso: string): string {
  const date = formatEventDate(startIso);
  const start = formatEventTime(startIso);
  const end = formatEventTime(endIso);
  return `${date} · ${start}–${end} IST`;
}

/** Day of month as a padded string, Asia/Kolkata. */
export function eventDayParts(iso: string): { day: string; month: string } {
  const d = new Date(iso);
  return {
    day: new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      timeZone: DATE_TZ,
    }).format(d),
    month: new Intl.DateTimeFormat("en-IN", {
      month: "short",
      timeZone: DATE_TZ,
    })
      .format(d)
      .toUpperCase(),
  };
}

/** Rating formatted to two decimals, e.g. 5 -> "5.00". */
export function formatRating(rating: number): string {
  return rating.toFixed(2);
}
