import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FlaskConical, Megaphone } from "lucide-react";
import { Container } from "@/components/common/container";
import { EventDetailsPanel } from "@/components/events/event-details-panel";
import { getPublicEventBySlug } from "@/lib/services/public-data";
import { getAuthUser } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/content/site";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  const description = event?.summary || event?.description.slice(0, 160);
  // Social crawlers (WhatsApp, Facebook, X, LinkedIn) don't reliably render
  // WebP link previews, so serve a JPG sibling for static covers while the page
  // itself keeps the WebP. Absolute URLs are required for og:image.
  const ogImageUrl = event?.coverImage
    ? event.coverImage.startsWith("http")
      ? event.coverImage
      : `${siteConfig.url}${event.coverImage.replace(/\.webp$/i, ".jpg")}`
    : undefined;
  const images = ogImageUrl ? [{ url: ogImageUrl, width: 1200, height: 675, alt: event?.title ?? "Event" }] : undefined;
  return event ? { title: `${event.title} · Events & Booking`, description, alternates: { canonical: `/events/${event.slug}` }, openGraph: { title: event.title, description, url: `${siteConfig.url}/events/${event.slug}`, type: "website", images }, twitter: { card: "summary_large_image", title: event.title, description, images: images?.map((image) => image.url) } } : { title: "Event not found" };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [event, user] = await Promise.all([getPublicEventBySlug(slug), getAuthUser()]);
  if (!event) notFound();
  // Public community events support verified guest registration as well as authenticated members.
  const canRegister = true;
  return <section className="py-10 sm:py-14"><Container className="flex flex-col gap-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/events" className="inline-flex min-h-10 w-fit items-center gap-2 rounded-lg text-sm font-medium text-brand-secondary hover:text-brand-ink"><ArrowLeft className="size-4" />Back to Events &amp; Booking</Link>
      {event.isTestEvent ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
          <FlaskConical className="size-3.5 text-amber-700" /> Authorized QA Test Event
        </span>
      ) : null}
    </div>
    {event.isTestEvent ? (
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-amber-300 bg-amber-50/70 p-4 text-sm text-amber-900 shadow-2xs">
        <div className="flex items-center gap-2 font-semibold text-amber-950">
          <FlaskConical className="size-4 text-amber-800" /> Internal QA Payment System Test · Unlisted Direct Test Mode
        </div>
        <p className="mt-1 text-xs leading-relaxed text-amber-800">
          This test event validates end-to-end UPI checkout, dynamic QR generation, bank reconciliation, and admission pass delivery. Test payments are set to ₹1.00.
        </p>
      </div>
    ) : null}
    {event.slug === "csc-joint-online-meeting" ? (
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-sky-50/80 to-purple-50/90 p-4 text-sm text-indigo-950 shadow-xs sm:p-5">
        <div className="flex items-center gap-2 font-bold text-indigo-900">
          <Megaphone className="size-4 shrink-0 text-brand-accent" />
          <span>Official Event Notice · Live Community Announcement</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-indigo-900 sm:text-sm">
          <strong>Confirmed Schedule:</strong> Coimbatore Startup Community (CSC) First Joint Online Meeting is scheduled for <strong>Sunday, November 22, 2026, from 3:00 PM to 5:00 PM IST</strong> via <strong>Google Meet</strong>.
          This inaugural session features <strong>open attendee introductions, startup pitches, and direct founder networking</strong>. Google Meet check-in unlocks <strong>one hour before the meeting starts</strong> (at 2:00 PM IST). Free admission registration is open below.
        </p>
      </div>
    ) : null}
    <div className="mx-auto w-full max-w-3xl"><EventDetailsPanel event={event} events={[event]} canRegister={canRegister} loginHref={`/login?next=${encodeURIComponent(`/events/${event.slug}`)}`} /></div>
  </Container></section>;
}
