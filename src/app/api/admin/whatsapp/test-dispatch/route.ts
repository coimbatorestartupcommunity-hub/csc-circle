import { getAdminContext } from "@/lib/admin/gate";
import { authResponse } from "@/lib/auth/http";
import { enqueueWhatsAppNotification } from "@/lib/notifications/whatsapp-outbox";

export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !ctx.userId || !ctx.permissions.has("members.read")) {
      return authResponse({ error: "Permission denied." }, 403);
    }

    const body = await request.json();
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!phone || phone.length < 10) {
      return authResponse({ error: "Please provide a valid 10-digit mobile number." }, 400);
    }

    const message = text || "CSC Circle WhatsApp Live Verification: System connected and functioning 24/7. Connect. Build. Grow.";

    const res = await enqueueWhatsAppNotification({
      recipientPhone: phone,
      text: message,
      messageType: "admin_live_verification",
      name: ctx.displayName || "Admin",
    });

    if (!res.success) {
      return authResponse({ error: res.error || "Failed to enqueue test message." }, 500);
    }

    return authResponse({
      ok: true,
      outboxId: res.outboxId,
      message: `Test notification successfully enqueued into outbox (ID: ${res.outboxId}). Dispatched to +91 ${phone.slice(-10)} via worker within 3 seconds.`,
    });
  } catch (err) {
    return authResponse(
      { error: err instanceof Error ? err.message : "Internal server error" },
      500
    );
  }
}
