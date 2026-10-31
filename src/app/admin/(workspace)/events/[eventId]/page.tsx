import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Megaphone,
  Pencil,
  ExternalLink,
  Calendar,
  Clock,
  MapPin,
  Video,
  Ticket,
  Download,
  Users,
  QrCode,
  CheckCircle2,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusBadge } from "@/components/member/status-badge";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { publicationStatusMeta } from "@/lib/admin/status-meta";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { CompleteContentButton } from "@/components/admin/complete-content-button";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Event detail" };

export default async function AdminEventDetail({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await requireAdminPagePermission(["events.update", "events.publish"]);
  const sb = ctx.mode === "live" ? await createClient() : null;

  const [res, { data: eventData }, { data: recentRegs }] = await Promise.all([
    adminServices.getEvent(eventId),
    sb ? sb.from("events").select("*").eq("id", eventId).maybeSingle() : Promise.resolve({ data: null }),
    sb && can(ctx, "registrations.read")
      ? sb
          .from("event_registrations")
          .select("id, reference, attendee_name, status, payment, attendance, created_at, source_email")
          .eq("event_id", eventId)
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),
  ]);

  if (!res.ok) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/admin/events" className="inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-ink">
          <ArrowLeft className="size-4" /> Back to events
        </Link>
        <AdminPageHeader title="Event" isDemo={ctx.mode === "preview"} />
        <p className="text-brand-muted">{res.error.message}</p>
      </div>
    );
  }

  const e = res.data;
  const meta = publicationStatusMeta[e.status];
  const settings = (eventData?.settings as Record<string, unknown> | null) ?? {};
  const isOnline = eventData?.format === "online" || settings.format === "online";
  const meetUrl = (settings.onlineInfo as string) || (eventData?.maps_url?.includes("meet.google.com") ? eventData.maps_url : null);
  const venueName = (eventData?.venue as string) || (settings.venueName as string);
  const venueAddress = (eventData?.location as string) || (settings.venueAddress as string);
  const mapsUrl = (eventData?.maps_url as string) || (settings.mapsUrl as string);
  const ticketPrice = typeof settings.ticketPrice === "number" ? settings.ticketPrice : (eventData?.price_minor ? eventData.price_minor / 100 : 0);
  const pricePerAttendee = typeof settings.pricePerAttendee === "number" ? settings.pricePerAttendee : eventData?.price_per_attendee;
  const upiVpa = (settings.upiVpa as string) || eventData?.upi_vpa;
  const upiPayee = (settings.upiPayeeName as string) || eventData?.upi_payee_name;
  const upiQr = (settings.upiQrUrl as string) || (eventData?.upi_qr_path ? `/api/events/${eventId}/upi-qr` : null);
  const coverImage = (eventData?.cover_image as string) || (settings.coverImage as string);
  const summary = (eventData?.summary as string) || (settings.summary as string);
  const description = (eventData?.description as string) || (settings.description as string);

  return (
    <div className="flex flex-col gap-6">
      {/* Back button */}
      <div>
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-brand-muted transition hover:text-brand-ink"
        >
          <ArrowLeft className="size-4" /> Back to events
        </Link>
      </div>

      {/* Header with evenly-aligned action buttons */}
      <AdminPageHeader
        title={e.title}
        description={`${e.category.toUpperCase()} · Starts ${e.startsAt ? formatEventDate(e.startsAt) : "Date TBD"}`}
        isDemo={ctx.mode === "preview"}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {ctx.mode === "live" && can(ctx, "events.publish") ? (
              <CompleteContentButton
                kind="event"
                id={eventId}
                isCompleted={e.isCompleted}
              />
            ) : null}
            {can(ctx, "registrations.read") ? (
              <Link
                href={`/admin/events/${e.id}/registrations`}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-brand-border bg-white px-3.5 text-xs font-semibold text-brand-secondary shadow-2xs transition hover:bg-brand-cloud"
              >
                <Users className="size-3.5" /> Registrations ({e.confirmed})
              </Link>
            ) : null}
            {can(ctx, "events.update") ? (
              <Link
                href={`/admin/events/${e.id}/edit`}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-ink px-3.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-brand-ink/90"
              >
                <Pencil className="size-3.5" /> Edit
              </Link>
            ) : null}
            {e.slug ? (
              <Link
                href={`/events/${e.slug}`}
                target="_blank"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-xl border border-brand-border bg-white px-3 text-xs text-brand-muted transition hover:text-brand-ink hover:underline"
              >
                Public <ExternalLink className="size-3" />
              </Link>
            ) : null}
            {can(ctx, "events.publish") ? (
              <Link
                href={`/admin/notifications?eventId=${e.id}`}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-brand-border bg-white px-3 text-xs font-medium text-brand-ink transition hover:bg-brand-cloud"
              >
                <Megaphone className="size-3.5" /> Promote
              </Link>
            ) : null}
          </div>
        }
      />

      {/* Top Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="flex flex-col gap-1 rounded-2xl border border-brand-border bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-semibold tracking-wider text-brand-muted uppercase">Confirmed</span>
          <span className="text-2xl font-bold text-brand-ink">{e.confirmed}</span>
          <span className="text-xs text-brand-secondary">
            {e.capacity ? `${Math.round((e.confirmed / e.capacity) * 100)}% capacity filled` : "Attendees confirmed"}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-brand-border bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-semibold tracking-wider text-brand-muted uppercase">Waitlisted</span>
          <span className="text-2xl font-bold text-brand-ink">{e.waitlisted}</span>
          <span className="text-xs text-brand-secondary">In queue for capacity</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-brand-border bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-semibold tracking-wider text-brand-muted uppercase">Total Capacity</span>
          <span className="text-2xl font-bold text-brand-ink">{e.capacity ?? "Unlimited"}</span>
          <span className="text-xs text-brand-secondary">Max attendee seats</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-brand-border bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-semibold tracking-wider text-brand-muted uppercase">Admission</span>
          <span className="text-2xl font-bold text-brand-ink capitalize">{e.admission}</span>
          <span className="text-xs text-brand-secondary">
            {e.admission === "free" ? "Free entry (0 INR)" : `₹${ticketPrice.toLocaleString("en-IN")}`}
          </span>
        </div>
      </div>

      {/* Status & Lifecycle Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge label={meta.label} tone={meta.tone} />
          {e.isCompleted ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
              <CheckCircle2 className="size-3" /> Completed
            </span>
          ) : null}
          <span className="text-xs sm:text-sm text-brand-muted">
            Format: <strong className="font-semibold text-brand-ink capitalize">{isOnline ? "Online (Google Meet)" : "In-Person"}</strong>
          </span>
        </div>
        <span className="text-xs text-brand-muted">Event ID: <code className="font-mono text-brand-ink">{e.id}</code></span>
      </div>

      {/* Two-column overview cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Schedule & Location */}
        <div className="flex flex-col gap-4 rounded-2xl border border-brand-border bg-white p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center gap-2 text-brand-ink">
            {isOnline ? <Video className="size-5 text-brand-accent" /> : <MapPin className="size-5 text-brand-accent" />}
            <h2 className="text-base font-semibold">Location &amp; Schedule</h2>
          </div>

          <dl className="flex flex-col gap-3 text-sm border-t border-brand-border/60 pt-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Format</dt>
              <dd className="mt-0.5 font-medium text-brand-ink">
                {isOnline ? "Online Meeting" : "In-Person Gathering"}
              </dd>
            </div>

            {isOnline ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Google Meet Information</dt>
                <dd className="mt-1">
                  {meetUrl ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-brand-cloud px-2.5 py-1 font-mono text-xs text-brand-ink break-all">
                        {meetUrl}
                      </span>
                      <a
                        href={meetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-brand-ink px-3 py-1 text-xs font-semibold text-white transition hover:bg-brand-ink/90"
                      >
                        Open Google Meet <ExternalLink className="size-3" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-brand-muted">Online meeting link pending.</span>
                  )}
                </dd>
              </div>
            ) : (
              <>
                {venueName ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Venue Name</dt>
                    <dd className="mt-0.5 font-medium text-brand-ink">{venueName}</dd>
                  </div>
                ) : null}
                {venueAddress ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Venue Address</dt>
                    <dd className="mt-0.5 text-brand-secondary break-words">{venueAddress}</dd>
                  </div>
                ) : null}
                {mapsUrl ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Map Location</dt>
                    <dd className="mt-1">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-accent hover:underline"
                      >
                        View on Google Maps <ExternalLink className="size-3" />
                      </a>
                    </dd>
                  </div>
                ) : null}
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-brand-border/60 pt-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Starts At</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-brand-ink">
                  <Calendar className="size-3.5 text-brand-muted" />
                  {e.startsAt ? `${formatEventDate(e.startsAt)} · ${formatEventTime(e.startsAt)} IST` : "TBD"}
                </dd>
              </div>
              {eventData?.ends_at ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Ends At</dt>
                  <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-brand-ink">
                    <Clock className="size-3.5 text-brand-muted" />
                    {formatEventDate(eventData.ends_at)} · {formatEventTime(eventData.ends_at)} IST
                  </dd>
                </div>
              ) : null}
            </div>
          </dl>
        </div>

        {/* Admission & Payments */}
        <div className="flex flex-col gap-4 rounded-2xl border border-brand-border bg-white p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center gap-2 text-brand-ink">
            <Ticket className="size-5 text-brand-accent" />
            <h2 className="text-base font-semibold">Admission &amp; Payments</h2>
          </div>

          <dl className="flex flex-col gap-3 text-sm border-t border-brand-border/60 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Admission Type</dt>
                <dd className="mt-0.5 font-semibold text-brand-ink capitalize">{e.admission}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Ticket Price</dt>
                <dd className="mt-0.5 font-semibold text-brand-ink">
                  {e.admission === "free" ? "₹0 (Free)" : `₹${ticketPrice.toLocaleString("en-IN")}`}
                </dd>
              </div>
            </div>

            {e.admission === "paid" ? (
              <>
                {pricePerAttendee ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Price Per Attendee</dt>
                    <dd className="mt-0.5 font-medium text-brand-ink">₹{pricePerAttendee.toLocaleString("en-IN")}</dd>
                  </div>
                ) : null}
                {upiVpa ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-brand-muted">UPI VPA</dt>
                    <dd className="mt-0.5 font-mono text-xs text-brand-ink">{upiVpa}</dd>
                  </div>
                ) : null}
                {upiPayee ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-brand-muted">UPI Payee Name</dt>
                    <dd className="mt-0.5 font-medium text-brand-ink">{upiPayee}</dd>
                  </div>
                ) : null}
                {upiQr ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-brand-muted">QR Code (Scan to Pay)</dt>
                    <dd className="mt-2">
                      <div className="relative size-24 overflow-hidden rounded-xl border border-brand-border bg-brand-cloud p-1">
                        <Image src={upiQr} alt="UPI QR" width={96} height={96} className="size-full object-contain" unoptimized />
                      </div>
                    </dd>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="rounded-xl bg-brand-cloud p-3 text-xs text-brand-secondary">
                Free admission. No online payment setup or attendee charges required for this event.
              </p>
            )}
          </dl>
        </div>
      </div>

      {/* Summary & Description */}
      {(summary || description || coverImage) ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-brand-border bg-white p-5 sm:p-6 shadow-2xs">
          <h2 className="text-base font-semibold text-brand-ink">Content &amp; Description</h2>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_2fr]">
            {coverImage ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-brand-border bg-brand-cloud">
                <Image src={coverImage} alt={e.title} fill sizes="(max-width: 1024px) 100vw, 360px" className="object-cover" unoptimized />
              </div>
            ) : null}
            <div className="flex flex-col gap-2.5">
              {summary ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Summary</h3>
                  <p className="mt-1 text-sm font-medium text-brand-ink">{summary}</p>
                </div>
              ) : null}
              {description ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">Full Description</h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-brand-secondary leading-relaxed">{description}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Recent Registrations Card */}
      {can(ctx, "registrations.read") ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-brand-border bg-white p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-brand-ink">Recent Registrations</h2>
              <p className="text-xs text-brand-muted">Attendees registered for this event.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/api/admin/events/registrations/export?event=${e.id}`}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-brand-border bg-white px-3 text-xs font-medium text-brand-ink transition hover:bg-brand-cloud"
              >
                <Download className="size-3.5" /> Export CSV
              </Link>
              <Link
                href={`/admin/events/${e.id}/registrations`}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-brand-ink px-3.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-brand-ink/90"
              >
                View all registrations ({e.confirmed})
              </Link>
            </div>
          </div>

          {(recentRegs ?? []).length > 0 ? (
            <div className="divide-y divide-brand-border/60">
              {(recentRegs ?? []).map((reg) => (
                <div key={reg.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-brand-ink truncate">{reg.attendee_name || "Name pending"}</p>
                    <p className="text-xs text-brand-muted">
                      UID: <span className="font-mono">{reg.reference || "—"}</span> · {reg.source_email ? `${reg.source_email} · ` : ""}Registered {formatEventDate(reg.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-full bg-brand-cloud px-2.5 py-0.5 text-xs font-semibold capitalize text-brand-secondary">
                      {reg.status}
                    </span>
                    <span className="rounded-full bg-brand-cloud px-2.5 py-0.5 text-xs text-brand-muted capitalize">
                      {reg.payment}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-brand-cloud p-4 text-xs text-brand-muted text-center">
              No registrations recorded yet for this event.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
