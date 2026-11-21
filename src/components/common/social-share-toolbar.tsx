"use client";

import { useState } from "react";
import { Share2, Check, Copy, MessageCircle } from "lucide-react";

interface SocialShareToolbarProps {
  url: string;
  title: string;
  summary: string;
  hashtags?: string[];
  className?: string;
  showWhatsApp?: boolean;
  showCopyCaption?: boolean;
  variant?: "primary" | "secondary" | "pill";
}

const DEFAULT_HASHTAGS = [
  "#CoimbatoreStartups",
  "#CSCCircle",
  "#TamilNaduFounders",
  "#StartupEcosystem",
  "#BuildInPublic",
];

function LinkedInIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.77v8.37H6.46v-8.37M7.85 6.4a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24Z" />
    </svg>
  );
}

export function SocialShareToolbar({
  url,
  title,
  summary,
  hashtags = DEFAULT_HASHTAGS,
  className = "",
  showWhatsApp = true,
  showCopyCaption = true,
  variant = "pill",
}: SocialShareToolbarProps) {
  const [copied, setCopied] = useState(false);
  const [openingLinkedIn, setOpeningLinkedIn] = useState(false);

  // Append cache buster to guarantee LinkedIn scrapers fetch fresh OpenGraph metadata & banner
  const cleanUrl = url.replace(/(\?|&)v=\d+/, "");
  const separator = cleanUrl.includes("?") ? "&" : "?";
  const shareUrl = `${cleanUrl}${separator}v=20261122`;

  const formattedCaption = `${title}\n\n${summary}\n\n🔗 ${shareUrl}\n\n${hashtags.join(" ")}`;

  async function handleLinkedInShare() {
    setOpeningLinkedIn(true);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(formattedCaption);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch {
      // Clipboard write failed (e.g., user denied permission); proceed with share link
    }

    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedInUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => setOpeningLinkedIn(false), 1500);
  }

  function handleWhatsAppShare() {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(formattedCaption)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  async function handleCopyCaption() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(formattedCaption);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Ignore
    }
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={handleLinkedInShare}
          className="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-4 py-2.5 text-xs font-semibold text-sky-900 shadow-2xs transition hover:bg-sky-100 hover:border-sky-400 focus-visible:outline-2 focus-visible:outline-sky-600 active:scale-98"
          title="Copies full formatted post caption and opens LinkedIn share dialog with live banner preview"
        >
          <LinkedInIcon className="size-4 text-sky-700" />
          <span>{openingLinkedIn ? "Opening LinkedIn…" : "Share on LinkedIn"}</span>
        </button>

        {showWhatsApp && (
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-900 shadow-2xs transition hover:bg-emerald-100 hover:border-emerald-400 focus-visible:outline-2 focus-visible:outline-emerald-600 active:scale-98"
            title="Share via WhatsApp with pre-filled caption & link preview"
          >
            <MessageCircle className="size-4 text-emerald-700" />
            <span>WhatsApp</span>
          </button>
        )}

        {showCopyCaption && (
          <button
            type="button"
            onClick={handleCopyCaption}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-white px-3.5 py-2.5 text-xs font-medium text-brand-secondary shadow-2xs transition hover:bg-brand-cloud hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-ink active:scale-98"
            title="Copy full caption and hashtags to clipboard"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Caption Copied!</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Copy Caption</span>
              </>
            )}
          </button>
        )}
      </div>

      {copied && (
        <p className="animate-fade-in text-[11px] font-medium text-emerald-700">
          ✓ Full post description copied to clipboard — paste directly into your LinkedIn post!
        </p>
      )}
    </div>
  );
}
