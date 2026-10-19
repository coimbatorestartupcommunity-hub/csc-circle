import * as React from "react";
import { Lock } from "lucide-react";
import { Container } from "@/components/common/container";
import { CtaLink } from "@/components/common/cta-link";
import { WhatsappIcon } from "@/components/common/brand-icons";
import { siteConfig } from "@/lib/content/site";

/**
 * Rendered in production when there is no authenticated session (closed mode).
 * No simulated member data is exposed.
 */
export function MemberUnavailable() {
  return (
    <section className="py-20">
      <Container className="flex max-w-xl flex-col items-center gap-5 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-purple text-brand-accent">
          <Lock className="size-7" aria-hidden />
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-brand-ink text-balance">
          Sign in to access your member area.
        </h1>
        <p className="text-brand-secondary">
          The CSC Circle member portal is for signed-in community members. Sign
          in to view your profile, events and digital membership.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <CtaLink href="/login" size="lg">
            Sign in
          </CtaLink>
          <a
            href={siteConfig.social.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-brand-border bg-brand-white px-6 text-[15px] font-medium text-brand-ink hover:bg-brand-cloud"
          >
            <WhatsappIcon className="size-4.5" />
            Join the community
          </a>
        </div>
      </Container>
    </section>
  );
}
