"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileSignature,
  Loader2,
  Plus,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AGREEMENT_TYPE_META,
  LEADERSHIP_PROFILES,
  type AgreementType,
  type LeadershipRoleKey,
} from "@/lib/agreements/templates";
import type { DigitalAgreementRow } from "@/lib/agreements/db";

const AGREEMENT_TYPES = Object.values(AGREEMENT_TYPE_META);
const LEADER_OPTIONS = Object.values(LEADERSHIP_PROFILES);

export function AdminAgreementsClient({
  initialAgreements,
  siteUrl,
}: {
  initialAgreements: DigitalAgreementRow[];
  siteUrl: string;
}) {
  const router = useRouter();
  const [agreements, setAgreements] = React.useState(initialAgreements);
  const [showBuilder, setShowBuilder] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState<AgreementType>("tech_partner");
  const [leadershipRole, setLeadershipRole] = React.useState<LeadershipRoleKey>("cto");

  const [recipientName, setRecipientName] = React.useState("Vikash Saravanan");
  const [recipientEmail, setRecipientEmail] = React.useState("");
  const [recipientRole, setRecipientRole] = React.useState("Founder & CEO, LIT / CTO, CSC");
  const [recipientOrg, setRecipientOrg] = React.useState("Logic Intelligence Technologies");
  const [recipientWhatsapp, setRecipientWhatsapp] = React.useState("");
  const [effectiveDate, setEffectiveDate] = React.useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [durationLabel, setDurationLabel] = React.useState(
    AGREEMENT_TYPE_META.tech_partner.defaultDuration,
  );
  const [customTitle, setCustomTitle] = React.useState("");
  const [customBody, setCustomBody] = React.useState("");
  const [formData, setFormData] = React.useState<Record<string, string>>({});
  const [sendEmail, setSendEmail] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  function selectType(type: AgreementType) {
    setSelectedType(type);
    setDurationLabel(AGREEMENT_TYPE_META[type].defaultDuration);
    setFormData({});
    if (type === "tech_partner") {
      setRecipientName("Vikash Saravanan");
      setRecipientRole("Founder & CEO, LIT / CTO, CSC");
      setRecipientOrg("Logic Intelligence Technologies");
    } else if (type === "leadership_charter") {
      const p = LEADERSHIP_PROFILES[leadershipRole];
      setRecipientName(p.defaultName);
      setRecipientRole(p.roleTitle);
      setRecipientOrg("Coimbatore Startup Community");
      setFormData({ externalVenture: p.externalVenture });
    } else {
      setRecipientName("");
      setRecipientRole("");
      setRecipientOrg("");
    }
  }

  function selectLeader(role: LeadershipRoleKey) {
    setLeadershipRole(role);
    const p = LEADERSHIP_PROFILES[role];
    setRecipientName(p.defaultName);
    setRecipientRole(p.roleTitle);
    setRecipientOrg("Coimbatore Startup Community");
    setFormData((prev) => ({ ...prev, externalVenture: p.externalVenture }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        agreementType: selectedType,
        recipientName: recipientName.trim(),
        recipientEmail: recipientEmail.trim(),
        recipientRole: recipientRole.trim(),
        recipientOrg: recipientOrg.trim(),
        recipientWhatsapp: recipientWhatsapp.trim(),
        effectiveDate,
        durationLabel: durationLabel.trim(),
        formData,
        sendEmail,
      };
      if (selectedType === "leadership_charter") {
        payload.leadershipRole = leadershipRole;
      }
      if (selectedType === "custom") {
        if (customTitle.trim()) payload.title = customTitle.trim();
        if (customBody.trim()) {
          payload.customSections = [
            {
              heading: "1. Agreed Terms & Covenants",
              clauses: customBody.split(/\n+/).map((s) => s.trim()).filter(Boolean),
            },
          ];
        }
      }

      const res = await fetch("/api/admin/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create agreement.");
        return;
      }
      setAgreements((prev) => [data.agreement as DigitalAgreementRow, ...prev]);
      setShowBuilder(false);
      toast.success(
        sendEmail
          ? "Agreement created and signing link emailed!"
          : "Agreement created! Copy the signing link below.",
      );
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function copyLink(id: string, token: string) {
    const url = `${siteUrl}/agreements/sign/${token}`;
    void navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Signing link copied to clipboard.");
    window.setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowBuilder((v) => !v)} className="gap-2">
            <Plus className="size-4" />
            {showBuilder ? "Close Agreement Builder" : "New Digital Agreement"}
          </Button>
          <Button variant="outline" render={<Link href="/admin/agreements/preview" />} className="gap-2">
            <FileSignature className="size-4" />
            Open Agreement PDF Studio
          </Button>
        </div>
        <p className="text-xs text-brand-muted">
          Total agreements: <strong>{agreements.length}</strong>
        </p>
      </div>

      {showBuilder ? (
        <form
          onSubmit={handleCreate}
          className="space-y-6 rounded-2xl border border-brand-border bg-white p-5 shadow-xs sm:p-7"
        >
          <div>
            <h2 className="text-base font-bold text-brand-ink">1. Select Agreement Type</h2>
            <p className="mt-1 text-xs text-brand-muted">
              Each template generates a dedicated 3–4 page legal agreement and editorial white PDF.
            </p>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {AGREEMENT_TYPES.map((meta) => {
                const active = selectedType === meta.type;
                return (
                  <button
                    key={meta.type}
                    type="button"
                    onClick={() => selectType(meta.type)}
                    className={`rounded-xl border p-3.5 text-left transition ${
                      active
                        ? "border-brand-ink bg-brand-cloud/70 ring-1 ring-brand-ink"
                        : "border-brand-border bg-white hover:bg-brand-cloud/30"
                    }`}
                  >
                    <p className="text-xs font-bold text-brand-ink">{meta.label}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-brand-muted">
                      {meta.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedType === "leadership_charter" ? (
            <div className="rounded-xl border border-brand-border bg-brand-cloud/40 p-4">
              <p className="text-xs font-bold text-brand-ink">
                Select Core Leader Role (Auto-Fills Mandate &amp; Conflict Disclosure)
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {LEADER_OPTIONS.map((leader) => (
                  <button
                    key={leader.key}
                    type="button"
                    onClick={() => selectLeader(leader.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      leadershipRole === leader.key
                        ? "bg-brand-ink text-white"
                        : "bg-white text-brand-secondary ring-1 ring-brand-border hover:bg-brand-cloud"
                    }`}
                  >
                    {leader.key.toUpperCase().replace("_", "-")} · {leader.defaultName}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            <h2 className="text-base font-bold text-brand-ink">2. Recipient &amp; Counterparty Details</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                Recipient Full Name *
                <Input
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Full legal name"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                Recipient Email (Required for Sign-in Lock) *
                <Input
                  required
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="name@company.com"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                Role / Designation
                <Input
                  value={recipientRole}
                  onChange={(e) => setRecipientRole(e.target.value)}
                  placeholder="e.g. Founder / Director"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                Organization / Company Name
                <Input
                  value={recipientOrg}
                  onChange={(e) => setRecipientOrg(e.target.value)}
                  placeholder="Organization name"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                Effective Date *
                <Input
                  required
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                Term / Duration
                <Input
                  value={durationLabel}
                  onChange={(e) => setDurationLabel(e.target.value)}
                  placeholder="e.g. 12 Months"
                />
              </label>
            </div>
          </div>

          {/* Type-specific fields */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-brand-ink">3. Agreement-Specific Details</h2>

            {selectedType === "tech_partner" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                  Platform Domain
                  <Input
                    value={formData.platformDomain ?? "csc.logicintelligencetechnologies.in"}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, platformDomain: e.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                  Special Clauses (Optional)
                  <Input
                    value={formData.specialClauses ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, specialClauses: e.target.value }))
                    }
                    placeholder="Additional technical partner terms"
                  />
                </label>
              </div>
            ) : null}

            {selectedType === "leadership_charter" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                  Disclosed External Venture(s)
                  <Input
                    value={formData.externalVenture ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, externalVenture: e.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                  Additional Mandate Notes (Optional)
                  <Input
                    value={formData.mandateNotes ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, mandateNotes: e.target.value }))
                    }
                  />
                </label>
              </div>
            ) : null}

            {selectedType === "strategic_mou" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                  Partner Category
                  <Input
                    value={formData.orgType ?? "Ecosystem / Incubator / College Partner"}
                    onChange={(e) => setFormData((p) => ({ ...p, orgType: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                  Exclusivity
                  <Input
                    value={formData.exclusivity ?? "Non-Exclusive"}
                    onChange={(e) => setFormData((p) => ({ ...p, exclusivity: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink sm:col-span-2">
                  Collaboration Scope &amp; Deliverables
                  <Textarea
                    rows={3}
                    value={formData.collaborationScope ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, collaborationScope: e.target.value }))
                    }
                    placeholder="Describe joint meetups, referrals, or ecosystem benefits..."
                  />
                </label>
              </div>
            ) : null}

            {selectedType === "event_collaboration" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                  Event Name
                  <Input
                    value={formData.eventName ?? ""}
                    onChange={(e) => setFormData((p) => ({ ...p, eventName: e.target.value }))}
                    placeholder="e.g. CSC Founder Meetup Edition 3"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                  Event Date &amp; Venue
                  <Input
                    value={formData.eventVenue ?? ""}
                    onChange={(e) => setFormData((p) => ({ ...p, eventVenue: e.target.value }))}
                    placeholder="e.g. TICEL Bio Park, Coimbatore"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                  Partner Responsibilities
                  <Input
                    value={formData.partnerResponsibilities ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, partnerResponsibilities: e.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                  Financial / Ticketing Terms
                  <Input
                    value={formData.financialTerms ?? "Zero-cost / in-kind collaboration"}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, financialTerms: e.target.value }))
                    }
                  />
                </label>
              </div>
            ) : null}

            {selectedType === "sponsorship" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                  Sponsored Event / Program
                  <Input
                    value={formData.eventName ?? ""}
                    onChange={(e) => setFormData((p) => ({ ...p, eventName: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                  Sponsorship Tier &amp; Amount
                  <Input
                    value={formData.sponsorshipAmount ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, sponsorshipAmount: e.target.value }))
                    }
                    placeholder="e.g. Gold Sponsor — INR 25,000"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink sm:col-span-2">
                  Deliverables
                  <Textarea
                    rows={2}
                    value={formData.deliverables ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, deliverables: e.target.value }))
                    }
                  />
                </label>
              </div>
            ) : null}

            {selectedType === "speaker_mentor" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                  Session / Program Name
                  <Input
                    value={formData.sessionName ?? ""}
                    onChange={(e) => setFormData((p) => ({ ...p, sessionName: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                  Honorarium / Fee Terms
                  <Input
                    value={formData.honorarium ?? "Pro-Bono Community Contribution"}
                    onChange={(e) => setFormData((p) => ({ ...p, honorarium: e.target.value }))}
                  />
                </label>
              </div>
            ) : null}

            {selectedType === "custom" ? (
              <div className="grid gap-4">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                  Custom Agreement Title
                  <Input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. COMMUNITY INCUBATION AGREEMENT"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-brand-ink">
                  Custom Clauses (One paragraph per line)
                  <Textarea
                    rows={5}
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    placeholder="Enter custom clauses here..."
                  />
                </label>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-brand-border pt-4">
            <label className="flex items-center gap-2.5 text-xs text-brand-secondary">
              <Checkbox checked={sendEmail} onCheckedChange={(c) => setSendEmail(c === true)} />
              <span>Automatically email the signing link to the recipient</span>
            </label>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Create &amp; Generate Signing Link
            </Button>
          </div>
        </form>
      ) : null}

      {/* Agreements Table */}
      <div className="overflow-x-auto rounded-2xl border border-brand-border bg-white shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-brand-cloud text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            <tr>
              <th className="p-3.5">Reference</th>
              <th className="p-3.5">Agreement</th>
              <th className="p-3.5">Recipient</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {agreements.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-brand-muted">
                  No digital agreements created yet. Click &ldquo;New Digital Agreement&rdquo; to issue your first one.
                </td>
              </tr>
            ) : (
              agreements.map((agr) => (
                <tr key={agr.id} className="hover:bg-brand-cloud/30">
                  <td className="p-3.5 font-mono text-[11px] font-semibold text-brand-ink">
                    {agr.reference_code}
                  </td>
                  <td className="p-3.5">
                    <p className="font-semibold text-brand-ink">{agr.title}</p>
                    <p className="text-[11px] text-brand-muted">
                      {AGREEMENT_TYPE_META[agr.agreement_type]?.shortLabel ?? agr.agreement_type} ·{" "}
                      {agr.effective_date}
                    </p>
                  </td>
                  <td className="p-3.5">
                    <p className="font-medium text-brand-ink">{agr.recipient_name}</p>
                    <p className="text-[11px] text-brand-muted">{agr.recipient_email}</p>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        agr.status === "signed"
                          ? "bg-emerald-50 text-emerald-800"
                          : agr.status === "voided"
                            ? "bg-red-50 text-red-800"
                            : "bg-amber-50 text-amber-900"
                      }`}
                    >
                      {agr.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => copyLink(agr.id, agr.signing_token)}
                        className="h-8 gap-1 px-2.5 text-[11px]"
                      >
                        {copiedId === agr.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        Link
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        render={<a href={`/api/admin/agreements/${agr.id}/pdf`} target="_blank" rel="noreferrer" />}
                        className="h-8 gap-1 px-2.5 text-[11px]"
                      >
                        <Download className="size-3.5" />
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link href={`/admin/agreements/${agr.id}`} />}
                        className="h-8 gap-1 px-2.5 text-[11px]"
                      >
                        <ExternalLink className="size-3.5" />
                        Manage
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
