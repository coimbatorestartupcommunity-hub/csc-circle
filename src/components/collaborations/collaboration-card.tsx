import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HoverLiftCard } from "@/components/motion";
import type { Collaboration } from "@/types/collaboration";

const statusTone: Record<Collaboration["status"], string> = {
  upcoming: "bg-brand-blue text-brand-ink",
  ongoing: "bg-brand-purple text-brand-ink",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-brand-red text-brand-ink",
};

export function CollaborationCard({ collaboration: c }: { collaboration: Collaboration }) {
  return (
    <HoverLiftCard>
      <Link
        href={`/collaborations/${c.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-3xl bg-brand-white ring-1 ring-brand-border focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-cloud">
          {c.featuredImagePath ? (
            <Image
              src={c.featuredImagePath}
              alt={`${c.title} — ${c.tagline ?? "collaboration"}`}
              fill
              sizes="(max-width: 768px) 100vw, 420px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : null}
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge className={statusTone[c.status]}>
              {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
            </Badge>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-6">
          <div className="flex items-center gap-2">
            {c.partners.slice(0, 3).map((p) =>
              p.organization.logoPath ? (
                <span
                  key={p.organization.id}
                  className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-brand-white ring-1 ring-brand-border"
                >
                  <Image
                    src={p.organization.logoPath}
                    alt={p.organization.name}
                    width={32}
                    height={32}
                    className="size-full object-contain p-0.5"
                  />
                </span>
              ) : null,
            )}
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-brand-ink">{c.title}</h3>
            {c.tagline ? <p className="text-sm font-medium text-brand-accent">{c.tagline}</p> : null}
          </div>

          <p className="flex-1 text-sm leading-relaxed text-brand-secondary">{c.summary}</p>

          <div className="mt-1 flex items-center justify-between gap-2 border-t border-brand-border pt-3">
            <span className="text-xs text-brand-muted">{c.category}</span>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-accent">
              View collaboration <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </HoverLiftCard>
  );
}
