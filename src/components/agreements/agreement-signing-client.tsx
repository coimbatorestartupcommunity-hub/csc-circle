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
import { FormattedLegalSection } from "@/components/agreements/formatted-legal-section";
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
  partnerLogoUrl?: string | null;
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
    agreement.status !== "signed" &&
    agreement.status !== "voided" &&
    agreement.status !== "expired";

  const [signedName, setSignedName] = React.useState(agreement.recipientName);
  const [signedRole, setSignedRole] = React.useState(agreement.recipientRole);
  const [signedOrg, setSignedOrg] = React.useState(agreement.recipientOrg);
  const [accepted, setAccepted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const [hasPartnerLogo, setHasPartnerLogo] = React.useState(agreement.hasPartnerLogo);
  const [partnerLogoUrl, setPartnerLogoUrl] = React.useState<string | null>(
    agreement.partnerLogoUrl ?? null,
  );

  async function handleLogoUpload(file?: File) {
    if (!file) return;
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
      if (data.previewUrl) {
        setPartnerLogoUrl(data.previewUrl);
      }
      toast.success("Circular organization logo uploaded successfully!");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleLogoRemove() {
    setUploadingLogo(true);
    try {
      const res = await fetch("/api/agreements/partner-logo", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setHasPartnerLogo(false);
        setPartnerLogoUrl(null);
        toast.success("Partner logo removed.");
      }
    } finally {
      setUploadingLogo(false);
    }
  }

  const loginHref = `/login?next=${encodeURIComponent(`/agreements/sign/${token}`)}`;

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

      {/* Verified Signing Session Trust Banner / Email Login Gate */}
      {!isEmailMatched ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50/95 p-4 sm:p-5 text-xs text-amber-950 sm:flex-row sm:items-center sm:justify-between shadow-2xs"
        >
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 size-5 shrink-0 text-amber-700" />
            <div>
              <p className="font-bold text-amber-950 text-sm">
                Email Login Required to Execute Agreement
              </p>
              <p className="mt-1 leading-relaxed text-amber-900">
                {currentUserEmail
                  ? `You are currently signed in as ${currentUserEmail}. To execute this agreement, you must sign in with ${agreement.recipientEmail}.`
                  : `To execute and submit this agreement, you must sign in with your verified email: ${agreement.recipientEmail}.`}
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
            <Button
              render={<Link href={loginHref} />}
              size="sm"
              className="gap-1.5 bg-amber-700 hover:bg-amber-800 text-white"
            >
              <LogIn className="size-3.5" />
              Sign in with Email
            </Button>
          </div>
        </div>
      ) : (
        <div
          role="region"
          aria-label="Verified Signing Session"
          className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="size-4 shrink-0 text-emerald-700" />
            <p className="leading-relaxed">
              <strong>Cryptographically Verified Signing Session:</strong> Signed in as{" "}
              <span className="font-semibold underline decoration-emerald-400 underline-offset-2">
                {currentUserEmail}
              </span>
              . Execution is legally binding under Section 10A of the IT Act, 2000.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-900">
            Verified Signer
          </span>
        </div>
      )}

      {/* Full 3-4 Page Legal Clauses (Compact smaller legal typography as requested) */}
      <div className="rounded-2xl border border-brand-border bg-brand-white p-5 shadow-2xs sm:p-7">
        <div className="mb-4 flex items-center justify-between border-b border-brand-border pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">
            {agreement.subtitle || "Agreement Terms & Covenants"}
          </p>
          <span className="text-[11px] text-brand-muted">Laws of India · Coimbatore Jurisdiction</span>
        </div>

        <div className="flex flex-col gap-6 text-xs leading-relaxed text-brand-secondary sm:text-[13px]">
          {agreement.sections.map((section) => (
            <FormattedLegalSection key={section.heading} section={section} />
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
            <Button
              render={<a href={`/api/agreements/${token}/pdf`} />}
              className="shrink-0 gap-2 bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <Download className="size-4" />
              Download Signed PDF
            </Button>
          </div>
        </div>
      ) : agreement.status === "sent" || agreement.status === "opened" ? (
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
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                <CheckCircle2 className="size-3 text-emerald-600" />
                Verified: {currentUserEmail}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200">
                <Lock className="size-3 text-amber-700" />
                Locked: Sign-in required
              </span>
            )}
          </div>

          {/* Circular Organization / Partner Logo Upload & Visual Preview */}
          <div className="rounded-2xl border border-brand-border bg-gradient-to-r from-brand-cloud/40 via-white to-brand-cloud/30 p-4 sm:p-5 text-xs shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Circular Logo Preview Box */}
                <div className="relative size-16 shrink-0 overflow-hidden rounded-full border-2 border-brand-accent/60 bg-white shadow-xs flex items-center justify-center">
                  {partnerLogoUrl ? (
                    <Image
                      src={partnerLogoUrl}
                      alt="Circular Partner Organization Logo"
                      fill
                      className="object-cover rounded-full"
                      unoptimized
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-1 text-[9px] text-brand-muted">
                      <Upload className="size-4 text-brand-muted mb-0.5" />
                      <span>Circle</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-brand-ink">
                      Circular Organization Logo
                    </p>
                    {partnerLogoUrl ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                        <CheckCircle2 className="size-3 text-emerald-600" />
                        Uploaded &amp; Attached
                      </span>
                    ) : (
                      <span className="text-[10px] text-brand-muted font-normal">(Optional)</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-brand-secondary">
                    {partnerLogoUrl
                      ? "Your circular logo is successfully attached and will be displayed alongside CSC's circular emblem on the official signed agreement."
                      : "Upload your company or institution logo. It will be automatically cropped into a circular shape for the official agreement."}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <label
                  className={`inline-flex items-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-2.5 text-xs font-semibold shadow-2xs transition ${
                    canUploadLogo && !uploadingLogo
                      ? "cursor-pointer text-brand-ink hover:bg-brand-cloud hover:border-brand-accent"
                      : "cursor-not-allowed opacity-50 text-brand-muted"
                  }`}
                >
                  {uploadingLogo ? (
                    <Loader2 className="size-3.5 animate-spin text-brand-accent" />
                  ) : partnerLogoUrl ? (
                    <FileCheck2 className="size-3.5 text-emerald-600" />
                  ) : (
                    <Upload className="size-3.5 text-brand-accent" />
                  )}
                  <span>
                    {uploadingLogo
                      ? "Cropping Circle..."
                      : partnerLogoUrl
                        ? "Replace Logo"
                        : "Upload Circular Logo"}
                  </span>
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

                {partnerLogoUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleLogoRemove}
                    disabled={uploadingLogo}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700 text-xs"
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
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
            <div className="relative overflow-hidden rounded-2xl border border-brand-border bg-gradient-to-br from-[#faf8f5] via-white to-[#f5f0eb] p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex size-2 rounded-full bg-emerald-600 animate-pulse" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-ink">
                    Official Digital Execution Preview (Rendered on PDF)
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-mono text-[9.5px] font-medium text-blue-900 border border-blue-200">
                  Section 10A · IT Act 2000
                </span>
              </div>

              <div className="py-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-brand-muted">Counterparty Signatory Signature</p>
                  <p
                    className="mt-1 text-3xl sm:text-4xl italic text-[#0F2C59] tracking-wide select-none drop-shadow-2xs leading-snug"
                    style={{ fontFamily: "'Caveat', cursive, Georgia, serif" }}
                  >
                    {signedName}
                  </p>
                  <div className="mt-2 h-0.5 w-56 bg-gradient-to-r from-[#0F2C59] via-[#0F2C59]/60 to-transparent" />
                  <p className="mt-1.5 text-[11px] font-medium text-brand-secondary">
                    {signedRole || agreement.recipientRole || "Authorized Signatory"}
                    {signedOrg || agreement.recipientOrg ? ` · ${signedOrg || agreement.recipientOrg}` : ""}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-white/95 p-3 text-[10px] text-emerald-950 backdrop-blur-xs shadow-2xs sm:max-w-xs">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <ShieldCheck className="size-3.5 text-emerald-700" />
                    <span>Cryptographic Audit Stamp</span>
                  </div>
                  <p className="mt-1 leading-snug text-emerald-800">
                    Timestamp: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · Token Verified
                  </p>
                  <p className="mt-0.5 font-mono text-[9px] text-emerald-700">
                    Ref: {agreement.referenceCode}
                  </p>
                </div>
              </div>
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
            {isEmailMatched ? (
              <Button type="submit" disabled={!canSign || submitting || !accepted} className="h-11 gap-2 px-6">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <FileCheck2 className="size-4" />}
                Submit &amp; Sign Agreement
              </Button>
            ) : (
              <Button
                render={<Link href={loginHref} />}
                className="h-11 gap-2 px-6 bg-amber-700 hover:bg-amber-800 text-white"
              >
                <Lock className="size-4" />
                Sign in to Submit &amp; Sign
              </Button>
            )}
          </div>
        </form>
      ) : null}

      {/* 7-Slide Community & Ecosystem Deck (Showcasing CSC Vision, Leadership & Programs) */}
      <CommunityShowcaseDeck />
    </div>
  );
}
