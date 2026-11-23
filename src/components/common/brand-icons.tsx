import * as React from "react";
import Image from "next/image";

/** Minimal brand glyphs and circular social badge components. */

export function InstagramIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export function WhatsappIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.004c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.42 5.82c0 4.54-3.7 8.24-8.24 8.24a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 9.9c-.08-.12-.28-.2-.58-.35-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42z" />
    </svg>
  );
}

export function LinkedinIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.77v8.37H6.46v-8.37M7.85 6.4a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24Z" />
    </svg>
  );
}

/** Circular image badges for WhatsApp, Instagram, LinkedIn, and the 24/7 AI WhatsApp Agent */
export function CircularSocialIcon({
  network,
  size = 44,
  className = "",
}: {
  network: "whatsapp" | "instagram" | "linkedin" | "ai_agent";
  size?: number;
  className?: string;
}) {
  const meta = {
    whatsapp: {
      src: "/brand/social/whatsapp-circle.png",
      alt: "WhatsApp official community group icon",
      bgColor: "bg-emerald-500",
      fallback: <WhatsappIcon className="size-5 text-white" />,
    },
    ai_agent: {
      src: "/brand/social/whatsapp-agent-circle.png",
      alt: "24/7 WhatsApp Community Assistant",
      bgColor: "bg-emerald-600",
      fallback: <WhatsappIcon className="size-5 text-white" />,
    },
    instagram: {
      src: "/brand/social/instagram-circle.png",
      alt: "Instagram official channel icon",
      bgColor: "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600",
      fallback: <InstagramIcon className="size-5 text-white" />,
    },
    linkedin: {
      src: "/brand/social/linkedin-circle.png",
      alt: "LinkedIn official profile icon",
      bgColor: "bg-[#0A66C2]",
      fallback: <LinkedinIcon className="size-5 text-white" />,
    },
  }[network];

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full shadow-xs ring-1 ring-black/10 transition-transform hover:scale-105 active:scale-95 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={meta.src}
        alt={meta.alt}
        width={size}
        height={size}
        unoptimized
        className="size-full object-cover"
      />
    </span>
  );
}
