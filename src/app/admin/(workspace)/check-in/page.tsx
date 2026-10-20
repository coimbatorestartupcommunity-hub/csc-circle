import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CheckInScanner } from "@/components/admin/check-in-scanner";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { getAdminContext, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const metadata = { title: "Check-in" };

export default async function CheckInPage() {
  const ctx = await getAdminContext();
  if (!can(ctx, "attendance.scan")) return <AdminUnavailable forbidden />;

  let events: { id: string; title: string; startsAt: string }[] = [];
  if (ctx.mode === "preview") {
    const res = await adminServices.listEvents();
    events = (res.ok ? res.data : []).map((event) => ({ id: event.id, title: event.title, startsAt: event.startsAt }));
  } else {
    const supabase = await createClient() as unknown as SupabaseClient;
    const { data } = await supabase.rpc("csc_checkin_available_events");
    events = ((data ?? []) as { id: string; title: string; starts_at: string }[]).map((event) => ({ id: event.id, title: event.title, startsAt: event.starts_at }));
  }

  return (
    <>
      <AdminPageHeader
        title="Event check-in"
        description="Scan attendee passes. Final admission is decided by the trusted server, never by the scanner alone."
        isDemo={ctx.mode === "preview"}
      />
      {events.length > 0 ? (
        <CheckInScanner events={events} isDemo={ctx.mode === "preview"} />
      ) : (
        <p className="text-brand-muted">No events available to scan.</p>
      )}
    </>
  );
}
