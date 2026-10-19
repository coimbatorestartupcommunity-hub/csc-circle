import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CheckInScanner } from "@/components/admin/check-in-scanner";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { getAdminContext, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";

export const metadata = { title: "Check-in" };

export default async function CheckInPage() {
  const ctx = await getAdminContext();
  if (!can(ctx, "attendance.scan")) return <AdminUnavailable forbidden />;

  const res = await adminServices.listEvents();
  const events = (res.ok ? res.data : []).map((e) => ({
    id: e.id,
    title: e.title,
    startsAt: e.startsAt,
  }));

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
