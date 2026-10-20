import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Download } from "lucide-react";
import Link from "next/link";
import { getAdminContext, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";

export const metadata = { title: "Attendance" };

const columns: Column[] = [
  { key: "reference", header: "Reference", type: "mono" },
  { key: "memberName", header: "Attendee" },
  { key: "status", header: "Registration", type: "statusRegistration" },
  { key: "attendance", header: "Attendance", type: "badge" },
];

export default async function AttendancePage() {
  const ctx = await getAdminContext();
  if (!can(ctx, "registrations.read")) return <AdminUnavailable forbidden />;
  const res = await adminServices.listRegistrations();
  const regs = res.ok ? res.data : [];
  const checkedIn = regs.filter((r) => r.attendance === "checked_in").length;
  const confirmed = regs.filter((r) => r.status === "confirmed" || r.status === "checked_in").length;
  const rate = confirmed ? Math.round((checkedIn / confirmed) * 100) : 0;

  return (
    <>
      <AdminPageHeader
        title="Attendance reports"
        description="Check-in totals per event and an access-controlled attendance export."
        isDemo={ctx.mode === "preview"}
        action={ctx.mode === "live" ? <Link href="/api/admin/attendance/export" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"><Download className="size-4" aria-hidden />Download CSV</Link> : null}
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
