import { NextResponse } from "next/server";
import { getMemberContext } from "@/lib/services/member/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { backfillPhoneVerificationNotifications } from "@/lib/services/phone-verification-notifications";

export async function POST(request: Request) {
  try {
    const ctx = await getMemberContext();
    if (ctx.mode !== "live" || !ctx.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: adminRoles } = await admin
      .from("admin_roles")
      .select("role")
      .eq("user_id", ctx.user.id)
      .limit(1);

    if (!adminRoles || adminRoles.length === 0) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const summary = await backfillPhoneVerificationNotifications();
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
