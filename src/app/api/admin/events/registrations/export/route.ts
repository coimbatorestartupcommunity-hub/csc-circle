import { z } from "zod";
import { getAdminContext, can } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";

const csvCell = (value: unknown) => {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};

export async function GET(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !can(ctx, "registrations.read")) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const eventId = new URL(request.url).searchParams.get("event") ?? "";
    if (!z.string().uuid().safeParse(eventId).success) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const { data, error } = await createAdminClient().from("paid_event_registrations").select("created_at,full_name,email,whatsapp,organization,role,attendee_count,additional_attendee_names,referral_source,dietary_accessibility_notes,total_amount_paid,upi_transaction_ref,status,review_note").eq("event_id", eventId).order("created_at", { ascending: true });
    if (error) return new Response("Export unavailable", { status: 503 });
    const headers = ["Submitted", "Full name", "Email", "WhatsApp", "Organization", "Role", "Attendees", "Additional names", "Referral", "Dietary or accessibility notes", "Amount paid", "UPI reference", "Status", "Review note"];
    const rows = (data ?? []).map((row) => [row.created_at,row.full_name,row.email,row.whatsapp,row.organization,row.role,row.attendee_count,row.additional_attendee_names,row.referral_source,row.dietary_accessibility_notes,row.total_amount_paid,row.upi_transaction_ref,row.status,row.review_note].map(csvCell).join(","));
    return new Response([headers.map(csvCell).join(","), ...rows].join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="paid-event-registrations.csv"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response(null, { status: 503, headers: { "Cache-Control": "private, no-store" } }); }
}
