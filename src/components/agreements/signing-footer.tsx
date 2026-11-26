import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/lib/content/site";

interface SocialChannel {
  name: string;
  href: string;
  icon: string;
  description: string;
  badge?: string;
}

const SOCIAL_CHANNELS: SocialChannel[] = [
  {
    name: "WhatsApp Community",
    href: siteConfig.social.whatsapp,
    icon: "/images/agreements/social/whatsapp.png",
    description: "Join the official CSC founder discussion network",
  },
  {
    name: "WhatsApp AI Agent",
    href: siteConfig.social.whatsappAgent,
    icon: "/images/agreements/social/whatsapp-agent.png",
    description: "24/7 AI-powered community assistant & queries",
    badge: "AI Powered",
  },
  {
    name: "LinkedIn",
    href: siteConfig.social.linkedin,
    icon: "/images/agreements/social/linkedin.png",
    description: "Official community announcements & highlights",
  },
  {
    name: "Instagram",
    href: siteConfig.social.instagram,
    icon: "/images/agreements/social/instagram.png",
    description: "Photo drops, event recaps & founder spotlights",
  },
  {
    name: "Email Support",
    href: `mailto:${siteConfig.social.email}`,
    icon: "/images/agreements/social/mail.png",
    description: "Direct correspondence with CSC leadership",
  },
];

export function SigningFooter() {
  return (
    <footer className="mt-16 border-t border-brand-border/60 bg-brand-white/80 py-10 backdrop-blur-md sm:py-12">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 text-center">
        {/* Stay Connected Title & Icon Hub */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-muted">
            Stay Connected
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {SOCIAL_CHANNELS.map((ch) => (
              <Link
                key={ch.name}
                href={ch.href}
                target="_blank"
                rel="noopener noreferrer"
                title={`${ch.name} — ${ch.description}`}
                className="group relative flex size-11 items-center justify-center rounded-full bg-white p-1.5 shadow-xs ring-1 ring-brand-border/80 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-accent/50 sm:size-12"
              >
                <Image
                  src={ch.icon}
                  alt={ch.name}
                  width={38}
                  height={38}
                  className="rounded-full object-contain transition duration-200 group-hover:scale-105"
                />
                {ch.badge ? (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 ring-2 ring-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-950 animate-pulse" />
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </div>

        {/* Minimal 2-Line Copyright & Attribution */}
        <div className="flex flex-col items-center gap-1 text-xs text-brand-muted sm:text-[13px]">
          <p className="font-medium text-brand-secondary">
            Coimbatore Startup Community — A Community-Led Initiative
          </p>
          <p className="text-[11px] text-brand-muted/90">
            Platform Architecture &amp; Engineering by{" "}
            <Link
              href={siteConfig.technologyPartner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-ink underline decoration-brand-border underline-offset-4 hover:text-brand-accent transition"
            >
              Logic Intelligence Technologies (LIT)
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
