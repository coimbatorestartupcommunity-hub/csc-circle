import { CommunityAnnouncement, CommunityIntroduction } from "@/components/home/community-announcement";
import { HeroSection } from "@/components/home/hero-section";
import { CommunityStats } from "@/components/home/community-stats";
import { FeaturesGrid } from "@/components/home/features-grid";
import { HowItWorks } from "@/components/home/how-it-works";
import { FounderPreview } from "@/components/home/founder-preview";
import { UpcomingEvents } from "@/components/home/upcoming-events";
import { CommunityCollaborations } from "@/components/home/community-collaborations";
import { MemberExperience } from "@/components/home/member-experience";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { FinalCta } from "@/components/home/final-cta";

export default function HomePage() {
  return (
    <div className="min-w-0 overflow-x-clip">
      <Suspense fallback={null}><CommunityAnnouncement /></Suspense>
      <HeroSection />
      <Suspense fallback={null}><CommunityIntroduction /></Suspense>
      <CommunityStats />
      <FeaturesGrid />
      <HowItWorks />
      <FounderPreview />
      <UpcomingEvents />
      <CommunityCollaborations />
      <MemberExperience />
      <TestimonialsSection />
      <FinalCta />
    </div>
  );
}
import { Suspense } from "react";
