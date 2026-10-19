import * as React from "react";
import { Section, SectionHeading } from "@/components/common/section";
import { CommunityTestimonials } from "@/components/testimonials";
import { getPublishedTestimonials } from "@/lib/services/testimonials";

export function TestimonialsSection() {
  const testimonials = getPublishedTestimonials();
  return (
    <Section id="testimonials" className="bg-brand-white">
      <SectionHeading
        eyebrow="Community voices"
        title="What CSC Members Are Saying."
        description="Honest words from the founders and builders in our circle."
      />
      <div className="mt-12">
        <CommunityTestimonials testimonials={testimonials} />
      </div>
    </Section>
  );
}
