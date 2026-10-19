import { HeroSection } from "@/components/home/hero-section";
import { CommunityStats } from "@/components/home/community-stats";
import { FeaturesGrid } from "@/components/home/features-grid";
import { HowItWorks } from "@/components/home/how-it-works";
import { FounderPreview } from "@/components/home/founder-preview";
import { UpcomingEvents } from "@/components/home/upcoming-events";
import { MemberExperience } from "@/components/home/member-experience";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { FinalCta } from "@/components/home/final-cta";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CommunityStats />
      <FeaturesGrid />
      <HowItWorks />
      <FounderPreview />
      <UpcomingEvents />
      <MemberExperience />
      <TestimonialsSection />
      <FinalCta />
    </>
  );
}
