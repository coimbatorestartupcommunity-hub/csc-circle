import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/common/container";
import { EventDetailsPanel } from "@/components/events/event-details-panel";
import { getPublicEvents } from "@/lib/services/public-data";
import { siteConfig } from "@/lib/content/site";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = (await getPublicEvents()).find((item) => item.slug === slug);
  const description = event?.summary || event?.description.slice(0, 160);
  const images = event?.coverImage ? [{ url: event.coverImage.startsWith("http") ? event.coverImage : `${siteConfig.url}${event.coverImage}`, alt: event.title }] : undefined;
  return event ? { title: `${event.title} · Events & Booking`, description, alternates: { canonical: `/events/${event.slug}` }, openGraph: { title: event.title, description, url: `${siteConfig.url}/events/${event.slug}`, type: "website", images }, twitter: { card: "summary_large_image", title: event.title, description, images: images?.map((image) => image.url) } } : { title: "Event not found" };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const events = await getPublicEvents();
  const event = events.find((item) => item.slug === slug);
  if (!event) notFound();
  return <section className="py-10 sm:py-14"><Container className="flex flex-col gap-6">
    <Link href="/events" className="inline-flex min-h-10 w-fit items-center gap-2 rounded-lg text-sm font-medium text-brand-secondary hover:text-brand-ink"><ArrowLeft className="size-4" />Back to Events &amp; Booking</Link>
    <div className="mx-auto w-full max-w-3xl"><EventDetailsPanel event={event} events={[event]} /></div>
  </Container></section>;
}
