import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { createSubmissionClient } from "@/lib/supabase/submissions";
import { drainNotificationQueue } from "@/lib/notifications/schedule";
export const maxDuration = 300;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  if (!secret || secret.length < 32 || expected.length !== supplied.length || !timingSafeEqual(expected,supplied)) return Response.json({error:"Unauthorized"},{status:401});
  try {
    if (new URL(request.url).searchParams.get("continuation") !== "1") {
      const sb=createSubmissionClient();
      if (!sb) return Response.json({error:"Queue unavailable"},{status:503});
      const scheduled=await sb.rpc("csc_schedule_event_reminders");
      if (scheduled.error) return Response.json({error:"Queue unavailable"},{status:503});
      const reviews = await sb.rpc("csc_schedule_event_review_requests");
      if (reviews.error) return Response.json({error:"Review scheduling unavailable"},{status:503});
    }
    after(async () => {
      try {
        const result = await drainNotificationQueue(6);
        if (["configuration_error","database_configuration_error","queue_unavailable"].includes(result.state))
          console.error("CSC_NOTIFICATION_" + result.state.toUpperCase());
      } catch {
        console.error("CSC_NOTIFICATION_DISPATCH_FAILED");
      }
    });
    return Response.json({state:"scheduled"},{status:202,headers:{"Cache-Control":"no-store"}});
  } catch { return Response.json({error:"Dispatch unavailable"},{status:503}); }
}
