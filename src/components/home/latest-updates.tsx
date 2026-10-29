import Image from "next/image";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Container } from "@/components/common/container";
import { listPublishedUpdates, cmsImageUrl } from "@/lib/services/cms-public";

export async function LatestUpdates() {
  const updates = await listPublishedUpdates(3);
  if (!updates?.length) return null;
  return <section className="py-14 sm:py-20"><Container className="max-w-6xl">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">From the community</p><h2 className="mt-2 text-2xl font-bold text-brand-ink sm:text-3xl">Latest from CSC Circle</h2></div><Link href="/updates" className="text-sm font-semibold text-brand-accent underline underline-offset-4">All updates</Link></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{updates.map((update) => {
      const image = cmsImageUrl(update.coverImagePath);
      return <Link key={update.id} href={`/updates/${update.slug}`} className="group min-w-0 overflow-hidden rounded-2xl border border-brand-border bg-white transition-shadow hover:shadow-md">
        <div className="relative aspect-[5/3] bg-brand-cloud">{image ? <Image src={image} alt="" fill unoptimized sizes="(max-width: 768px) 100vw, 360px" className="object-cover" /> : <div className="grid size-full place-items-center text-brand-muted"><FileText className="size-8" aria-hidden="true" /></div>}</div>
        <div className="p-4"><p className="text-xs font-semibold text-brand-accent">{update.category}</p><h3 className="mt-2 break-words font-bold text-brand-ink group-hover:text-brand-accent">{update.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-brand-secondary">{update.summary}</p></div>
      </Link>;
    })}</div>
  </Container></section>;
}
