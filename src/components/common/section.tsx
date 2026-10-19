import * as React from "react";
import { cn } from "cn";
import { Container } from "@/components/common/container";
import { RevealOnScroll } from "@/components/motion";

/** A full-width page section with consistent vertical rhythm. */
export function Section({
  className,
  containerClassName,
  children,
  as = "section",
  ...props
}: React.ComponentProps<"section"> & {
  containerClassName?: string;
  as?: "section" | "div";
}) {
  const Tag = as as React.ElementType;
  return (
    <Tag className={cn("py-14 sm:py-20 lg:py-28", className)} {...props}>
      <Container className={containerClassName}>{children}</Container>
    </Tag>
  );
}

export function Eyebrow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-xs font-medium tracking-[0.18em] text-brand-accent uppercase",
        className,
      )}
    >
      <span aria-hidden className="h-px w-6 bg-brand-accent/50" />
      {children}
    </span>
  );
}

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  /** Animate the title by words. */
  animated?: boolean;
  as?: "h1" | "h2";
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
  as = "h2",
}: SectionHeadingProps) {
  return (
    <RevealOnScroll
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "mx-auto max-w-2xl text-center items-center" : "items-start",
        className,
      )}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      {React.createElement(
        as,
        {
          className:
            "text-[length:var(--text-section)] leading-[1.08] font-bold tracking-tight text-balance text-brand-ink",
        },
        title,
      )}
      {description ? (
        <p className="text-base leading-relaxed text-brand-secondary sm:text-[17px]">
          {description}
        </p>
      ) : null}
    </RevealOnScroll>
  );
}
