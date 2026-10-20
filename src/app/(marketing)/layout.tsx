import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";

/** Public marketing pages share the site footer. Member discovery is outside this group. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </>
  );
}
