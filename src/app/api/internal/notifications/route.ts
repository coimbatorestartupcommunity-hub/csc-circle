import { timingSafeEqual } from "node:crypto";
import { dispatchNotifications } from "@/lib/notifications/dispatcher";
import { createSubmissionClient } from "@/lib/supabase/submissions";
export const maxDuration = 300;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  if (!secret || secret.length < 32 || expected.length !== supplied.length || !timingSafeEqual(expected,supplied)) return Response.json({error:"Unauthorized"},{status:401});
  try {
    const sb=createSubmissionClient();
    if (!sb) return Response.json({error:"Queue unavailable"},{status:503});
    const scheduled=await sb.rpc("csc_schedule_event_reminders");
    if (scheduled.error) return Response.json({error:"Queue unavailable"},{status:503});
    const result=await dispatchNotifications();
    return Response.json(result,{status:result.state==="processed"?200:503,headers:{"Cache-Control":"no-store"}});
  } catch { return Response.json({error:"Dispatch unavailable"},{status:503}); }
}
