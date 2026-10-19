import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatCard } from "@/components/admin/stat-card";
import { ActionButton } from "@/components/admin/action-button";
import { DataTable, type Column } from "@/components/admin/data-table";
import { getAdminContext } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";

export const metadata = { title: "Attendance" };

const columns: Column[] = [
  { key: "reference", header: "Reference", type: "mono" },
  { key: "memberName", header: "Attendee" },
  { key: "status", header: "Registration", type: "statusRegistration" },
  { key: "attendance", header: "Attendance", type: "badge" },
];

export default async function AttendancePage() {
  const ctx = await getAdminContext();
  const res = await adminServices.listRegistrations();
  const regs = res.ok ? res.data : [];
  const checkedIn = regs.filter((r) => r.attendance === "checked_in").length;
  const confirmed = regs.filter((r) => r.status === "confirmed" || r.status === "checked_in").length;
  const rate = confirmed ? Math.round((checkedIn / confirmed) * 100) : 0;

  return (
    <>
      <AdminPageHeader
        title="Attendance reports"
        description="Check-in totals per event. CSV export uses authorized server-side access (Phase 1)."
        isDemo={ctx.mode === "preview"}
        action={<ActionButton label="Export CSV" message="CSV export uses authorized server-side data access in Phase 1 — never exposing private rows to the browser." />}
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
        searchKeys={["reference", "memberName"]}
        emptyMessage={res.ok ? "No attendance records." : res.error.message}
      />
    </>
  );
}
