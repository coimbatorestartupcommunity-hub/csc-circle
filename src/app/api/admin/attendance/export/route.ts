import { NextResponse } from "next/server";
import { getAdminContext, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { attendanceCsv } from "@/lib/admin/attendance-csv";

export async function GET() {
  const context = await getAdminContext();
  if (context.mode !== "live" || !can(context, "registrations.read")) {
    return NextResponse.json({ error: "Registration reporting access required." }, { status: 403 });
  }

  const result = await adminServices.listRegistrations();
  if (!result.ok) {
    return NextResponse.json({ error: "Attendance report could not be loaded." }, { status: 503 });
  }

  const body = `\uFEFF${attendanceCsv(result.data)}`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="csc-attendance-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
