import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgreementSection, AgreementType, LeadershipRoleKey } from "@/lib/agreements/templates";

export interface DigitalAgreementRow {
  id: string;
  reference_code: string;
  agreement_type: AgreementType;
  title: string;
  subtitle: string;
  eyebrow: string;
  recipient_name: string;
  recipient_email: string;
  recipient_role: string;
  recipient_org: string;
  recipient_whatsapp: string;
  leadership_role: LeadershipRoleKey | null;
  effective_date: string;
  duration_label: string;
  form_data: Record<string, string>;
  sections: AgreementSection[];
  csc_signatory_name: string;
  csc_signatory_role: string;
  signing_token: string;
  status: "draft" | "sent" | "signed" | "voided" | "expired";
  expires_at: string | null;
  partner_logo_path: string | null;
  signed_name: string | null;
  signed_email: string | null;
  signed_role: string | null;
  signed_org: string | null;
  signed_at: string | null;
  signed_ip: string | null;
  signed_user_agent: string | null;
  signed_user_id: string | null;
  document_hash: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function agreementsTable() {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (admin as unknown as { from: (table: string) => any }).from("digital_agreements");
}

export async function downloadPartnerLogo(path: string | null | undefined): Promise<Buffer | null> {
  if (!path) return null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from("agreement-assets").download(path);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  } catch {
    return null;
  }
}
