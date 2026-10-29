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
  const stored = sb ? await sb.from("events").select("settings").eq("id", eventId).maybeSingle() : null;
  const parsed = eventEditorSchema.safeParse(stored?.data?.settings);

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
        initial={
          parsed.success ? parsed.data : e
            ? {
                title: e.title,
                category: e.category as never,
                capacity: e.capacity != null ? String(e.capacity) : undefined,
                admission: e.admission,
                status: e.status === "published" ? "published" : "draft",
              }
            : undefined
        }
      />
    </>
  );
}
