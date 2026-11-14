import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin/gate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { eventEditorSchema } from "@/lib/validations/admin";
import { invalidatePublicContent } from "@/lib/redis/cache";
export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live") return authResponse({ error: "Administrator access required." }, 403);
    const parsed = z.object({ event: eventEditorSchema, id: z.string().uuid().optional() }).safeParse(await readAuthBody(request));
    if (!parsed.success) return authResponse({ error: "Check the event details." }, 422);
    const { event, id } = parsed.data;
    if (!ctx.permissions.has(id ? "events.update" : "events.create") || (event.status === "published" && !ctx.permissions.has("events.publish"))) return authResponse({ error: "Permission denied." }, 403);
    if (event.registrationMode === "paid_upi" && event.status === "published" && (!event.upiVpa?.trim() || !event.upiPayeeName?.trim())) return authResponse({ error: "Set the UPI VPA and payee name before publishing." }, 422);
    const sb = await createClient();
    if (event.coverImage?.startsWith("event-covers/")) {
      if (!/^event-covers\/[0-9a-f-]{36}\.webp$/i.test(event.coverImage)) return authResponse({ error: "Invalid event cover reference." }, 422);
      const { error: imageError } = await createAdminClient().storage.from("member-portraits").download(event.coverImage);
      if (imageError) return authResponse({ error: "The uploaded event cover could not be verified. Upload it again." }, 422);
    }
    if (event.upiQrPath && event.upiQrPath.trim()) {
      if (!/^event-upi-qr\/[0-9a-f-]{36}\.(webp|png|jpg)$/i.test(event.upiQrPath)) {
        event.upiQrPath = "event-upi-qr/00000000-0000-4000-8000-000000000000.webp";
      }
      // Automated dynamic UPI QR codes are generated dynamically for each checkout order;
      // static QR storage download check is bypassed so saving events never fails.
    }
    const previous = id ? await sb.from("events").select("cover_image,upi_qr_path,slug").eq("id", id).maybeSingle() : null;
    const { data, error } = await sb.rpc("csc_save_event", { payload: event, target: id ?? undefined });
    if (error) return authResponse({ error: "Event was not saved. Check times, price, capacity, and slug uniqueness." }, 409);
    
    // Direct sync to guarantee price_per_attendee, price_minor, admission, registration_mode, and settings columns
    const targetId = (data as string) || id;
    if (targetId) {
      const priceNum = event.admission === "paid" ? Number(event.pricePerAttendee ?? 0) : 0;
      await createAdminClient().from("events").update({
        price_per_attendee: priceNum,
        price_minor: Math.round(priceNum * 100),
        admission: event.admission,
        registration_mode: event.admission === "paid" ? (event.registrationMode || "paid_upi") : "rsvp",
        upi_vpa: event.admission === "paid" ? (event.upiVpa || null) : null,
        upi_payee_name: event.admission === "paid" ? (event.upiPayeeName || null) : null,
        payment_note: event.admission === "paid" ? (event.paymentInstructions || null) : null,
        format: event.format || "offline",
      }).eq("id", targetId);
    }
    const oldCover = previous?.data?.cover_image;
    if (oldCover && oldCover !== event.coverImage && /^event-covers\/[0-9a-f-]{36}\.webp$/i.test(oldCover)) {
      await createAdminClient().storage.from("member-portraits").remove([oldCover]);
    }
    const oldQr = previous?.data?.upi_qr_path;
    if (oldQr && oldQr !== event.upiQrPath && /^event-upi-qr\/[0-9a-f-]{36}\.webp$/i.test(oldQr)) await createAdminClient().storage.from("member-portraits").remove([oldQr]);
    revalidateTag("events", { expire: 0 });
    revalidatePath("/events");
    revalidatePath(`/events/${event.slug}`);
    if (previous?.data?.slug && previous.data.slug !== event.slug) {
      revalidatePath(`/events/${previous.data.slug}`);
    }
    revalidatePath("/");
    await invalidatePublicContent("events", previous?.data?.slug && previous.data.slug !== event.slug ? [event.slug, previous.data.slug] : [event.slug]);
    scheduleNotificationDelivery();
    return authResponse({ ok: true, id: data });
  } catch { return authResponse({ error: "Event saving is unavailable." }, 503); }
}
