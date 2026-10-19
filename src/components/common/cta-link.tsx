import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { ArrowRight } from "lucide-react";

const ctaVariants = cva(
  "group/cta inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-ink text-brand-white shadow-sm hover:bg-brand-ink/90 hover:shadow-md",
        accent:
          "bg-brand-accent text-brand-accent-foreground shadow-sm hover:bg-brand-accent/90 hover:shadow-md",
        outline:
          "border border-brand-border bg-brand-white text-brand-ink hover:border-brand-ink/30 hover:bg-brand-cloud",
        ghost: "text-brand-ink hover:bg-brand-cloud",
      },
      size: {
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-6 text-[15px]",
      },
    },
    defaultVariants: { variant: "primary", size: "lg" },
  },
);

export interface CtaLinkProps
  extends Omit<React.ComponentProps<typeof Link>, "href">,
    VariantProps<typeof ctaVariants> {
  href: string;
  /** Show an arrow that nudges right on hover. */
  arrow?: boolean;
}

/** Primary marketing call-to-action link with an animated arrow. */
export function CtaLink({
  href,
  variant,
  size,
  arrow = true,
  className,
  children,
  ...props
}: CtaLinkProps) {
  return (
    <Link
      href={href}
      className={cn(ctaVariants({ variant, size }), className)}
      {...props}
    >
      {children}
      {arrow ? (
        <ArrowRight
          className="size-4 transition-transform duration-200 group-hover/cta:translate-x-0.5"
          aria-hidden="true"
        />
      ) : null}
    </Link>
  );
}
