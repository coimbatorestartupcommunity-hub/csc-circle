import { z } from "zod";
import { getAdminContext, can } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !can(ctx, "registrations.read")) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const registrationId = new URL(request.url).searchParams.get("registration") ?? "";
    if (!z.string().uuid().safeParse(registrationId).success) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const admin = createAdminClient();
    const { data: record } = await admin.from("paid_event_registrations").select("payment_screenshot_path").eq("id", registrationId).maybeSingle();
    if (!record?.payment_screenshot_path || !/^payment-proofs\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/i.test(record.payment_screenshot_path)) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const { data, error } = await admin.storage.from("payment-proofs").createSignedUrl(record.payment_screenshot_path, 60);
    return data?.signedUrl && !error ? Response.redirect(data.signedUrl, 302) : new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  } catch { return new Response(null, { status: 503, headers: { "Cache-Control": "private, no-store" } }); }
}
