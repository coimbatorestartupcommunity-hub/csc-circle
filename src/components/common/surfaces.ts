/** Maps an approved pastel surface name to its background utility class. */
export type Surface =
  | "white"
  | "cloud"
  | "purple"
  | "lilac"
  | "pink"
  | "blue"
  | "red"
  | "gold";

export const surfaceBg: Record<Surface, string> = {
  white: "bg-brand-white",
  cloud: "bg-brand-cloud",
  purple: "bg-brand-purple",
  lilac: "bg-brand-lilac",
  pink: "bg-brand-pink",
  blue: "bg-brand-blue",
  red: "bg-brand-red",
  gold: "bg-brand-gold",
};

/** Soft icon chip background, slightly deeper than the card surface. */
export const surfaceIconBg: Record<Surface, string> = {
  white: "bg-brand-cloud text-brand-ink",
  cloud: "bg-brand-white text-brand-ink",
  purple: "bg-brand-white/70 text-brand-accent",
  lilac: "bg-brand-white/70 text-brand-accent",
  pink: "bg-brand-white/70 text-brand-ink",
  blue: "bg-brand-white/70 text-brand-ink",
  red: "bg-brand-white/70 text-brand-ink",
  gold: "bg-brand-white/70 text-brand-ink",
};
