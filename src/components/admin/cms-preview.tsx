import Image from "next/image";
import Link from "next/link";
import type { CommunityUpdateRecord, OpportunityRecord, ResourceRecord } from "@/types/cms";

export function CommunityUpdateAdminPreview({ update }: { update: CommunityUpdateRecord }) {
  return <article className="mx-auto flex max-w-3xl flex-col gap-5 rounded-2xl border border-brand-border bg-white p-5 sm:p-8">
    <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-brand-purple/20 px-3 py-1 text-xs font-semibold text-brand-ink">{update.status}</span><span className="text-sm text-brand-muted">{update.category}{update.featured ? " · Featured" : ""}</span></div>
    <h1 className="break-words text-3xl font-bold text-brand-ink">{update.title}</h1>
    <p className="text-lg leading-relaxed text-brand-secondary">{update.summary}</p>
    {update.coverImagePath ? <div className="relative aspect-[5/3] overflow-hidden rounded-xl bg-brand-cloud"><Image src={`/api/admin/cms/media?path=${encodeURIComponent(update.coverImagePath)}`} alt="Update cover preview" fill unoptimized className="object-cover" /></div> : null}
    <div className="whitespace-pre-line break-words text-sm leading-7 text-brand-secondary">{update.body}</div>
    {update.gallery.map((image) => <figure key={image.path}><div className="relative aspect-[5/3] overflow-hidden rounded-xl bg-brand-cloud"><Image src={`/api/admin/cms/media?path=${encodeURIComponent(image.path)}`} alt={image.alt} fill unoptimized className="object-cover" /></div>{image.caption ? <figcaption className="mt-2 text-xs text-brand-muted">{image.caption}</figcaption> : null}</figure>)}
    {update.author || update.source ? <p className="text-sm text-brand-muted">{[update.author, update.source].filter(Boolean).join(" · ")}</p> : null}
    <Link href={`/admin/updates/${update.id}/edit`} className="w-fit text-sm font-semibold text-brand-accent underline underline-offset-4">Return to editor</Link>
  </article>;
}

export function ResourceAdminPreview({ resource }: { resource: ResourceRecord }) {
  const image = resource.coverImagePath ? `/api/admin/cms/media?path=${encodeURIComponent(resource.coverImagePath)}` : null;
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-5 rounded-2xl border border-brand-border bg-white p-5 sm:p-8">
      <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-brand-purple/20 px-3 py-1 text-xs font-semibold text-brand-ink">{resource.status}</span><span className="text-sm text-brand-muted">{resource.category} · {resource.resourceType}</span></div>
      <h1 className="text-3xl font-bold text-brand-ink">{resource.title}</h1>
      {resource.summary ? <p className="text-lg leading-relaxed text-brand-secondary">{resource.summary}</p> : null}
      {image ? <div className="relative aspect-[5/3] overflow-hidden rounded-xl bg-brand-cloud"><Image src={image} alt={resource.title} fill unoptimized className="object-cover" /></div> : null}
      {resource.description ? <p className="whitespace-pre-line text-sm leading-7 text-brand-secondary">{resource.description}</p> : null}
      {resource.documentPath ? <a className="w-fit rounded-xl border border-brand-border px-4 py-2 text-sm font-semibold text-brand-ink" href={`/api/admin/resources/${resource.id}/download`}>Preview PDF · {resource.documentFilename || "PDF document"}</a> : null}
      {(resource.sourceOrganization || resource.author || resource.attribution || resource.license) ? <p className="text-sm text-brand-muted">{[resource.sourceOrganization, resource.author, resource.attribution, resource.license].filter(Boolean).join(" · ")}</p> : null}
      {resource.externalUrl ? <p className="break-all text-xs text-brand-muted">Reference: {resource.externalUrl}</p> : null}
      <Link href={`/admin/resources/${resource.id}`} className="w-fit text-sm font-semibold text-brand-accent underline underline-offset-4">Return to editor</Link>
    </article>
  );
}

export function OpportunityAdminPreview({ opportunity }: { opportunity: OpportunityRecord }) {
  const imagePath = opportunity.bannerPath || opportunity.orgLogoPath;
  const image = imagePath ? `/api/admin/cms/media?path=${encodeURIComponent(imagePath)}` : null;
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-5 rounded-2xl border border-brand-border bg-white p-5 sm:p-8">
      <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-brand-purple/20 px-3 py-1 text-xs font-semibold text-brand-ink">{opportunity.status}</span><span className="text-sm text-brand-muted">{opportunity.category}</span></div>
      <h1 className="text-3xl font-bold text-brand-ink">{opportunity.title}</h1>
      {opportunity.organization ? <p className="text-base font-semibold text-brand-secondary">{opportunity.organization}</p> : null}
      {opportunity.summary ? <p className="text-lg leading-relaxed text-brand-secondary">{opportunity.summary}</p> : null}
      {image ? <div className="relative aspect-[5/3] overflow-hidden rounded-xl bg-brand-cloud"><Image src={image} alt={`${opportunity.organization || opportunity.title} preview`} fill unoptimized className="object-cover" /></div> : null}
      {opportunity.description ? <p className="whitespace-pre-line text-sm leading-7 text-brand-secondary">{opportunity.description}</p> : null}
      <dl className="grid gap-3 rounded-xl bg-brand-cloud p-4 text-sm sm:grid-cols-2">{[["Audience", opportunity.audience], ["Eligibility", opportunity.eligibility], ["Location", opportunity.location], ["Participation", opportunity.participationMode], ["Starts", opportunity.startsOn], ["Deadline", opportunity.deadline], ["Ends", opportunity.endsOn]].filter((row) => row[1]).map(([label, value]) => <div key={label}><dt className="font-semibold text-brand-ink">{label}</dt><dd className="text-brand-secondary">{value}</dd></div>)}</dl>
      {[opportunity.applicationInstructions, opportunity.contact, opportunity.source].filter(Boolean).map((value, index) => <p key={index} className="break-words text-sm leading-6 text-brand-secondary">{value}</p>)}
      {opportunity.applicationUrl ? <p className="break-all text-xs text-brand-muted">Application link: {opportunity.applicationUrl}</p> : null}
      <Link href={`/admin/opportunities/${opportunity.id}`} className="w-fit text-sm font-semibold text-brand-accent underline underline-offset-4">Return to editor</Link>
    </article>
  );
}
