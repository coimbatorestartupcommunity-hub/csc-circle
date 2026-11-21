import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Briefcase, Clock, ShieldCheck, Sparkles, Building2, Send, CheckCircle2 } from "lucide-react";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { getMemberContext } from "@/lib/services/member/context";
import { MemberUnavailable } from "@/components/member/member-unavailable";
import { MemberOpportunityForm } from "@/components/member/member-opportunity-form";

export const metadata: Metadata = {
  title: "Post & Manage Opportunities — CSC Member Portal",
  description: "Publish startup opportunities, co-founder openings, seed grants, and hiring posts to the Coimbatore Startup Community within 24 hours.",
};

export const instant = false;

export default async function MemberOpportunitiesPage() {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return <MemberUnavailable />;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-6 py-2">
      <MemberPageHeader
        title="Post & Manage Founder Opportunities"
        description="Share co-founder searches, technical hires, grants, hackathons, and partnerships directly with the CSC community. All postings are reviewed and published within 24 hours."
      />

      {/* 24-Hour Moderation & Direct Outreach Policy Notice */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 text-xs text-emerald-900">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Clock className="size-4" />
          </span>
          <div>
            <h3 className="font-bold text-sm text-emerald-950">24-Hour Approval &amp; Direct Founder Outreach</h3>
            <p className="mt-0.5 leading-relaxed text-emerald-800">
              When approved, your opportunity will be featured on the public Opportunities board. Interested members will connect with you directly via your specified contact email.
            </p>
          </div>
        </div>
        <Link
          href="/opportunities"
          className="shrink-0 rounded-xl bg-emerald-700 px-3.5 py-2 font-semibold text-white transition hover:bg-emerald-800"
        >
          View Live Board &rarr;
        </Link>
      </div>

      {/* Opportunity Submission Form */}
      <div className="rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-8 shadow-xs ring-1 ring-brand-border/60">
        <div className="flex flex-col gap-1 mb-6 border-b border-brand-border/60 pb-4">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-cloud px-3 py-0.5 text-xs font-semibold text-brand-accent">
            <Sparkles className="size-3.5" /> Founder &amp; Startup Intake
          </span>
          <h2 className="text-xl font-bold text-brand-ink">Publish an Ecosystem Opportunity</h2>
          <p className="text-xs text-brand-secondary">
            Fill in the details below. Our team verifies the posting before publishing it to the wider ecosystem.
          </p>
        </div>

        <MemberOpportunityForm userEmail={ctx.user?.email || ""} />
      </div>
    </div>
  );
}
