"use client";

import * as React from "react";
import { ShieldCheck, Download, Trash2, Mail, FileText, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DpdpPanelProps {
  email?: string;
  fullName?: string;
  memberNumber?: string;
}

export function DpdpCompliancePanel({ email, fullName, memberNumber }: DpdpPanelProps) {
  const [downloading, setDownloading] = React.useState(false);
  const [showEraseConfirm, setShowEraseConfirm] = React.useState(false);

  function handleDataExport() {
    setDownloading(true);
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        regime: "Digital Personal Data Protection (DPDP) Act, 2023 (India)",
        dataFiduciary: "Coimbatore Startup Community (CSC Circle)",
        engineeringPartner: "Logic Intelligence Technologies",
        personalDataInventory: {
          fullName: fullName || "CSC Member",
          email: email || "unknown",
          membershipId: memberNumber || "Pending",
          verifiedPurpose: "Digital pass verification, event attendance, founder directory",
          subProcessors: ["Supabase PostgreSQL", "Upstash Redis", "Vercel Edge", "Google Meet"],
        },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CSC-Personal-Data-Export-${memberNumber || "account"}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Personal data inventory exported successfully.");
    } catch {
      toast.error("Could not export data. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="flex flex-col gap-5 rounded-3xl border border-brand-border bg-white p-6 sm:p-7 shadow-xs">
      <div className="flex items-start justify-between gap-3 border-b border-brand-border/60 pb-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
            <Lock className="size-5" />
          </span>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-800">
              India DPDP Act 2023 Compliant
            </span>
            <h3 className="mt-1 text-base font-bold text-brand-ink">
              Data Privacy &amp; Consent Management Center
            </h3>
            <p className="mt-0.5 text-xs text-brand-secondary leading-relaxed">
              Exercise your statutory rights under the Digital Personal Data Protection Act: data portability, purpose review, and erasure.
            </p>
          </div>
        </div>
      </div>

      {/* Principles Grid */}
      <div className="grid gap-3 sm:grid-cols-3 text-xs">
        <div className="rounded-2xl border border-brand-border/80 bg-brand-cloud/40 p-3.5">
          <p className="font-bold text-brand-ink">Purpose Limitation</p>
          <p className="mt-1 text-[11px] text-brand-secondary leading-relaxed">
            Data collected is strictly used for membership credentials and event check-in verification. Never sold or rented.
          </p>
        </div>
        <div className="rounded-2xl border border-brand-border/80 bg-brand-cloud/40 p-3.5">
          <p className="font-bold text-brand-ink">Right to Correction</p>
          <p className="mt-1 text-[11px] text-brand-secondary leading-relaxed">
            Update your profile, startup designation, or contact records anytime with immediate propagation.
          </p>
        </div>
        <div className="rounded-2xl border border-brand-border/80 bg-brand-cloud/40 p-3.5">
          <p className="font-bold text-brand-ink">Grievance Redressal</p>
          <p className="mt-1 text-[11px] text-brand-secondary leading-relaxed">
            Designated Grievance Officer responds to all inquiries within 48 business hours as mandated by Indian IT Rules.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-border/60 pt-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleDataExport}
            disabled={downloading}
            variant="outline"
            className="h-10 gap-2 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <Download className="size-3.5 text-brand-accent" />
            <span>Download My Data (JSON)</span>
          </Button>

          <a
            href="mailto:coimbatorestartupcommunity@gmail.com?subject=DPDP%20Right%20to%20Erasure%20Request"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/50 px-3.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition cursor-pointer"
          >
            <Trash2 className="size-3.5 text-red-600" />
            <span>Request Account Erasure</span>
          </a>
        </div>

        <a
          href="/privacy"
          target="_blank"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-accent hover:underline"
        >
          <FileText className="size-3.5" /> Read Full Privacy Policy &rarr;
        </a>
      </div>
    </section>
  );
}
