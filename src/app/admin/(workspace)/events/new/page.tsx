import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EventEditorForm } from "@/components/admin/event-editor-form";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { getAdminContext, can } from "@/lib/admin/gate";

export const metadata = { title: "New event" };

export default async function NewEventPage() {
  const ctx = await getAdminContext();
  if (!can(ctx, "events.create")) return <AdminUnavailable forbidden />;

  return (
    <>
      <Link href="/admin/events" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-ink">
        <ArrowLeft className="size-4" /> Back to events
      </Link>
      <AdminPageHeader title="Create event" description="Fill in the event details and preview before publishing." isDemo={ctx.mode === "preview"} />
      <EventEditorForm mode="create" isDemo={ctx.mode === "preview"} />
    </>
  );
}
