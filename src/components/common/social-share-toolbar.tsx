"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

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
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451c.979 0 1.778-.773 1.778-1.729V1.73C24 .774 23.205 0 22.222 0h.003z" />
    </svg>
  );
}

export function SocialShareToolbar({
  url,
  title,
  summary,
  hashtags = DEFAULT_HASHTAGS,
  className = "",
  showCopyCaption = true,
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
        {showCopyCaption && (
          <button
            type="button"
            onClick={handleCopyCaption}
            className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-white px-4 py-2.5 text-xs sm:text-sm font-medium text-brand-ink shadow-2xs transition hover:bg-brand-cloud hover:border-brand-border/80 focus-visible:outline-2 focus-visible:outline-brand-ink active:scale-98 cursor-pointer"
            title="Copy full caption and hashtags to clipboard"
          >
            {copied ? (
              <>
                <Check className="size-4 text-emerald-600" />
                <span className="font-semibold text-emerald-700">Caption Copied!</span>
              </>
            ) : (
              <>
                <Copy className="size-4 text-brand-muted" />
                <span>Copy Caption</span>
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={handleLinkedInShare}
          className="inline-flex items-center gap-2 rounded-full bg-[#0A66C2] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#004182] focus-visible:outline-2 focus-visible:outline-[#0A66C2] active:scale-98 cursor-pointer"
          title="Copies full formatted post caption and opens LinkedIn share dialog with live banner preview"
        >
          <LinkedInIcon className="size-4 shrink-0 text-white fill-white" />
          <span>{openingLinkedIn ? "Opening LinkedIn…" : "Share on LinkedIn"}</span>
        </button>
      </div>

      {copied && (
        <p className="animate-fade-in text-[11px] font-medium text-emerald-700">
          ✓ Full post description copied to clipboard — paste directly into your LinkedIn post!
        </p>
      )}
    </div>
  );
}
