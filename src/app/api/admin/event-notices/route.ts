import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin/gate";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const schema = z.object({
  operation: z.enum(["save", "publish", "unpublish", "delete"]),
  id: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(100).optional(),
  message: z.string().trim().min(8).max(500).optional(),
  buttonLabel: z.string().trim().min(2).max(40).optional(),
  bannerPath: z.string().regex(/^event-banners\/[0-9a-f-]{36}\.webp$/i).nullable().optional(),
  startsAt: z.string().datetime({ offset: true }).nullable().optional(),
  stopsAt: z.string().datetime({ offset: true }).nullable().optional(),
  priority: z.number().int().min(0).max(1000).default(0),
});

function canManage(ctx: Awaited<ReturnType<typeof getAdminContext>>) {
  return ctx.mode === "live" && ctx.permissions.has("events.publish");
}

export async function GET() {
  try {
    const ctx = await getAdminContext();
    if (!canManage(ctx)) return authResponse({ error: "Permission denied." }, 403);
    const admin = createAdminClient() as unknown as SupabaseClient;
    const [eventsResult, noticesResult] = await Promise.all([
      admin.from("events").select("id,slug,title,status,starts_at,ends_at,venue,location,registration_state").order("starts_at", { ascending: true }),
      admin.from("event_notices").select("id,event_id,title,message,button_label,banner_path,status,visible_from,visible_until,display_priority,updated_at,deleted_at").is("deleted_at", null).order("updated_at", { ascending: false }),
    ]);
    if (eventsResult.error || noticesResult.error) return authResponse({ error: "Could not load events and event notices." }, 503);
    const events = (eventsResult.data ?? []).map((event: Record<string, unknown>) => ({
      id: String(event.id), slug: String(event.slug), title: String(event.title), status: String(event.status), startsAt: String(event.starts_at),
      endsAt: String(event.ends_at), venue: event.venue ? String(event.venue) : null, location: String(event.location ?? ""), registrationState: String(event.registration_state ?? "coming-soon"),
    }));
    const bucket = admin.storage.from("member-portraits");
    const notices = await Promise.all((noticesResult.data ?? []).map(async (notice: Record<string, unknown>) => {
      const event = events.find((candidate) => candidate.id === String(notice.event_id));
      const bannerPath = typeof notice.banner_path === "string" ? notice.banner_path : "";
      const { data: signed } = bannerPath ? await bucket.createSignedUrl(bannerPath, 3600) : { data: null };
      return {
        id: String(notice.id), eventId: String(notice.event_id), eventTitle: event?.title ?? "Unavailable event", eventStatus: event?.status ?? "unavailable",
        eventSlug: event?.slug ?? "", title: String(notice.title), message: String(notice.message), buttonLabel: String(notice.button_label), bannerPath,
        previewUrl: signed?.signedUrl ?? null, status: String(notice.status), startsAt: notice.visible_from ? String(notice.visible_from) : null,
        stopsAt: notice.visible_until ? String(notice.visible_until) : null, priority: Number(notice.display_priority ?? 0), updatedAt: String(notice.updated_at),
      };
    }));
    return authResponse({ events, notices });
  } catch {
    return authResponse({ error: "Event notice management is unavailable." }, 503);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (!canManage(ctx)) return authResponse({ error: "Permission denied." }, 403);
    const body = await readAuthBody(request);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return authResponse({ error: parsed.error.issues[0]?.message ?? "Invalid event notice." }, 422);
    const input = parsed.data;
    if (["save", "publish"].includes(input.operation) && (!input.eventId || !input.title || !input.message || !input.buttonLabel)) return authResponse({ error: "Select an event and complete the notice title, message and button label." }, 422);
    if (input.startsAt && input.stopsAt && Date.parse(input.startsAt) >= Date.parse(input.stopsAt)) return authResponse({ error: "Stop Showing must be later than Start Showing." }, 422);
    if (input.operation === "publish" && input.eventId) {
      const { data: event } = await createAdminClient().from("events").select("status").eq("id", input.eventId).maybeSingle();
      if (event?.status !== "published") return authResponse({ error: "Publish the linked event before publishing its notice." }, 422);
    }
    const db = await createClient() as unknown as SupabaseClient;
    const { data, error } = await db.rpc("csc_manage_event_notice", {
      operation: input.operation,
      notice_id: input.id,
      linked_event_id: input.eventId ?? null,
      notice_title: input.title ?? null,
      notice_message: input.message ?? null,
      notice_button_label: input.buttonLabel ?? null,
      notice_banner_path: input.bannerPath ?? null,
      starts_at: input.startsAt ?? null,
      stops_at: input.stopsAt ?? null,
      priority: input.priority,
    });
    if (error) {
      console.error("CSC_EVENT_NOTICE_MUTATION_FAILED", { code: error.code ?? "unknown" });
      if (error.code === "42501") return authResponse({ error: "Your administrator account cannot manage event notices." }, 403);
      if (error.code === "PGRST202" || error.code === "42883") return authResponse({ error: "Apply the latest CSC database migrations before managing event notices." }, 503);
      if (error.code === "P0002") return authResponse({ error: "The event notice could not be found." }, 404);
      return authResponse({ error: "The event notice was not saved. Verify the event and schedule." }, 409);
    }
    const result = data as { status?: string } | null;
    revalidateTag("event-notices", { expire: 0 });
    revalidateTag("events", { expire: 0 });
    revalidatePath("/events");
    return authResponse({ ok: true, status: result?.status ?? "unknown" });
  } catch {
    return authResponse({ error: "Event notice management is unavailable." }, 503);
  }
}
