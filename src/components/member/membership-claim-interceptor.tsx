"use client";

import { BrandLogo } from "@/components/layout/brand-logo";
import { ClaimForm } from "@/components/member/claim-form";

export function MembershipClaimInterceptor({ displayName }: { displayName?: string }) {
  return (
    <main className="min-h-svh flex flex-col bg-[radial-gradient(ellipse_at_top_left,#f1ecff_0%,transparent_48%),radial-gradient(ellipse_at_bottom_right,#e7f3ff_0%,transparent_46%),#f7f9fc]">
      <div className="flex flex-1 flex-col items-center justify-start px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-2xl">
          <div className="mb-6 flex flex-col items-center gap-3">
            <BrandLogo markSize={40} priority href={null} />
            <h1 className="text-center text-2xl font-bold text-brand-ink sm:text-3xl">
              Welcome to CSC Circle
            </h1>
            <p className="max-w-md text-center text-sm text-brand-muted">
              {displayName ? `Welcome, ${displayName}. ` : ""}
              Claim your free membership to unlock the CSC Circle platform.
            </p>
          </div>
          <ClaimForm isDemo={false} />
        </div>
      </div>
    </main>
  );
}
