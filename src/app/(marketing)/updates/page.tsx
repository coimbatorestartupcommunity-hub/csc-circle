import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { FileText } from "lucide-react";
import { Container } from "@/components/common/container";
import { PageHero } from "@/components/common/page-hero";
import { listPublishedUpdates, cmsImageUrl } from "@/lib/services/cms-public";

export const metadata: Metadata = {
  title: "CSC Community Updates & Highlights",
  description: "Community announcements, event highlights, startup milestones and stories from CSC Circle.",
  alternates: { canonical: "/updates" },
};

const publishedDate = (value: string | null) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(value)) : null;

async function UpdatesContent() {
  const updates = await listPublishedUpdates(30);
  if (updates === null) {
    return <><PageHero eyebrow="CSC Circle" title="Stories, Milestones and Moments from CSC Circle" description="Explore approved announcements, event highlights, startup milestones, collaborations and community achievements." /><section className="py-12"><Container className="max-w-6xl"><div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">Updates are temporarily unavailable. Please try again shortly.</div></Container></section></>;
  }
  const featured = updates.find((update) => update.featured);
  return (
    <>
      <PageHero eyebrow="CSC Circle" title="Stories, Milestones and Moments from CSC Circle" description="Explore community announcements, startup milestones, event highlights, collaborations, and achievements shared by the Coimbatore Startup Community." />
      <section className="py-12 sm:py-16">
        <Container className="max-w-6xl">
          {updates.length === 0 ? (
            <div className="rounded-3xl border border-brand-border bg-white p-8 text-center shadow-sm sm:p-12">
              <FileText className="mx-auto size-10 text-brand-accent" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-bold text-brand-ink">No updates have been published yet</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-brand-secondary">When CSC Circle shares an approved announcement or community story, it will appear here.</p>
            </div>
          ) : (
            <>
              {featured ? (
                <Link href={`/updates/${featured.slug}`} className="group mb-8 grid overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm transition-shadow hover:shadow-lg md:grid-cols-2">
                  <div className="relative aspect-[5/3] bg-brand-cloud md:aspect-auto md:min-h-72">
                    {featured.coverImagePath ? <Image src={cmsImageUrl(featured.coverImagePath)!} alt={featured.coverImageAlt || ""} fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" /> : <div className="grid size-full min-h-56 place-items-center text-brand-muted"><FileText className="size-12" aria-hidden="true" /></div>}
                  </div>
                  <div className="flex flex-col justify-center p-6 sm:p-9">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">Featured · {featured.category}</p>
                    <h2 className="mt-3 text-2xl font-bold text-brand-ink group-hover:text-brand-accent sm:text-3xl">{featured.title}</h2>
                    <p className="mt-3 line-clamp-4 text-sm leading-6 text-brand-secondary">{featured.summary}</p>
                    <span className="mt-5 text-xs text-brand-muted">{publishedDate(featured.publishedAt)}</span>
                    <span className="mt-4 font-semibold text-brand-accent">Read story →</span>
                  </div>
                </Link>
              ) : null}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {updates.filter((update) => update.id !== featured?.id).map((update) => {
                  const image = cmsImageUrl(update.coverImagePath);
                  return <Link key={update.id} href={`/updates/${update.slug}`} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-brand-border bg-white transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink">
                    <div className="relative aspect-[5/3] bg-brand-cloud">{image ? <Image src={image} alt={update.coverImageAlt || ""} fill unoptimized sizes="(max-width: 768px) 100vw, 360px" className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" /> : <div className="grid size-full place-items-center text-brand-muted"><FileText className="size-9" aria-hidden="true" /></div>}</div>
                    <div className="flex flex-1 flex-col p-5"><p className="text-xs font-semibold text-brand-accent">{update.category}</p><h2 className="mt-2 break-words text-lg font-bold text-brand-ink">{update.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-brand-secondary">{update.summary}</p><div className="mt-auto flex items-center justify-between gap-3 pt-5 text-xs text-brand-muted"><span>{publishedDate(update.publishedAt)}</span><span className="font-semibold text-brand-accent">Read more →</span></div></div>
                  </Link>;
                })}
              </div>
            </>
          )}
        </Container>
      </section>
    </>
  );
}

export default function UpdatesPage() {
  return <Suspense fallback={<section aria-busy="true" className="py-16"><Container className="max-w-6xl"><p className="text-sm text-brand-muted">Loading community updates…</p></Container></section>}><UpdatesContent /></Suspense>;
}
