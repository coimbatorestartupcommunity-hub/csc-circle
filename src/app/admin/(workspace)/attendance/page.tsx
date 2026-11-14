import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Download } from "lucide-react";
import Link from "next/link";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";

export const metadata = { title: "Attendance" };

const columns: Column[] = [
  { key: "eventTitle", header: "Event" },
  { key: "reference", header: "Reference", type: "mono" },
  { key: "memberName", header: "Attendee" },
  { key: "status", header: "Registration", type: "statusRegistration" },
  { key: "attendance", header: "Attendance", type: "badge" },
];

export default async function AttendancePage() {
  const ctx = await requireAdminPagePermission("registrations.read");
  if (!can(ctx, "registrations.read")) return <AdminUnavailable forbidden />;
  const res = await adminServices.listRegistrations();
  const regs = res.ok ? res.data : [];
  const checkedIn = regs.filter((r) => r.attendance === "checked_in").length;
  const confirmed = regs.filter((r) => r.status === "confirmed" || r.status === "checked_in").length;
  const rate = confirmed ? Math.round((checkedIn / confirmed) * 100) : 0;
  const canManualCheckIn = ctx.mode === "live" && can(ctx, "attendance.scan");

  return (
    <>
      <AdminPageHeader
        title="Attendance reports"
        description="Review attendance, manually check in confirmed attendees when scanning is unavailable, and export the access-controlled report."
        isDemo={ctx.mode === "preview"}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/events/google-meet/check-in"
              target="_blank"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-brand-border bg-white px-3.5 py-2 text-xs font-semibold text-brand-ink transition hover:bg-brand-cloud"
            >
              Attendee Check-in Portal ↗
            </Link>
            {ctx.mode === "live" ? (
              <Link
                href="/api/admin/attendance/export"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
              >
                <Download className="size-4" aria-hidden />
                Download CSV
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Confirmed" value={confirmed} />
        <StatCard label="Checked in" value={checkedIn} />
        <StatCard label="Not arrived" value={Math.max(0, confirmed - checkedIn)} />
        <StatCard label="Attendance rate" value={`${rate}%`} />
      </div>

      <DataTable
        rows={regs}
        columns={columns}
        searchKeys={["eventTitle", "reference", "memberName"]}
        actions={[
          ...(canManualCheckIn ? [{
            label: "Check In",
            operation: { kind: "manual_check_in", decision: "checked_in" },
            confirm: "Confirm that this attendee has arrived. This records an audited manual check-in and cannot be used for an unconfirmed or unpaid registration.",
            variant: "default" as const,
            visibleForStatuses: ["confirmed"],
          }] : []),
          ...(ctx.mode === "live" && can(ctx, "registrations.approve") ? [{
            label: "Resend QR Pass",
            operation: { kind: "resend_event_pass", decision: "resend" },
            confirm: "Re-queue the digital event pass email with the individual QR code to this attendee.",
            variant: "outline" as const,
          }] : []),
        ]}
        emptyMessage={res.ok ? "No attendance records." : res.error.message}
      />
    </>
  );
}
