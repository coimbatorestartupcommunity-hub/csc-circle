import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id || !z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ ok: false, error: "Invalid registration id" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: reg, error } = await admin
      .from("event_registrations")
      .select("id, status, attendance, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error || !reg) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const isCheckedIn = reg.status === "checked_in" || reg.attendance === "checked_in";
    return NextResponse.json(
      {
        ok: true,
        checkedIn: isCheckedIn,
        checkedInAt: isCheckedIn ? reg.updated_at : null,
        status: reg.status,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
