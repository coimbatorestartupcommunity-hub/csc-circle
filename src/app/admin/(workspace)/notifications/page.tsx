import { NotificationRetry } from "@/components/admin/notification-retry";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type Facet } from "@/components/admin/data-table";
import { getAdminContext } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { EventNoticeEditor } from "@/components/admin/event-notice-editor";
import { can } from "@/lib/admin/gate";
import { NotificationEmailCheck } from "@/components/admin/notification-email-check";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";

export const metadata = { title: "Notifications" };

const columns: Column[] = [
  { key: "type", header: "Event type", type: "mono" },
  { key: "channel", header: "Channel", type: "badge" },
  { key: "recipient", header: "Recipient" },
  { key: "status", header: "Status", type: "statusNotification", sortable: true },
  { key: "attempts", header: "Attempts" },
  { key: "lastError", header: "Delivery issue" },
  { key: "createdAt", header: "Created", type: "date", sortable: true },
  { key: "sentAt", header: "SMTP accepted", type: "date" },
  { key: "deliveredAt", header: "Inbox available", type: "date" },
];

const facets: Facet[] = [
  {
    key: "channel",
    label: "Channel",
    options: [
      { label: "In-app", value: "in_app" },
      { label: "Email", value: "email" },
      { label: "WhatsApp", value: "whatsapp" },
    ],
  },
  {
    key: "status",
    label: "Status",
    options: [
      { label: "Queued", value: "queued" },
      { label: "Sent", value: "sent" },
      { label: "Available in inbox", value: "available" },
      { label: "Superseded", value: "superseded" },
      { label: "Processing", value: "processing" },
      { label: "Retry scheduled", value: "failed_retryable" },
      { label: "Needs review", value: "failed_permanent" },
      { label: "Failed (legacy)", value: "failed" },
      { label: "Retrying", value: "retrying" },
    ],
  },
];

export default async function AdminNotificationsPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams;
  const ctx = await getAdminContext();
  const canDeliveryMonitor = ctx.permissions.has("roles.manage");
  const canPublishNotices = ctx.permissions.has("events.publish");
  if (!canDeliveryMonitor && !canPublishNotices) return <AdminUnavailable forbidden />;
  const res = canDeliveryMonitor ? await adminServices.listNotifications() : null;
  const rows = res?.ok ? res.data : [];

  return (
    <>
      <AdminPageHeader
        title="Notifications"
        description={canDeliveryMonitor ? "Delivery status for email and in-app notifications. In-app availability is separate from a member's unread state; SMTP acceptance does not prove inbox delivery." : "Promote published events with independently scheduled CSC notices."}
        isDemo={ctx.mode === "preview"}
      />
      {canPublishNotices ? <EventNoticeEditor isDemo={ctx.mode !== "live"} canPublish={canPublishNotices} canEditEvents={can(ctx, "events.update")} initialEventId={eventId} /> : null}
      {ctx.mode === "live" && can(ctx, "roles.manage") && <NotificationEmailCheck />}
      {ctx.mode === "live" && can(ctx, "roles.manage") && <NotificationRetry jobs={rows.filter(r=>["failed_retryable","failed_permanent"].includes(r.status)).map(r=>({id:r.id,type:r.type}))} />}
      {canDeliveryMonitor ? <DataTable
        rows={rows}
        columns={columns}
        facets={facets}
        searchKeys={["type", "recipient"]}
        emptyMessage={res?.ok ? "No notifications queued." : res && !res.ok ? res.error.message : "Notification delivery monitor is unavailable."}
      /> : null}
    </>
  );
}
