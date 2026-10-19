import type { Metadata } from "next";
import { Container } from "@/components/common/container";
import { CtaLink } from "@/components/common/cta-link";
import { Eyebrow } from "@/components/common/section";
import { primaryNav } from "@/lib/content/site";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section className="flex flex-1 items-center py-20">
      <Container className="flex flex-col items-center gap-6 text-center">
        <Eyebrow>Error 404</Eyebrow>
        <h1 className="text-[length:var(--text-section)] leading-tight font-extrabold tracking-tight text-balance text-brand-ink">
          This page took a different path.
        </h1>
        <p className="max-w-md text-base leading-relaxed text-brand-secondary">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
          Let&apos;s get you back to the circle.
        </p>
        <CtaLink href="/" size="lg">
          Back to home
        </CtaLink>
        <nav
          aria-label="Helpful links"
          className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm"
        >
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-medium text-brand-muted underline-offset-4 hover:text-brand-ink hover:underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </Container>
    </section>
  );
}
