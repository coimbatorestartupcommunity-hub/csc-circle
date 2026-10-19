import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type Facet } from "@/components/admin/data-table";
import { getAdminContext } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";

export const metadata = { title: "Notifications" };

const columns: Column[] = [
  { key: "type", header: "Event type", type: "mono" },
  { key: "channel", header: "Channel", type: "badge" },
  { key: "recipient", header: "Recipient" },
  { key: "status", header: "Status", type: "statusNotification", sortable: true },
  { key: "createdAt", header: "Created", type: "date", sortable: true },
  { key: "sentAt", header: "Sent", type: "date" },
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
      { label: "Failed", value: "failed" },
      { label: "Retrying", value: "retrying" },
    ],
  },
];

export default async function AdminNotificationsPage() {
  const ctx = await getAdminContext();
  const res = await adminServices.listNotifications();
  const rows = res.ok ? res.data : [];

  return (
    <>
      <AdminPageHeader
        title="Notifications"
        description="Outbox for in-app, email and WhatsApp notifications. Queued from committed business events; no messages are sent until the provider + consent are configured."
        isDemo={ctx.mode === "preview"}
      />
      <DataTable
        rows={rows}
        columns={columns}
        facets={facets}
        searchKeys={["type", "recipient"]}
        emptyMessage={res.ok ? "No notifications queued." : res.error.message}
      />
    </>
  );
}
