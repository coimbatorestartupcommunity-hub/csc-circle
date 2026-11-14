import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/common/container";
import { QrCheckInClient } from "@/components/events/qr-check-in-client";

export const instant = false;

export const metadata = {
  title: "CSC Circle — Event Check-in",
  description:
    "Upload your individual event QR code to verify your registration and access the Google Meet session.",
  robots: {
    index: true,
    follow: true,
  },
};

export default async function GoogleMeetCheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; test?: string }>;
}) {
  const { token, test } = await searchParams;
  const eventStartsAt = "2026-11-22T04:30:00+00:00";
  const startsAtMs = new Date(eventStartsAt).getTime();
  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  const isEarlyLocked = test !== "1" && Date.now() < startsAtMs - THREE_HOURS_MS;

  return (
    <section className="py-10 sm:py-14">
      <Container className="max-w-xl">
        <div className="mb-4">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="size-4" /> Back to Events
          </Link>
        </div>

        <QrCheckInClient
          initialToken={token}
          isEarlyLocked={isEarlyLocked}
          eventTitle="Coimbatore Startup Community (CSC) - Joint Online Meeting"
          startsAt={eventStartsAt}
        />
      </Container>
    </section>
  );
}
