import { getPublicContent } from "@/lib/services/content";
import * as React from "react";
import { Target, Telescope } from "lucide-react";
import { Container } from "@/components/common/container";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { mission, vision } from "@/lib/content/about";

export async function MissionVision() {
  const content = await getPublicContent();
  const panels = [
    {
      icon: Target,
      label: "Our mission",
      heading: mission.heading,
      body: content["about.mission"] || mission.body,
      surface: "bg-brand-purple",
    },
    {
      icon: Telescope,
      label: "Our vision",
      heading: vision.heading,
      body: content["about.vision"] || vision.body,
      surface: "bg-brand-blue",
    },
  ];

  return (
    <section className="py-14 sm:py-20 lg:py-28">
      <Container>
        <StaggerContainer className="grid gap-5 md:grid-cols-2">
          {panels.map((panel) => (
            <StaggerItem key={panel.label} className="h-full">
              <div
                className={`flex h-full flex-col gap-4 rounded-[2rem] ${panel.surface} p-8 ring-1 ring-brand-border sm:p-10`}
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-white/70 text-brand-accent ring-1 ring-brand-border/60">
                  <panel.icon className="size-6" aria-hidden />
                </span>
                <span className="font-mono text-xs tracking-[0.18em] text-brand-muted uppercase">
                  {panel.label}
                </span>
                <h2 className="text-2xl leading-tight font-bold text-brand-ink text-balance sm:text-3xl">
                  {panel.heading}
                </h2>
                <p className="text-[15px] leading-relaxed text-brand-secondary sm:text-base">
                  {panel.body}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Container>
    </section>
  );
}
