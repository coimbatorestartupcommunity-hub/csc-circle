import * as React from "react";
import { cn } from "cn";
import { Icon, type IconName } from "@/components/common/icon";
import { HoverLiftCard } from "@/components/motion";
import { surfaceBg, surfaceIconBg, type Surface } from "@/components/common/surfaces";

export interface FeatureCardProps {
  icon: IconName;
  title: string;
  body: string;
  surface?: Surface;
  className?: string;
}

/** Equal-height pastel feature card with icon, heading and description. */
export function FeatureCard({
  icon,
  title,
  body,
  surface = "purple",
  className,
}: FeatureCardProps) {
  return (
    <HoverLiftCard>
      <div
        className={cn(
          "flex h-full flex-col gap-4 rounded-3xl p-7 ring-1 ring-brand-border/80",
          surfaceBg[surface],
          className,
        )}
      >
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-2xl ring-1 ring-brand-border/60",
            surfaceIconBg[surface],
          )}
        >
          <Icon name={icon} className="size-6" />
        </span>
        <h3 className="text-xl font-semibold text-brand-ink">{title}</h3>
        <p className="text-[15px] leading-relaxed text-brand-secondary">
          {body}
        </p>
      </div>
    </HoverLiftCard>
  );
}
