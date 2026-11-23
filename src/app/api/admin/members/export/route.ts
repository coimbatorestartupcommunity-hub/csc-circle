import { NextResponse } from "next/server";
import { getAdminContext, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { formatEventDate } from "@/lib/format";

export async function GET() {
  const ctx = await getAdminContext();
  if (ctx.mode !== "live" || !can(ctx, "members.read")) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  const res = await adminServices.listMembers();
  const members = res.ok ? res.data : [];

  const headers = [
    "Member Number",
    "Full Name",
    "Email",
    "WhatsApp",
    "Designation",
    "Startup",
    "Status",
    "Joined Date",
  ];

  const escapeCsv = (val: unknown) => {
    const s = String(val ?? "").replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = members.map((m) => [
    escapeCsv(m.memberNumber || "Not Issued"),
    escapeCsv(m.fullName),
    escapeCsv(m.email),
    escapeCsv(m.whatsapp || ""),
    escapeCsv(m.designation || ""),
    escapeCsv(m.startup || ""),
    escapeCsv(m.status),
    escapeCsv(m.joinedAt ? formatEventDate(m.joinedAt) : ""),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const filename = `CSC_Members_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
