"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Download,
  FileCheck2,
  Loader2,
  Lock,
  LogIn,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { brandAssets } from "@/lib/content/site";
import type { AgreementSection } from "@/lib/agreements/templates";
import { CommunityShowcaseDeck } from "@/components/agreements/community-showcase-deck";

export interface PublicAgreementView {
  id: string;
  referenceCode: string;
  title: string;
  eyebrow: string;
  subtitle: string;
  effectiveDate: string;
  durationLabel: string;
  recipientName: string;
  recipientEmail: string;
  recipientRole: string;
  recipientOrg: string;
  cscSignatoryName: string;
  cscSignatoryRole: string;
  sections: AgreementSection[];
  status: "draft" | "sent" | "opened" | "signed" | "voided" | "expired";
  hasPartnerLogo: boolean;
  signedName: string | null;
  signedAt: string | null;
  documentHash: string | null;
}

export function AgreementSigningClient({
  token,
  agreement,
  currentUserEmail,
}: {
  token: string;
  agreement: PublicAgreementView;
  currentUserEmail: string | null;
}) {
  const router = useRouter();
  const isEmailMatched = Boolean(
    currentUserEmail &&
      currentUserEmail.toLowerCase().trim() === agreement.recipientEmail.toLowerCase().trim(),
  );
  const canSign = isEmailMatched && (agreement.status === "sent" || agreement.status === "opened");
  const canUploadLogo =
    Boolean(currentUserEmail) &&
    agreement.status !== "signed" &&
    agreement.status !== "voided";

  const [signedName, setSignedName] = React.useState(agreement.recipientName);
  const [signedRole, setSignedRole] = React.useState(agreement.recipientRole);
  const [signedOrg, setSignedOrg] = React.useState(agreement.recipientOrg);
  const [accepted, setAccepted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const [hasPartnerLogo, setHasPartnerLogo] = React.useState(agreement.hasPartnerLogo);

  async function handleLogoUpload(file?: File) {
    if (!file) return;
    if (!currentUserEmail) {
      toast.error(`Please sign in first to attach an organization logo.`);
      return;
    }
    setUploadingLogo(true);
    try {
      const form = new FormData();
      form.append("token", token);
      form.append("logo", file);
      const res = await fetch("/api/agreements/partner-logo", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Logo upload failed.");
        return;
      }
      setHasPartnerLogo(true);
      toast.success("Organization logo attached to this agreement.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSign(e: React.FormEvent) {
    e.preventDefault();
    if (!canSign) return;
    if (!accepted) {
      toast.error("Please check the acceptance box before signing.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/agreements/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          signedName: signedName.trim(),
          signedRole: signedRole.trim(),
          signedOrg: signedOrg.trim(),
          accepted: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not sign agreement.");
        return;
      }
      toast.success("Agreement digitally signed! A PDF copy has been sent to your email.");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const loginHref = `/login?next=${encodeURIComponent(`/agreements/sign/${token}`)}`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      {/* Header Card matching CSC Circle website style */}
      <div className="rounded-2xl border border-brand-border bg-brand-white p-5 shadow-2xs sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border pb-4">
          <div className="flex items-center gap-3">
            <Image
              src={brandAssets.cscLogo}
              alt="Coimbatore Startup Community logo"
              width={44}
              height={44}
              className="rounded-full ring-1 ring-brand-border"
            />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-accent">
                {agreement.eyebrow || "CSC Circle Official Agreement"}
              </p>
              <h1 className="text-lg font-bold tracking-tight text-brand-ink sm:text-xl">
                {agreement.title}
              </h1>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              agreement.status === "signed"
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                : agreement.status === "voided" || agreement.status === "expired"
                  ? "bg-red-50 text-red-800 ring-1 ring-red-200"
                  : "bg-brand-cloud text-brand-ink ring-1 ring-brand-border"
            }`}
          >
            {agreement.status === "signed"
              ? "Digitally Signed"
              : agreement.status === "voided"
                ? "Voided"
                : agreement.status === "expired"
                  ? "Expired"
                  : "Awaiting Signature"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 rounded-xl bg-brand-cloud/50 p-4 text-xs text-brand-secondary sm:grid-cols-2">
          <div>
            <p className="font-semibold text-brand-ink">Reference &amp; Effective Date</p>
            <p className="mt-0.5 font-mono text-[11px]">{agreement.referenceCode}</p>
            <p className="mt-0.5">
              Effective: {agreement.effectiveDate} · Term: {agreement.durationLabel}
            </p>
          </div>
          <div>
            <p className="font-semibold text-brand-ink">Addressed To</p>
            <p className="mt-0.5">
              {agreement.recipientName}
              {agreement.recipientOrg ? ` — ${agreement.recipientOrg}` : ""}
            </p>
            <p className="mt-0.5 text-brand-muted">{agreement.recipientEmail}</p>
          </div>
        </div>
      </div>

      {/* Mandatory Email Login Gate */}
      {agreement.status === "sent" && !isEmailMatched ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-5 text-xs text-amber-950 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 size-4 shrink-0 text-amber-700" />
            <div>
              <p className="font-semibold text-amber-950">
                Email Login Required Before Signing
              </p>
              <p className="mt-1 leading-relaxed text-amber-900">
                {currentUserEmail
                  ? `You are currently signed in as ${currentUserEmail}. Please sign in with ${agreement.recipientEmail} to unlock the digital signature button.`
                  : `Please sign in with ${agreement.recipientEmail} (via Google or Email OTP) to verify your identity and unlock digital signing.`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {currentUserEmail ? (
              <form action="/auth/signout" method="post">
                <Button type="submit" variant="outline" size="sm">
                  Sign out
                </Button>
              </form>
            ) : null}
            <Button render={<Link href={loginHref} />} size="sm" className="gap-1.5">
              <LogIn className="size-3.5" />
              Sign in with Email
            </Button>
          </div>
        </div>
      ) : null}

      {/* Full 3-4 Page Legal Clauses (Compact smaller legal typography as requested) */}
      <div className="rounded-2xl border border-brand-border bg-brand-white p-5 shadow-2xs sm:p-7">
        <div className="mb-4 flex items-center justify-between border-b border-brand-border pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">
            {agreement.subtitle || "Agreement Terms & Covenants"}
          </p>
          <span className="text-[11px] text-brand-muted">Laws of India · Coimbatore Jurisdiction</span>
        </div>

        <div className="flex flex-col gap-5 text-xs leading-relaxed text-brand-secondary sm:text-[13px]">
          {agreement.sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-brand-ink sm:text-[13px]">
                {section.heading}
              </h2>
              {section.clauses.map((clause, idx) => (
                <p key={idx} className="leading-relaxed">
                  {clause}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>

      {/* Signed Confirmation & PDF Download OR Signing Form */}
      {agreement.status === "signed" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-xs text-emerald-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
              <div>
                <h2 className="text-sm font-bold text-emerald-950">
                  Agreement Digitally Signed &amp; Sealed
                </h2>
                <p className="mt-1 text-emerald-900">
                  Signed by <strong>{agreement.signedName}</strong> on{" "}
                  {agreement.signedAt ? new Date(agreement.signedAt).toLocaleString("en-IN") : "record"}.
                  A signed PDF copy has been emailed to {agreement.recipientEmail}.
                </p>
                {agreement.documentHash ? (
                  <p className="mt-1.5 font-mono text-[10px] text-emerald-800 break-all">
                    SHA-256: {agreement.documentHash}
                  </p>
                ) : null}
              </div>
            </div>
            {isEmailMatched ? (
              <Button
                render={<a href={`/api/agreements/${token}/pdf`} />}
                className="shrink-0 gap-2"
              >
                <Download className="size-4" />
                Download Signed PDF
              </Button>
            ) : (
              <Button render={<Link href={loginHref} />} variant="outline" className="shrink-0 gap-2">
                <LogIn className="size-4" />
                Sign in to Download PDF
              </Button>
            )}
          </div>
        </div>
      ) : agreement.status === "sent" ? (
        <form
          onSubmit={handleSign}
          className="flex flex-col gap-5 rounded-2xl border border-brand-border bg-brand-white p-5 shadow-2xs sm:p-7"
        >
          <div className="flex items-center justify-between gap-3 border-b border-brand-border pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-brand-accent" />
              <h2 className="text-sm font-bold text-brand-ink">
                Digital Execution &amp; Signature
              </h2>
            </div>
            {isEmailMatched ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                Verified: {currentUserEmail}
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                Locked until email login
              </span>
            )}
          </div>

          {/* Optional Organization / Partner Logo Upload */}
          <div className="rounded-xl border border-dashed border-brand-border bg-brand-cloud/40 p-4 text-xs">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-brand-ink">
                  Organization / Partner Logo (Optional)
                </p>
                <p className="mt-0.5 text-brand-muted">
                  Optionally attach your PNG, JPG, or WebP logo to appear alongside CSC&apos;s circular logo on the final PDF.
                </p>
              </div>
              <label
                className={`inline-flex items-center gap-2 rounded-xl border border-brand-border bg-white px-3.5 py-2 text-xs font-semibold transition ${
                  canUploadLogo && !uploadingLogo
                    ? "cursor-pointer text-brand-ink hover:bg-brand-cloud"
                    : "cursor-not-allowed opacity-50 text-brand-muted"
                }`}
              >
                {uploadingLogo ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : hasPartnerLogo ? (
                  <FileCheck2 className="size-3.5 text-emerald-600" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                <span>{hasPartnerLogo ? "Logo Attached (Replace)" : "Upload Logo"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={!canUploadLogo || uploadingLogo}
                  className="sr-only"
                  onChange={(e) => {
                    void handleLogoUpload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
              Full Legal Name (Digital Signature) *
              <Input
                required
                disabled={!canSign}
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
                placeholder="Type your full legal name"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
              Role / Designation
              <Input
                disabled={!canSign}
                value={signedRole}
                onChange={(e) => setSignedRole(e.target.value)}
                placeholder="e.g. Founder / Authorized Signatory"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
              Organization (Optional)
              <Input
                disabled={!canSign}
                value={signedOrg}
                onChange={(e) => setSignedOrg(e.target.value)}
                placeholder="Company or Institution"
              />
            </label>
          </div>

          {signedName.trim() ? (
            <div className="rounded-xl border border-brand-border bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-muted">
                Signature Preview (Rendered on Signed PDF)
              </p>
              <p className="mt-1 font-serif text-2xl italic text-blue-800">
                {signedName}
              </p>
            </div>
          ) : null}

          <label className="flex items-start gap-3 text-xs leading-relaxed text-brand-secondary">
            <Checkbox
              checked={accepted}
              disabled={!canSign}
              onCheckedChange={(c) => setAccepted(c === true)}
            />
            <span>
              I confirm that I have read the entire agreement above, am authorized to execute it on behalf of myself / my organization, and agree to be legally bound under Section 10A of the Information Technology Act, 2000.
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-brand-muted">
              CSC Authorized Signatory: <strong>{agreement.cscSignatoryName}</strong>
            </p>
            <Button type="submit" disabled={!canSign || submitting} className="h-11 gap-2 px-6">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <FileCheck2 className="size-4" />}
              Submit &amp; Sign Agreement
            </Button>
          </div>
        </form>
      ) : null}

      {/* 7-Slide Community & Ecosystem Deck (Showcasing CSC Vision, Leadership & Programs) */}
      <CommunityShowcaseDeck />
    </div>
  );
}
