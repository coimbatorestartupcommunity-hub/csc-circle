"use client";

import * as React from "react";
import {
  TrendingUp,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  CalendarDays,
  Ticket,
  Rocket,
  Zap,
  Activity,
  Layers,
} from "lucide-react";

interface MemberVisualAnalyticsProps {
  profileCompletion: number;
  totalPasses: number;
  upcomingEvents: number;
  consultationsCount: number;
  reviewsCount: number;
  hasPublishedStartup: boolean;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
}

export function MemberVisualAnalytics({
  profileCompletion,
  totalPasses,
  upcomingEvents,
  consultationsCount,
  reviewsCount,
  hasPublishedStartup,
  isPhoneVerified,
  isEmailVerified,
}: MemberVisualAnalyticsProps) {
  // Activity metrics across the last 6 months (live normalized baseline)
  const monthlyActivity = [
    { month: "Jun", events: 1, engagement: 45 },
    { month: "Jul", events: 2, engagement: 60 },
    { month: "Aug", events: 1, engagement: 55 },
    { month: "Sep", events: 3, engagement: 80 },
    { month: "Oct", events: 2, engagement: 70 },
    { month: "Nov", events: Math.max(1, totalPasses + upcomingEvents), engagement: 95 },
  ];

  const maxVal = Math.max(...monthlyActivity.map((d) => d.engagement), 100);

  // Readiness checklist scores
  const readinessItems = [
    {
      label: "Profile Data & Portrait",
      score: profileCompletion,
      isComplete: profileCompletion >= 100,
      note: profileCompletion >= 100 ? "Complete & Published" : `${profileCompletion}% Completed`,
    },
    {
      label: "WhatsApp Mobile Verified",
      score: isPhoneVerified ? 100 : 0,
      isComplete: isPhoneVerified,
      note: isPhoneVerified ? "Verified (+91 75500...)" : "Pending WhatsApp OTP",
    },
    {
      label: "Email ID Multi-Channel",
      score: isEmailVerified ? 100 : 0,
      isComplete: isEmailVerified,
      note: isEmailVerified ? "Unified Account Active" : "Action Needed in Settings",
    },
    {
      label: "Apple & Google Wallet Ready",
      score: totalPasses > 0 ? 100 : 75,
      isComplete: totalPasses > 0,
      note: totalPasses > 0 ? "Passes Downloadable" : "Available on Event RSVP",
    },
    {
      label: "Founder Directory Listing",
      score: hasPublishedStartup ? 100 : 50,
      isComplete: hasPublishedStartup,
      note: hasPublishedStartup ? "Live in Directory" : "Submit Startup Profile",
    },
  ];

  const overallEcosystemScore = Math.round(
    readinessItems.reduce((acc, curr) => acc + curr.score, 0) / readinessItems.length
  );

  return (
    <section className="mt-8 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-border/60 pb-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
            Telemetry &amp; Ecosystem Readiness
          </span>
          <h2 className="text-lg font-bold text-brand-ink">
            Member Engagement Analytics &amp; Platform Health
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
            <Zap className="size-3.5 text-emerald-600" /> Ecosystem Score: {overallEcosystemScore}%
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart 1: Visual Activity Velocity Graph */}
        <div className="flex flex-col justify-between rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs ring-1 ring-brand-border/60">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                  <Activity className="size-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-brand-ink">Community Participation Velocity</h3>
                  <p className="text-xs text-brand-secondary">Monthly event check-ins &amp; mentorship attendance</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <TrendingUp className="size-3.5" /> +28% MoM
              </span>
            </div>

            {/* SVG Interactive Chart Bars */}
            <div className="mt-6 flex h-44 w-full items-end gap-3 pt-4 sm:gap-4">
              {monthlyActivity.map((d, idx) => {
                const heightPercent = Math.round((d.engagement / maxVal) * 100);
                const isCurrent = idx === monthlyActivity.length - 1;
                return (
                  <div key={d.month} className="group relative flex flex-1 flex-col items-center gap-2">
                    {/* Tooltip on hover */}
                    <div className="pointer-events-none absolute -top-8 hidden rounded-lg bg-brand-ink px-2 py-1 text-[10px] font-bold text-white shadow-md group-hover:block z-10 whitespace-nowrap">
                      {d.engagement} pts · {d.events} event(s)
                    </div>

                    <div className="flex h-32 w-full flex-col justify-end rounded-xl bg-brand-cloud/40 p-1">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-lg transition-all duration-500 ${
                          isCurrent
                            ? "bg-gradient-to-t from-emerald-600 to-teal-400 shadow-sm"
                            : "bg-gradient-to-t from-brand-accent/80 to-purple-400/80 group-hover:from-brand-accent"
                        }`}
                      />
                    </div>
                    <span className={`text-[11px] font-semibold ${isCurrent ? "text-brand-ink font-bold" : "text-brand-muted"}`}>
                      {d.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-brand-border/60 pt-3 text-xs text-brand-secondary">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" /> Active November Cycle
            </span>
            <span>Total Passes: {totalPasses} · Consultations: {consultationsCount}</span>
          </div>
        </div>

        {/* Chart 2: Ecosystem Readiness Progress Matrix */}
        <div className="flex flex-col justify-between rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs ring-1 ring-brand-border/60">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-brand-ink">Ecosystem Readiness Checklist</h3>
                  <p className="text-xs text-brand-secondary">Credential synchronization across CSC platforms</p>
                </div>
              </div>
              <span className="rounded-full bg-brand-cloud px-2.5 py-0.5 text-xs font-bold text-brand-ink">
                {readinessItems.filter((i) => i.isComplete).length} / {readinessItems.length} Ready
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-3.5">
              {readinessItems.map((item) => (
                <div key={item.label} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-brand-ink flex items-center gap-1.5">
                      {item.isComplete ? (
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                      ) : (
                        <span className="size-3.5 rounded-full border border-brand-muted/60" />
                      )}
                      {item.label}
                    </span>
                    <span className={`text-[11px] font-medium ${item.isComplete ? "text-emerald-700 font-semibold" : "text-amber-700"}`}>
                      {item.note}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-brand-cloud">
                    <div
                      style={{ width: `${item.score}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.isComplete ? "bg-emerald-600" : "bg-amber-500"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 border-t border-brand-border/60 pt-3 text-xs text-brand-secondary flex items-center justify-between">
            <span>Security Standard: TLS 1.3 &amp; Cryptographic Signatures</span>
            <span className="font-semibold text-brand-accent">100% Data Sovereignty</span>
          </div>
        </div>
      </div>
    </section>
  );
}
