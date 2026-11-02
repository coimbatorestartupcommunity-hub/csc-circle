import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FlaskConical } from "lucide-react";
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
  // Paid UPI events support verified guest OTP registration as well as authenticated members.
  // Free RSVP events require a signed-in account.
  const canRegister = Boolean(user) || event.registrationMode === "paid_upi";
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
    <div className="mx-auto w-full max-w-3xl"><EventDetailsPanel event={event} events={[event]} canRegister={canRegister} loginHref={`/login?next=${encodeURIComponent(`/events/${event.slug}`)}`} /></div>
  </Container></section>;
}
