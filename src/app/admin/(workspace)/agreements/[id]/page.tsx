import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminPagePermission } from "@/lib/admin/gate";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { agreementsTable, type DigitalAgreementRow } from "@/lib/agreements/db";
import { AdminAgreementActions } from "@/components/admin/agreements/admin-agreement-actions";
import { siteConfig } from "@/lib/content/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const instant = false;
export const metadata = { title: "Agreement Details — Admin" };

export default async function AdminAgreementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPagePermission("settings.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data } = await agreementsTable().select("*").eq("id", id).maybeSingle();
  const agreement = data as DigitalAgreementRow | null;
  if (!agreement) notFound();

  const signingUrl = `${siteConfig.url}/agreements/sign/${agreement.signing_token}`;

  return (
    <div className="space-y-6">
      <Button variant="outline" render={<Link href="/admin/agreements" />} className="gap-2">
        <ArrowLeft className="size-4" /> Back to Digital Agreements
      </Button>

      <AdminPageHeader
        title={`${agreement.reference_code} — ${agreement.title}`}
        description={`Recipient: ${agreement.recipient_name} (${agreement.recipient_email}) · Status: ${agreement.status.toUpperCase()}`}
      />

      <AdminAgreementActions
        id={agreement.id}
        signingUrl={signingUrl}
        status={agreement.status}
      />

      <div className="grid gap-4 rounded-2xl border border-brand-border bg-white p-5 text-xs sm:grid-cols-2">
        <div>
          <p className="font-semibold text-brand-ink">Signing Link</p>
          <p className="mt-1 break-all font-mono text-[11px] text-brand-muted">{signingUrl}</p>
        </div>
        <div>
          <p className="font-semibold text-brand-ink">Execution &amp; Audit</p>
          {agreement.status === "signed" ? (
            <div className="mt-1 space-y-0.5 text-brand-secondary">
              <p>Signed by: {agreement.signed_name} ({agreement.signed_email})</p>
              <p>Signed at: {agreement.signed_at}</p>
              <p>IP: {agreement.signed_ip}</p>
              <p className="break-all font-mono text-[10px]">Hash: {agreement.document_hash}</p>
            </div>
          ) : (
            <p className="mt-1 text-brand-muted">Awaiting recipient email login &amp; signature.</p>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-xs">
        <div className="border-b border-brand-border bg-brand-cloud/60 px-4 py-2.5 text-xs font-semibold text-brand-ink">
          Live Editorial PDF Preview
        </div>
        <iframe
          src={`/api/admin/agreements/${agreement.id}/pdf`}
          title={`PDF preview for ${agreement.reference_code}`}
          className="h-[760px] w-full bg-white"
        />
      </div>
    </div>
  );
}
