import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { FileText, Bell, Send, Sparkles, ArrowRight } from "lucide-react";
import { Container } from "@/components/common/container";
import { PageHero } from "@/components/common/page-hero";
import { CircularSocialIcon } from "@/components/common/brand-icons";
import { listPublishedUpdates, cmsImageUrl } from "@/lib/services/cms-public";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "CSC Community Updates & Announcements",
  description:
    "Community announcements, event highlights, startup milestones, collaborations, and official broadcasts from CSC Circle.",
  alternates: { canonical: "/updates" },
};

const publishedDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeZone: "Asia/Kolkata",
      }).format(new Date(value))
    : null;

async function UpdatesContent() {
  const updates = await listPublishedUpdates(30);

  if (updates === null) {
    return (
      <>
        <PageHero
          eyebrow="CSC Circle"
          title="Stories, Milestones and Moments"
          description="Explore approved announcements, event highlights, startup milestones, collaborations and community achievements."
        />
        <section className="py-12">
          <Container className="max-w-6xl">
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900"
            >
              Updates are temporarily unavailable. Please try again shortly.
            </div>
          </Container>
        </section>
      </>
    );
  }

  const featured = updates.find((update) => update.featured);

  return (
    <>
      <PageHero
        eyebrow="Community Highlights"
        title="Stories, Milestones & Broadcasts"
        description="Explore community announcements, startup milestones, event highlights, collaborations, and achievements shared across the Coimbatore Startup Community."
      />

      <section className="py-12 sm:py-16">
        <Container className="max-w-6xl flex flex-col gap-10">
          {/* Real-time Broadcast Channels Banner — Circular Icons for WhatsApp, LinkedIn, Instagram */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href={siteConfig.social.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6 transition hover:bg-emerald-50 hover:shadow-xs"
            >
              <div className="flex items-start gap-4">
                <CircularSocialIcon network="whatsapp" size={48} className="group-hover:scale-105" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-brand-ink">WhatsApp Broadcast</h3>
                    <ArrowRight className="size-4 text-emerald-700 transition-transform group-hover:translate-x-1" />
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-brand-secondary">
                    Official announcements, instant pass access, and real-time community links.
                  </p>
                </div>
              </div>
            </a>

            <a
              href={siteConfig.social.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between rounded-3xl border border-sky-200 bg-sky-50/50 p-6 transition hover:bg-sky-50 hover:shadow-xs"
            >
              <div className="flex items-start gap-4">
                <CircularSocialIcon network="linkedin" size={48} className="group-hover:scale-105" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-brand-ink">LinkedIn Official Profile</h3>
                    <ArrowRight className="size-4 text-sky-700 transition-transform group-hover:translate-x-1" />
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-brand-secondary">
                    Connect with regional founders, ecosystem partners &amp; leadership.
                  </p>
                </div>
              </div>
            </a>

            <a
              href={siteConfig.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between rounded-3xl border border-pink-200 bg-pink-50/50 p-6 transition hover:bg-pink-50 hover:shadow-xs sm:col-span-2 lg:col-span-1"
            >
              <div className="flex items-start gap-4">
                <CircularSocialIcon network="instagram" size={48} className="group-hover:scale-105" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-brand-ink">Instagram Highlights</h3>
                    <ArrowRight className="size-4 text-pink-700 transition-transform group-hover:translate-x-1" />
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-brand-secondary">
                    Follow @coimbatorestartupcommunity for event reels &amp; photo carousels.
                  </p>
                </div>
              </div>
            </a>
          </div>

          {/* Published updates or placeholder */}
          {updates.length === 0 ? (
            <div className="rounded-3xl border border-brand-border bg-white p-8 text-center shadow-xs sm:p-12">
              <FileText className="mx-auto size-10 text-brand-accent" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-bold text-brand-ink">No updates have been published yet</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-brand-secondary">
                When CSC Circle shares an approved announcement or community story, it will appear here. In the meantime, connect with our official WhatsApp community above.
              </p>
            </div>
          ) : (
            <>
              {featured ? (
                <Link
                  href={`/updates/${featured.slug}`}
                  className="group grid overflow-hidden rounded-3xl border border-brand-border bg-white shadow-xs transition-shadow hover:shadow-md md:grid-cols-2"
                >
                  <div className="relative aspect-[5/3] bg-brand-cloud md:aspect-auto md:min-h-72">
                    {featured.coverImagePath ? (
                      <Image
                        src={cmsImageUrl(featured.coverImagePath)!}
                        alt={featured.coverImageAlt || ""}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="grid size-full min-h-56 place-items-center text-brand-muted">
                        <FileText className="size-12" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center p-6 sm:p-9">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
                      Featured · {featured.category}
                    </p>
                    <h2 className="mt-3 text-2xl font-bold text-brand-ink group-hover:text-brand-accent sm:text-3xl">
                      {featured.title}
                    </h2>
                    <p className="mt-3 line-clamp-4 text-sm leading-6 text-brand-secondary">
                      {featured.summary}
                    </p>
                    <span className="mt-5 text-xs text-brand-muted">
                      {publishedDate(featured.publishedAt)}
                    </span>
                    <span className="mt-4 font-semibold text-brand-accent">Read story &rarr;</span>
                  </div>
                </Link>
              ) : null}

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {updates
                  .filter((update) => update.id !== featured?.id)
                  .map((update) => {
                    const image = cmsImageUrl(update.coverImagePath);
                    return (
                      <Link
                        key={update.id}
                        href={`/updates/${update.slug}`}
                        className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-brand-border bg-white transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
                      >
                        <div className="relative aspect-[5/3] bg-brand-cloud">
                          {image ? (
                            <Image
                              src={image}
                              alt={update.coverImageAlt || ""}
                              fill
                              unoptimized
                              sizes="(max-width: 768px) 100vw, 360px"
                              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                          ) : (
                            <div className="grid size-full place-items-center text-brand-muted">
                              <FileText className="size-9" aria-hidden="true" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-5">
                          <p className="text-xs font-semibold text-brand-accent">{update.category}</p>
                          <h2 className="mt-2 break-words text-lg font-bold text-brand-ink">
                            {update.title}
                          </h2>
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-brand-secondary">
                            {update.summary}
                          </p>
                          <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-xs text-brand-muted">
                            <span>{publishedDate(update.publishedAt)}</span>
                            <span className="font-semibold text-brand-accent">Read more &rarr;</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </>
          )}

          {/* Member News Submission Callout */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl bg-brand-cloud p-6 sm:p-8">
            <div>
              <h3 className="text-sm font-bold text-brand-ink">Have a Milestone, Launch or Funding to Share?</h3>
              <p className="text-xs text-brand-secondary">
                CSC members can submit their company achievements for spotlight coverage across our channels.
              </p>
            </div>
            <a
              href="mailto:coimbatorestartup.csc@gmail.com?subject=Community%20Spotlight%20Submission"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-ink px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-ink/90"
            >
              <Send className="size-3.5" /> Submit Story
            </a>
          </div>
        </Container>
      </section>
    </>
  );
}

export default function UpdatesPage() {
  return (
    <Suspense
      fallback={
        <section aria-busy="true" className="py-16">
          <Container className="max-w-6xl">
            <p className="text-sm text-brand-muted">Loading community updates…</p>
          </Container>
        </section>
      }
    >
      <UpdatesContent />
    </Suspense>
  );
}
