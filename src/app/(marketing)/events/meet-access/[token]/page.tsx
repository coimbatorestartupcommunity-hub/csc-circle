import { notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import {
  ShieldCheck,
  Video,
  Calendar,
  Clock,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { Container } from "@/components/common/container";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEventPassQrPayload } from "@/lib/member/qr";
import {
  CSC_OFFICIAL_MEET_URL,
  CSC_OFFICIAL_CALENDAR_URL,
} from "@/lib/events/google-meet";

export const instant = false;

export const metadata = {
  title: "Secure Google Meet Access · CSC Circle",
  description: "Attendee-authenticated Google Meet conference access and verified admission pass.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MeetAccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!token || typeof token !== "string" || token.length < 16) {
    notFound();
  }

  const admin = createAdminClient();

  // 1. Validate pass token against confirmed event registrations
  const { data: registration, error: regError } = await admin
    .from("event_registrations")
    .select(
      `
      id,
      event_id,
      reference,
      attendee_name,
      status,
      payment,
      source_email,
      created_at,
      event:events(
        id,
        title,
        starts_at,
        ends_at,
        admission,
        settings,
        maps_url,
        status,
        format,
        venue,
        location
      )
    `
    )
    .eq("pass_token", token)
    .maybeSingle();

  if (regError || !registration) {
    return (
      <section className="py-12 sm:py-16">
        <Container className="max-w-xl">
          <div className="rounded-3xl border border-red-200 bg-red-50/60 p-8 text-center shadow-xs">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <AlertCircle className="size-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Invalid or Expired Pass</h1>
            <p className="mt-2 text-sm text-slate-600">
              We could not find an active event registration associated with this access token. Please check the link in
              your confirmation email or contact support.
            </p>
            <div className="mt-6">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <ArrowLeft className="size-4" /> Browse Events
              </Link>
            </div>
          </div>
        </Container>
      </section>
    );
  }

  const rawEvent = registration.event as unknown as {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string | null;
    admission?: string;
    settings?: Record<string, unknown> | null;
    maps_url?: string | null;
    status: string;
    format: string;
    venue: string | null;
    location: string | null;
  } | null;

  if (!rawEvent || rawEvent.status !== "published") {
    notFound();
  }

  const eventSettings = (rawEvent.settings as Record<string, unknown> | null) ?? {};
  const onlineMeetingUrl =
    (eventSettings.onlineInfo as string) ||
    (eventSettings.googleMeetUrl as string) ||
    (rawEvent.maps_url?.includes("meet.google.com") ? rawEvent.maps_url : null) ||
    process.env.GOOGLE_MEET_FALLBACK_URL ||
    CSC_OFFICIAL_MEET_URL;

  const calendarUrl =
    (eventSettings.calendarUrl as string) ||
    CSC_OFFICIAL_CALENDAR_URL;

  const event = {
    ...rawEvent,
    online_info: onlineMeetingUrl,
  };

  // 2. Check payment and confirmation status
  const isConfirmed =
    (registration.status === "confirmed" || registration.status === "checked_in") &&
    (registration.payment === "paid" || registration.payment === "not_required");

  if (!isConfirmed) {
    return (
      <section className="py-12 sm:py-16">
        <Container className="max-w-xl">
          <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-8 text-center shadow-xs">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Clock className="size-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Verification in Progress</h1>
            <p className="mt-2 text-sm text-slate-700">
              Your registration for <span className="font-semibold text-slate-900">{event.title}</span> is awaiting
              payment verification. As soon as Axis Bank confirms your transaction, this secure portal will unlock your
              Google Meet access link and admission pass.
            </p>
            <div className="mt-4 rounded-xl border border-amber-200 bg-white p-3 text-xs font-mono text-slate-700">
              Pass Reference: {registration.reference}
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="size-4" /> Back to Events
              </Link>
            </div>
          </div>
        </Container>
      </section>
    );
  }

  // 3. Generate QR Code Server-Side
  const qrDataUrl = await QRCode.toDataURL(buildEventPassQrPayload(token), {
    width: 320,
    margin: 2,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  const meetUrl = event.online_info || CSC_OFFICIAL_MEET_URL;

  return (
    <section className="py-10 sm:py-14">
      <Container className="max-w-2xl">
        <div className="mb-4">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="size-4" /> Back to Events
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
          {/* Official Cover Banner Image */}
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/events/csc-joint-online-meeting-banner.webp"
              alt={`${event.title} Banner`}
              className="size-full object-cover"
            />
          </div>

          {/* Top Banner Header */}
          <div className="bg-gradient-to-r from-teal-700 to-slate-900 px-6 py-6 text-white sm:px-8">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-200">
              <ShieldCheck className="size-4" /> Confirmed Attendee Pass
            </div>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{event.title}</h1>
            <p className="mt-1 text-xs text-teal-100">
              Coimbatore Startup Community · Verified Digital Access
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {/* Attendee Details Card */}
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-2">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Attendee</span>
                <p className="text-base font-bold text-slate-900">{registration.attendee_name || "Valued Attendee"}</p>
                {registration.source_email && (
                  <p className="text-xs text-slate-500">{registration.source_email}</p>
                )}
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pass Reference</span>
                <p className="font-mono text-sm font-bold text-teal-700">{registration.reference}</p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                  <UserCheck className="size-3" /> {rawEvent?.admission === "free" || registration.payment === "not_required" ? "Registration Confirmed" : "Payment Verified"}
                </span>
              </div>
              <div className="sm:col-span-2 border-t border-slate-200/60 pt-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Event Schedule</span>
                <div className="mt-1 flex flex-col gap-1 text-xs text-slate-800">
                  <div className="flex items-center gap-2 font-semibold">
                    <Calendar className="size-4 text-teal-600 shrink-0" />
                    <span>Sunday, November 22, 2026</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 pl-6">
                    <Clock className="size-3.5 text-slate-400 shrink-0" />
                    <span>Time: 3:00 PM – 5:00 PM IST (Check-in unlocks at 2:00 PM IST)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Google Meet Direct Access Action */}
            <div className="mt-6 rounded-2xl border-2 border-teal-600 bg-teal-50/50 p-5 text-center sm:p-6">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm">
                <Video className="size-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Google Meet Conference Access</h2>
              <p className="mx-auto mt-1 max-w-md text-xs text-slate-600">
                Your admission is confirmed. Google Meet check-in unlocks at <strong>2:00 PM IST</strong> (1 hour before the meeting starts).
              </p>

              <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={`/events/google-meet/check-in?token=${token}`}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-teal-700 transition"
                >
                  <ShieldCheck className="size-5" /> Open QR Check-in Portal <ArrowLeft className="size-4 rotate-180" />
                </Link>
                <a
                  href={meetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-teal-600 bg-white px-5 py-3.5 text-sm font-bold text-teal-700 shadow-xs hover:bg-teal-50 transition"
                >
                  <Video className="size-4" /> Direct Google Meet Link <ExternalLink className="size-3.5" />
                </a>
              </div>

              {/* Admission Instructions */}
              <div className="mt-5 rounded-xl border border-teal-200/80 bg-white p-3.5 text-left text-xs text-slate-600">
                <p className="font-semibold text-teal-900 flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-teal-600" /> Host Admission Instructions
                </p>
                <p className="mt-1 leading-relaxed">
                  Please join using the Google account registered for this event. The meeting host will admit registered attendees matching the confirmed list. Keep your microphone muted upon entry until the open networking floor is announced.
                </p>
              </div>
            </div>

            {/* Digital QR Pass */}
            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-6 text-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Digital Pass QR Code
              </span>
              <div className="mx-auto my-3 flex size-48 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt={`QR Code Pass for ${registration.attendee_name}`}
                  className="size-full object-contain"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Present this pass if requested by event moderators. This QR code encodes your cryptographically signed registration token.
              </p>
            </div>

            {/* Security Notice */}
            <p className="mt-6 text-center text-[11px] text-slate-400">
              🔒 This link and pass are unique to you ({registration.attendee_name}). Do not share this private URL.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
