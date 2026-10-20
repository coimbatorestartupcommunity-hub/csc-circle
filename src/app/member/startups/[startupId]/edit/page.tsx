import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { MemberUnavailable } from "@/components/member/member-unavailable";
import { MemberStartupForm } from "@/components/member/member-startup-form";
import { getMemberContext } from "@/lib/services/member/context";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MemberStartupInput } from "@/lib/validations/member-startup";

export const metadata = { title: "Edit Startup" };
export const instant = false;

type JsonObject = Record<string, unknown>;
function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

export default async function EditStartupPage({ params }: { params: Promise<{ startupId: string }> }) {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return <MemberUnavailable />;
  const { startupId } = await params;
  const admin = createAdminClient();
  const { data: row } = await admin.from("directory_startups").select("*").eq("id", startupId).eq("user_id", ctx.user!.id).maybeSingle();
  if (!row || !["draft", "pending", "published"].includes(row.status)) notFound();

  const [{ data: privateRecord }, { data: revision }] = await Promise.all([
    admin.from("directory_startup_private_details").select("details").eq("startup_id", row.id).eq("user_id", ctx.user!.id).maybeSingle(),
    row.status === "published"
      ? admin.from("directory_startup_revisions").select("id,status,proposed_data,proposed_private_details,review_reason").eq("startup_id", row.id).in("status", ["draft", "pending", "rejected"]).order("updated_at", { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const isPublished = row.status === "published";
  const pendingRevision = revision?.status === "pending";
  const currentDetails = object(row.details);
  const currentPrivate = object(privateRecord?.details);
  const hasEditableRevision = revision?.status === "draft" || revision?.status === "rejected";
  const proposed = hasEditableRevision ? object(revision.proposed_data) : {};
  const details = hasEditableRevision ? object(proposed.details) : currentDetails;
  const privateValues = hasEditableRevision ? object(revision.proposed_private_details) : currentPrivate;
  const visibility = object(details.visibility);
  const revisionImage = typeof proposed.directory_image_path === "string" ? proposed.directory_image_path : null;
  const revisionLogo = typeof proposed.logo_url === "string" ? proposed.logo_url : null;
  const directoryPath = revisionImage ?? row.directory_image_path;
  const logoPath = revisionLogo ?? row.logo_url;

  const [directoryPreview, logoPreview] = await Promise.all([
    directoryPath ? admin.storage.from("member-portraits").createSignedUrl(directoryPath, 1800) : Promise.resolve({ data: null }),
    logoPath && !/^https?:\/\//i.test(logoPath) ? admin.storage.from("member-portraits").createSignedUrl(logoPath, 1800) : Promise.resolve({ data: { signedUrl: logoPath ?? "" } }),
  ]);

  const merged: JsonObject = {
    ...details,
    ...privateValues,
    id: row.id,
    existingId: row.id,
    name: proposed.name ?? row.name,
    slug: proposed.slug ?? row.slug,
    industry: proposed.industry ?? row.industry,
    description: proposed.description ?? row.description,
    website: privateValues.website ?? proposed.website ?? row.website ?? "",
    logoPath: logoPath ?? "",
    directoryImagePath: directoryPath ?? "",
    consent: true,
    publishWebsite: visibility.publishWebsite ?? Boolean(proposed.website ?? row.website),
    publishBusinessEmail: visibility.publishBusinessEmail ?? false,
    publishCompanyPhone: visibility.publishCompanyPhone ?? false,
    publishFounderContact: visibility.publishFounderContact ?? false,
  };

  return <div className="mx-auto flex w-full flex-col gap-6">
    <MemberPageHeader title={isPublished ? "Edit published startup" : "Edit startup"} description={isPublished ? "Propose updates for CSC administrator approval. Your current published listing stays unchanged until approval." : "Saving changes returns this startup to CSC administrator review."} />
    <MemberStartupForm
      key={`${row.id}:${revision?.id ?? "new"}`}
      startupId={row.id}
      revisionId={revision?.status === "draft" || revision?.status === "rejected" ? revision.id : (isPublished ? randomUUID() : undefined)}
      isPublished={isPublished}
      pendingRevision={pendingRevision}
      revisionFeedback={revision?.status === "rejected" ? revision.review_reason ?? "Please review the administrator notes and resubmit your updates." : undefined}
      initialPreviews={{ directory: directoryPreview.data?.signedUrl ?? "", logo: logoPreview.data?.signedUrl ?? "" }}
      initial={merged as Partial<MemberStartupInput>}
    />
  </div>;
}
