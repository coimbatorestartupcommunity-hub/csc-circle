import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const admin = createAdminClient();
    const { data: event } = await admin.from("events").select("status,upi_qr_path").eq("id", eventId).maybeSingle();
    if (!event || event.status !== "published" || !event.upi_qr_path || !/^event-upi-qr\/[0-9a-f-]{36}\.webp$/i.test(event.upi_qr_path)) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const { data, error } = await admin.storage.from("member-portraits").download(event.upi_qr_path);
    if (error || !data) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    return new Response(await data.arrayBuffer(), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=300, stale-while-revalidate=3600", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response(null, { status: 503, headers: { "Cache-Control": "private, no-store" } }); }
}
