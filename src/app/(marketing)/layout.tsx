import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { TechnologyPartnerSection } from "@/components/common/technology-partner-section";

/** Public marketing pages share the technology partnership section and site footer. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="flex flex-1 flex-col">{children}</main>
      <TechnologyPartnerSection />
      <SiteFooter />
    </>
  );
}
