import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminContext } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { invalidatePublicContent } from "@/lib/redis/cache";
import type { PublicCacheFeature } from "@/lib/redis/config";

const schema = z.object({
  kind: z.enum([
    "event",
    "notice",
    "update",
    "collaboration",
    "opportunity",
    "resource",
    "content",
    "announcement",
    "home_announcement",
  ]),
  id: z.string().min(1),
  slug: z.string().optional(),
});

export async function POST(request: Request) {
  const context = await getAdminContext();
  const parsed = schema.safeParse(await readAuthBody(request));
  if (!parsed.success) {
    return authResponse({ error: "Invalid delete request parameters." }, 422);
  }

  // Strictly enforce: ONLY Super Admin can delete items entirely
  const isSuperAdmin =
    context.mode === "preview" || context.roles.includes("super_admin");
  if (!isSuperAdmin) {
    return authResponse(
      { error: "Forbidden. Only Super Admin has authority to permanently delete items." },
      403,
    );
  }

  const { kind, id, slug } = parsed.data;
  const admin = createAdminClient() as unknown as SupabaseClient;
  const pathsToRevalidate: string[] = ["/", "/admin"];
  const cacheTagsToRevalidate: string[] = [];
  const redisInvalidations: { feature: PublicCacheFeature; keys?: string[] }[] = [];

  try {
    if (kind === "event") {
      // 1. Fetch event slug and associated IDs for cleanup
      const { data: eventData } = await admin
        .from("events")
        .select("id, slug, cover_image, upi_qr_path")
        .eq("id", id)
        .maybeSingle();

      const eventSlug = slug || eventData?.slug;

      // 2. Cascade delete dependent child records
      try {
        await admin.from("event_checkin_challenges").delete().eq("event_id", id);
      } catch {
        // Ignored if table not linked
      }
      try {
        await admin.from("event_join_sessions").delete().eq("event_id", id);
      } catch {
        // Ignored
      }
      try {
        await admin.from("attendance_checkins").delete().eq("event_id", id);
      } catch {
        // Ignored
      }
      try {
        await admin.from("event_notices").delete().eq("event_id", id);
      } catch {
        // Ignored
      }
      try {
        await admin.from("community_updates").delete().eq("related_event_id", id);
      } catch {
        // Ignored
      }
      try {
        await admin.from("event_attendees").delete().eq("event_id", id);
      } catch {
        // Ignored
      }
      try {
        await admin.from("event_registrations").delete().eq("event_id", id);
      } catch {
        // Ignored
      }

      // 3. Delete the event record itself
      const { error: deleteError } = await admin.from("events").delete().eq("id", id);
      if (deleteError) {
        throw new Error(`Failed to delete event: ${deleteError.message}`);
      }

      pathsToRevalidate.push("/events", "/admin/events");
      if (eventSlug) {
        pathsToRevalidate.push(`/events/${eventSlug}`);
        redisInvalidations.push({ feature: "events", keys: [eventSlug] });
      }
      cacheTagsToRevalidate.push("events");
      redisInvalidations.push({ feature: "events" });

    } else if (kind === "notice") {
      const { error } = await admin.from("event_notices").delete().eq("id", id);
      if (error) throw new Error(`Failed to delete notice: ${error.message}`);

      pathsToRevalidate.push("/events", "/admin/event-notices");
      cacheTagsToRevalidate.push("events", "notices");

    } else if (kind === "update") {
      const { data: existing } = await admin
        .from("community_updates")
        .select("slug")
        .eq("id", id)
        .maybeSingle();

      const { error } = await admin.from("community_updates").delete().eq("id", id);
      if (error) throw new Error(`Failed to delete update: ${error.message}`);

      pathsToRevalidate.push("/updates", "/admin/updates");
      if (existing?.slug) pathsToRevalidate.push(`/updates/${existing.slug}`);
      cacheTagsToRevalidate.push("updates");
      redisInvalidations.push({ feature: "updates", keys: existing?.slug ? [existing.slug] : undefined });

    } else if (kind === "collaboration") {
      const { data: existing } = await admin
        .from("collaborations")
        .select("slug")
        .eq("id", id)
        .maybeSingle();

      const { error } = await admin.from("collaborations").delete().eq("id", id);
      if (error) throw new Error(`Failed to delete collaboration: ${error.message}`);

      pathsToRevalidate.push("/collaborations", "/admin/collaborations");
      if (existing?.slug) pathsToRevalidate.push(`/collaborations/${existing.slug}`);
      cacheTagsToRevalidate.push("collaborations");
      redisInvalidations.push({ feature: "collaborations", keys: existing?.slug ? [existing.slug] : undefined });

    } else if (kind === "announcement" || kind === "home_announcement") {
      // Clear or remove homepage announcement block
      try {
        await admin.from("content_blocks").delete().eq("key", "homepage.announcement");
      } catch {
        // Fallback update
        await admin
          .from("content_blocks")
          .update({ value: "", status: "archived", deleted_at: new Date().toISOString() })
          .eq("key", "homepage.announcement");
      }
      pathsToRevalidate.push("/", "/admin/content");
      cacheTagsToRevalidate.push("content");
      redisInvalidations.push({ feature: "updates" });

    } else if (kind === "content") {
      // Delete specific content block by key or id
      const { error } = await admin
        .from("content_blocks")
        .delete()
        .or(`key.eq.${id},id.eq.${id}`);
      if (error) throw new Error(`Failed to delete content: ${error.message}`);

      pathsToRevalidate.push("/", "/admin/content");
      cacheTagsToRevalidate.push("content");
      redisInvalidations.push({ feature: "updates" });

    } else if (kind === "resource") {
      const { error } = await admin.from("resources").delete().eq("id", id);
      if (error) throw new Error(`Failed to delete resource: ${error.message}`);

      pathsToRevalidate.push("/resources", "/admin/resources");
      cacheTagsToRevalidate.push("resources");
      redisInvalidations.push({ feature: "resources" });

    } else if (kind === "opportunity") {
      const { error } = await admin.from("opportunities").delete().eq("id", id);
      if (error) throw new Error(`Failed to delete opportunity: ${error.message}`);

      pathsToRevalidate.push("/opportunities", "/admin/opportunities");
      cacheTagsToRevalidate.push("opportunities");
      redisInvalidations.push({ feature: "opportunities" });
    }

    // Audit the high-privilege deletion
    try {
      await admin.from("audit_logs").insert({
        action: `admin.${kind}.permanently_deleted`,
        actor_id: context.userId ?? "preview-super-admin",
        actor_role: "super_admin",
        target_type: kind,
        target_id: id,
        after: { deletedAt: new Date().toISOString() },
      });
    } catch {
      // Audit table might not enforce constraints in dev
    }

    // Invalidate next/cache and Redis public caches
    for (const tag of cacheTagsToRevalidate) {
      try {
        revalidateTag(tag, { expire: 0 });
      } catch {
        // Safe fallback
      }
    }
    for (const p of pathsToRevalidate) {
      try {
        revalidatePath(p);
      } catch {
        // Safe fallback
      }
    }
    for (const inv of redisInvalidations) {
      try {
        await invalidatePublicContent(inv.feature, inv.keys);
      } catch {
        // Non-fatal if Redis offline
      }
    }

    return authResponse({ ok: true, deleted: { kind, id } });
  } catch (error) {
    return authResponse(
      { error: error instanceof Error ? error.message : "Deletion failed." },
      500,
    );
  }
}
