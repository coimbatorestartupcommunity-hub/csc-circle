import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { can, getAdminContext } from "@/lib/admin/gate";
import { saveCommunityUpdate, setCommunityUpdateStatus } from "@/lib/admin/cms";
import { communityUpdateSaveSchema } from "@/lib/validations/cms";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildEventNoticeContent, buildEventUpdateContent } from "@/lib/events/publish-surfaces";
import { sanitizeEventBanner } from "@/lib/media/images";
import type { SupabaseClient } from "@supabase/supabase-js";

const EVENT_COVER = /^event-covers\/[0-9a-f-]{36}\.webp$/i;
const PUBLIC_BASE = "https://csc.logicintelligencetechnologies.in";

/**
 * Publication is idempotent: saving a published event again refreshes its linked
 * notice and Update from the authoritative event row. The request requires an
 * explicit editor confirmation because Updates carry a publication consent flag.
 */
export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const ctx = await getAdminContext();
  if (ctx.mode !== "live" || !ctx.userId || !can(ctx, "events.publish") || !can(ctx, "content.manage")) {
    return NextResponse.json({ error: "Event publication and Updates permissions are required." }, { status: 403 });
  }
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  const body = await request.json().catch(() => null) as { publicationConsent?: unknown } | null;
  if (body?.publicationConsent !== true) return NextResponse.json({ error: "Confirm permission to publish this event on the Updates surface." }, { status: 422 });
  const { eventId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const admin = createAdminClient() as unknown as SupabaseClient;
  const { data: event, error: eventError } = await admin.from("events").select("id,slug,title,summary,description,starts_at,ends_at,venue,location,cover_image,status,admission,registration_mode,upi_vpa,upi_payee_name,upi_qr_path").eq("id", eventId).maybeSingle();
  if (eventError || !event) return NextResponse.json({ error: "The event could not be loaded." }, { status: 404 });
  if (event.status !== "published") return NextResponse.json({ error: "Save the event as published first." }, { status: 409 });
  if (event.registration_mode === "paid_upi" && (!event.upi_vpa || !event.upi_payee_name || !event.upi_qr_path)) return NextResponse.json({ error: "Set the UPI VPA, payee name and QR before publication." }, { status: 422 });
  const storage = admin.storage.from("member-portraits");
  let bytes: Buffer | null = null;
  const coverPath = String(event.cover_image ?? "");
  if (EVENT_COVER.test(coverPath)) {
    const { data: cover, error: coverError } = await storage.download(coverPath);
    if (coverError || !cover) return NextResponse.json({ error: "The uploaded event cover could not be read." }, { status: 422 });
    bytes = Buffer.from(await cover.arrayBuffer());
  } else if (/^\/events\/[a-z0-9][a-z0-9-]*\.(?:jpg|jpeg|png|webp)$/i.test(coverPath)) {
    try {
      const mime = /\.png$/i.test(coverPath) ? "image/png" : /\.webp$/i.test(coverPath) ? "image/webp" : "image/jpeg";
      const normalized = await sanitizeEventBanner(await readFile(join(process.cwd(), "public", coverPath.slice(1))), mime);
      bytes = normalized.data;
    } catch { return NextResponse.json({ error: "The local event cover could not be prepared as a 4:3 banner." }, { status: 422 }); }
  }
  const [{ data: existingNotice, error: noticeLookupError }, updateLookup] = await Promise.all([
    admin.from("event_notices").select("id,banner_path").eq("event_id", eventId).is("deleted_at", null).maybeSingle(),
    admin.from("community_updates").select("id,cover_image_path").eq("related_event_id", eventId).maybeSingle(),
  ]);
  if (noticeLookupError) return NextResponse.json({ error: "The event notice could not be checked." }, { status: 503 });
  if (updateLookup.error) return NextResponse.json({ error: "The linked Update could not be checked." }, { status: 503 });
  const noticeBanner = /^event-banners\/[0-9a-f-]{36}\.webp$/i.test(String(existingNotice?.banner_path ?? "")) ? String(existingNotice?.banner_path) : bytes ? `event-banners/${randomUUID()}.webp` : null;
  const updateCover = /^updates-media\/[0-9a-f-]{36}\.webp$/i.test(String(updateLookup.data?.cover_image_path ?? "")) ? String(updateLookup.data?.cover_image_path) : bytes ? `updates-media/${randomUUID()}.webp` : null;
  const freshPaths = [existingNotice?.banner_path === noticeBanner ? null : noticeBanner, updateLookup.data?.cover_image_path === updateCover ? null : updateCover].filter((path): path is string => Boolean(path));
  const uploads = bytes ? await Promise.all(freshPaths.map((path) => storage.upload(path, bytes, { contentType: "image/webp", cacheControl: "3600", upsert: false }))) : [];
  if (uploads.some(({ error }) => error)) {
    await storage.remove(freshPaths);
    return NextResponse.json({ error: "Event media could not be prepared for the public surfaces." }, { status: 503 });
  }

  const db = await createClient() as unknown as SupabaseClient;
  const noticeId = String(existingNotice?.id ?? randomUUID());
  const description = String(event.description ?? event.summary ?? "").trim();
  const noticeContent = buildEventNoticeContent({ title: String(event.title), summary: String(event.summary ?? ""), description });
  const { error: noticeError } = await db.rpc("csc_manage_event_notice", {
    operation: "publish", notice_id: noticeId, linked_event_id: eventId,
    notice_title: noticeContent.title,
    notice_message: noticeContent.message,
    notice_button_label: noticeContent.buttonLabel, notice_banner_path: noticeBanner,
    starts_at: new Date().toISOString(), stops_at: String(event.ends_at), priority: 900,
  });
  if (noticeError) {
    await storage.remove(freshPaths);
    return NextResponse.json({ error: "The linked Event Notice could not be published." }, { status: 409 });
  }

  const eventUrl = `${PUBLIC_BASE}/events/${event.slug}`;
  const updateContent = buildEventUpdateContent({
    title: String(event.title), slug: String(event.slug), summary: String(event.summary ?? ""), description,
    startsAt: String(event.starts_at), venue: event.venue ? String(event.venue) : null, location: event.location ? String(event.location) : null,
  }, eventUrl);
  const saveInput = communityUpdateSaveSchema.safeParse({
    id: updateLookup.data?.id ?? null,
    slug: updateContent.slug,
    title: updateContent.title,
    category: "Announcements",
    summary: updateContent.summary,
    body: updateContent.body,
    featured: true,
    coverImagePath: updateCover ?? "",
    coverImageAlt: updateCover ? `${event.title} event banner` : "",
    gallery: [], author: "Coimbatore Startup Community", source: eventUrl,
    publicationConsent: true, relatedEventId: eventId, relatedCollaborationId: null,
    seoTitle: updateContent.title, metaDescription: updateContent.summary.slice(0, 300),
  });
  if (!saveInput.success) return NextResponse.json({ error: "Event content could not be prepared for the Updates surface." }, { status: 422 });
  const saved = await saveCommunityUpdate(saveInput.data, ctx.userId);
  if ("error" in saved) return NextResponse.json({ error: saved.error }, { status: 409 });
  const published = await setCommunityUpdateStatus(saved.id, "publish", ctx.userId);
  if ("error" in published) return NextResponse.json({ error: published.error }, { status: 409 });

  revalidateTag("event-notices", { expire: 0 });
  revalidateTag("events", { expire: 0 });
  revalidatePath("/events");
  revalidatePath("/");
  revalidatePath("/updates");
  revalidatePath(`/updates/${saved.slug}`);
  return NextResponse.json({ ok: true, eventUrl, noticeStatus: "published", updateUrl: `/updates/${saved.slug}` });
}
