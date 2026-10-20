import { notFound } from "next/navigation";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { MemberUnavailable } from "@/components/member/member-unavailable";
import { MemberStartupForm } from "@/components/member/member-startup-form";
import { getMemberContext } from "@/lib/services/member/context";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MemberStartupInput } from "@/lib/validations/member-startup";
export const metadata = { title: "Edit Startup" };
export default async function EditStartupPage({ params }: { params: Promise<{ startupId: string }> }) {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return <MemberUnavailable />;
  const { startupId } = await params;
  const admin = createAdminClient();
  const { data: row } = await admin.from("directory_startups").select("*").eq("id", startupId).eq("user_id", ctx.user!.id).maybeSingle();
  if (!row || !["draft", "pending"].includes(row.status)) notFound();
  const { data: privateRecord } = await admin.from("directory_startup_private_details").select("details").eq("startup_id", row.id).eq("user_id", ctx.user!.id).maybeSingle();
  const details = (row.details ?? {}) as Record<string, unknown>;
  const privateValues = (privateRecord?.details ?? {}) as Record<string, unknown>;
  const visibility = (details.visibility ?? {}) as Record<string, boolean>;
  const [directoryPreview, logoPreview] = await Promise.all([
    row.directory_image_path ? admin.storage.from("member-portraits").createSignedUrl(row.directory_image_path, 1800) : Promise.resolve({ data: null }),
    row.logo_url && !/^https?:\/\//i.test(row.logo_url) ? admin.storage.from("member-portraits").createSignedUrl(row.logo_url, 1800) : Promise.resolve({ data: { signedUrl: row.logo_url ?? "" } }),
  ]);
  const merged: Record<string, unknown> = { ...details, ...privateValues, id: row.id, existingId: row.id, name: row.name, slug: row.slug, industry: row.industry, description: row.description, website: privateValues.website ?? row.website ?? "", logoPath: row.logo_url ?? "", directoryImagePath: row.directory_image_path ?? "", consent: true, ...visibility };
  return <div className="mx-auto flex w-full flex-col gap-6"><MemberPageHeader title="Edit startup" description="Saving changes returns this startup to CSC administrator review." /><MemberStartupForm key={row.id} startupId={row.id} initialPreviews={{ directory: directoryPreview.data?.signedUrl ?? "", logo: logoPreview.data?.signedUrl ?? "" }} initial={merged as Partial<MemberStartupInput>} /></div>;
}
