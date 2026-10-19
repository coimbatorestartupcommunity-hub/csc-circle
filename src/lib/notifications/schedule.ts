import "server-only";
import { after } from "next/server";
import { dispatchNotifications } from "@/lib/notifications/dispatcher";
export function scheduleNotificationDelivery() {
  after(async () => {
    try { const result=await dispatchNotifications(); if (["configuration_error","database_configuration_error","queue_unavailable"].includes(result.state)) console.error("CSC_NOTIFICATION_"+result.state.toUpperCase()); }
    catch { console.error("CSC_NOTIFICATION_DISPATCH_FAILED"); }
  });
}
