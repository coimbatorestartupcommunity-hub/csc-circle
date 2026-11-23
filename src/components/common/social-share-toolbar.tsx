"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

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
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z" />
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

  // Clean canonical URL without any cache-busting query parameter
  const shareUrl = url.replace(/(\?|&)v=\d+/, "");

  const formattedCaption = `${title}\n\n${summary}\n\n🔗 ${shareUrl}\n\n${hashtags.join(" ")}`;

  async function handleLinkedInShare() {
    setOpeningLinkedIn(true);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(formattedCaption);
        setCopied(true);
        toast.success("Post caption copied! Paste directly into your LinkedIn post.");
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
        toast.success("Post description copied to clipboard! Paste directly into LinkedIn.");
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Ignore
    }
  }

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      {/* Integrated Dual-Action Split Pill */}
      <div className="inline-flex items-center overflow-hidden rounded-full bg-[#0A66C2] text-white shadow-md ring-1 ring-black/10 transition hover:bg-[#004182]">
        {/* Left Side: Share on LinkedIn */}
        <button
          type="button"
          onClick={handleLinkedInShare}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition active:scale-98 cursor-pointer focus-visible:outline-none"
          title="Copies full formatted post caption and opens LinkedIn share dialog"
        >
          <LinkedInIcon className="size-4 shrink-0 text-white fill-white" />
          <span>{openingLinkedIn ? "Opening LinkedIn…" : "Share on LinkedIn"}</span>
        </button>

        {showCopyCaption && (
          <>
            {/* Elegant Vertical Divider */}
            <span className="h-5 w-px bg-white/25" aria-hidden="true" />

            {/* Right Side: Copy Caption Action */}
            <button
              type="button"
              onClick={handleCopyCaption}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-white/95 transition hover:bg-black/15 active:scale-95 cursor-pointer focus-visible:outline-none"
              title="Copy full post description & hashtags"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-300" />
                  <span className="text-[11px] font-bold text-emerald-200">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-white/80" />
                  <span className="text-[11px]">Copy Text</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
