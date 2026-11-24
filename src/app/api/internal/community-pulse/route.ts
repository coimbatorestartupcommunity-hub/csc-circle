import { createAdminClient } from "@/lib/supabase/admin";
import { formatBiWeeklyCommunityPulse } from "@/lib/services/community-pulse";
import { enqueueWhatsAppNotification } from "@/lib/notifications/whatsapp-outbox";
import { triggerViaSocketFlow } from "@/lib/services/viasocket";
import { dispatchTeamWhatsAppAlert } from "@/lib/services/team-alerts";

export const maxDuration = 300;

function verifyAuth(request: Request): boolean {
  if (request.headers.get("x-vercel-cron")) return true;

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && cronSecret.length >= 16) {
    const authHeader = request.headers.get("authorization") ?? "";
    if (authHeader === `Bearer ${cronSecret}`) return true;
  }

  const customSecret = request.headers.get("x-cron-secret") ?? "";
  if (cronSecret && customSecret === cronSecret) return true;

  return false;
}

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const isForce = url.searchParams.get("force") === "1";

  // Bi-weekly calculation (Every alternate week)
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  if (!isForce && weekNumber % 2 !== 0) {
    return Response.json({
      ok: true,
      skipped: true,
      reason: "Off-week for bi-weekly Sunday schedule. Pass ?force=1 to test dispatch.",
    });
  }

  try {
    const sb = createAdminClient();
    const { data: claims, error: claimsErr } = await sb
      .from("membership_claims")
      .select("whatsapp, full_name")
      .not("whatsapp", "is", null)
      .limit(200);

    if (claimsErr) {
      return Response.json({ error: claimsErr.message }, { status: 500 });
    }

    const messageText = formatBiWeeklyCommunityPulse("en");
    const recipients = (claims || [])
      .map((c) => ({
        phone: (c.whatsapp || "").replace(/[^0-9]/g, ""),
        name: c.full_name || "Founder",
      }))
      .filter((r) => r.phone.length >= 10);

    let enqueued = 0;
    const nowIso = new Date().toISOString();

    for (const r of recipients) {
      void triggerViaSocketFlow("phone_otp_requested" as any, {
        type: "community_pulse_broadcast",
        phone: r.phone,
        name: r.name,
        timestamp: nowIso,
      }).catch(() => {});

      await enqueueWhatsAppNotification({
        recipientPhone: r.phone,
        text: messageText,
        messageType: "community_pulse_checkin",
        name: r.name,
      });

      enqueued++;
    }

    // Broadcast alert to 7-member Leadership WhatsApp Group
    await dispatchTeamWhatsAppAlert({
      type: "test_broadcast",
      title: "Bi-Weekly Community Pulse Dispatched",
      fields: {
        "Recipients Queued": enqueued,
        "Schedule": "Second Sunday 10:00 AM IST",
        "Channels": "WhatsApp Outbox + viaSocket Flow",
      },
    }).catch(() => {});

    return Response.json({
      ok: true,
      enqueuedCount: enqueued,
      timestamp: nowIso,
      message: `Bi-weekly community pulse successfully enqueued for ${enqueued} members!`,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
