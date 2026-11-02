import { createClient } from "@/lib/supabase/server";
import { eventEditorSchema } from "@/lib/validations/admin";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EventEditorForm } from "@/components/admin/event-editor-form";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";

export const metadata = { title: "Edit event" };

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await requireAdminPagePermission("events.update");
  if (!can(ctx, "events.update")) return <AdminUnavailable forbidden />;

  const res = await adminServices.getEvent(eventId);
  const e = res.ok ? res.data : null;
  const sb = ctx.mode === "live" ? await createClient() : null;
  const stored = sb ? await sb.from("events").select("*").eq("id", eventId).maybeSingle() : null;
  const row = stored?.data;
  const rawSettings = (row?.settings as Record<string, unknown> | null) ?? {};

  const mergedInitial = {
    ...rawSettings,
    title: row?.title ?? rawSettings.title ?? e?.title,
    slug: row?.slug ?? rawSettings.slug ?? e?.slug,
    category: (row?.category ?? rawSettings.category ?? e?.category) as never,
    description: row?.description ?? rawSettings.description,
    summary: row?.summary ?? rawSettings.summary,
    coverImage: row?.cover_image ?? rawSettings.coverImage,
    venueName: row?.venue ?? rawSettings.venueName ?? e?.venue,
    venueAddress: row?.location ?? rawSettings.venueAddress,
    admission: (row?.admission ?? rawSettings.admission ?? e?.admission ?? "free") as "free" | "paid",
    price: row?.price_minor ? String(row.price_minor / 100) : rawSettings.price ? String(rawSettings.price) : "0",
    capacity: row?.capacity != null ? String(row.capacity) : rawSettings.capacity ? String(rawSettings.capacity) : undefined,
    completed: row?.registration_state === "completed" || Boolean(rawSettings.completed) || Boolean(e?.isCompleted),
    status: (row?.status ?? rawSettings.status ?? (e?.status === "published" ? "published" : "draft")) as "draft" | "published",
    date: row?.starts_at ? row.starts_at.slice(0, 10) : rawSettings.date,
    startTime: row?.starts_at ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(row.starts_at)) : rawSettings.startTime,
    endTime: row?.ends_at ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(row.ends_at)) : rawSettings.endTime,
    format: (row?.format ?? rawSettings.format ?? "offline") as "offline" | "online" | "hybrid",
    upiVpa: row?.upi_vpa ?? rawSettings.upiVpa,
    upiPayeeName: row?.upi_payee_name ?? rawSettings.upiPayeeName,
    upiQrPath: row?.upi_qr_path ?? rawSettings.upiQrPath,
    onlineInfo: rawSettings.onlineInfo ?? (row?.maps_url?.includes("meet.google.com") ? row.maps_url : undefined),
    registrationMode: (row?.registration_mode ?? rawSettings.registrationMode ?? (row?.admission === "paid" ? "paid_upi" : "rsvp")) as "rsvp" | "paid_upi",
  };

  const parsed = eventEditorSchema.safeParse(mergedInitial);

  return (
    <>
      <Link href={`/admin/events/${eventId}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-ink">
        <ArrowLeft className="size-4" /> Back to event
      </Link>
      <AdminPageHeader title="Edit event" isDemo={ctx.mode === "preview"} />
      <EventEditorForm
        eventId={eventId}
        mode="edit"
        isDemo={ctx.mode === "preview"}
        canPublishSurfaces={can(ctx, "events.publish") && can(ctx, "content.manage")}
        initial={parsed.success ? parsed.data : (mergedInitial as never)}
      />
    </>
  );
}
