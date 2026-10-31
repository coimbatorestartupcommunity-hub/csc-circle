import * as React from "react";
import { Section, SectionHeading } from "@/components/common/section";
import { CommunityTestimonials } from "@/components/testimonials";
import { ReviewDialog } from "@/components/reviews/review-dialog";
import { getPublicTestimonials } from "@/lib/services/public-data";
import { CtaLink } from "@/components/common/cta-link";

export async function TestimonialsSection() {
  const testimonials = await getPublicTestimonials();
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
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <ReviewDialog
          type="general"
          buttonLabel="Rate & Review CSC Circle"
          variant="glass"
          className="h-12 rounded-2xl px-6 text-sm font-semibold shadow-md"
        />
        <CtaLink href="/events" variant="outline" size="lg">
          Events &amp; Booking
        </CtaLink>
      </div>
    </Section>
  );
}
