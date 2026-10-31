import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";
import { getAdminContext } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { authResponse } from "@/lib/auth/http";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await context.params;
    const ctx = await getAdminContext();
    if (ctx.mode !== "live") {
      return authResponse({ error: "Administrator access required." }, 403);
    }
    if (!ctx.permissions.has("registrations.approve")) {
      return authResponse({ error: "Permission denied." }, 403);
    }
    if (
      !rateLimit(
        `admin-resend-all:${ctx.userId}:${clientIp(request)}`,
        5,
        60_000,
      ).allowed
    ) {
      return authResponse(
        { error: "Too many requests. Please wait a moment." },
        429,
      );
    }

    const admin = createAdminClient();
    const session = await createClient();

    // Query confirmed registrations for this event
    const { data: registrations, error } = await admin
      .from("event_registrations")
      .select("id, status, pass_token")
      .eq("event_id", eventId)
      .eq("status", "confirmed");

    if (error) {
      return authResponse(
        { error: "Could not load event registrations." },
        503,
      );
    }

    if (!registrations || registrations.length === 0) {
      return authResponse(
        { error: "No confirmed attendees found for this event." },
        404,
      );
    }

    let queuedCount = 0;
    for (const reg of registrations) {
      if (reg.pass_token) {
        const { data: res } = await session.rpc("csc_resend_event_pass", {
          p_registration_id: reg.id,
        });
        if (res) queuedCount++;
      }
    }

    if (queuedCount > 0) {
      scheduleNotificationDelivery();
    }

    return authResponse({
      ok: true,
      totalAttendees: registrations.length,
      queuedCount,
      message: `Successfully queued event passes with PDF attachments for ${queuedCount} attendees. Delivery is in progress.`,
    });
  } catch {
    return authResponse(
      { error: "Failed to queue event passes. Please try again." },
      500,
    );
  }
}
