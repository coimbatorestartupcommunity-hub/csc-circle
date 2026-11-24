import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, can } from "@/lib/admin/gate";
import { getAuthUser } from "@/lib/supabase/server";
import { emailConfiguration } from "@/lib/notifications/config";
import { sendCommunityEmail } from "@/lib/notifications/email";

export const instant = false;

export async function POST(req: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx || !can(ctx, "settings.manage")) {
    return NextResponse.json({ error: "Forbidden: Admin settings.manage required" }, { status: 403 });
  }

  try {
    const user = await getAuthUser();
    const config = emailConfiguration();
    const defaultEmail = user?.email || config.support;

    const body = await req.json();
    const to = typeof body.to === "string" && body.to.includes("@") ? body.to.trim() : defaultEmail;
    const subject = typeof body.subject === "string" ? body.subject.trim() : "[CSC Test] Template Preview";
    const html = typeof body.html === "string" ? body.html : "";

    if (!html) {
      return NextResponse.json({ error: "Missing HTML template body" }, { status: 400 });
    }

    const text = "This is a live test dispatch of the updated CSC Circle email templates. View HTML version in supported email client.";

    const result = await sendCommunityEmail({
      to,
      subject,
      text,
      html,
      notificationId: `preview-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    });

    return NextResponse.json({ ok: true, result });
  } catch (err: unknown) {
    console.error("[email-preview/test-send] Error sending test email:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to send test email" },
      { status: 500 }
    );
  }
}
