import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminContext, can } from "@/lib/admin/gate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { invalidatePublicContent } from "@/lib/redis/cache";
import type { PublicCacheFeature } from "@/lib/redis/config";

const schema = z.object({
  kind: z.enum(["event", "notice", "update", "collaboration", "opportunity", "resource"]),
  id: z.string().uuid(),
});

export async function POST(request: Request) {
  const context = await getAdminContext();
  const parsed = schema.safeParse(await readAuthBody(request));
  if (!parsed.success) return authResponse({ error: "Invalid completion request." }, 422);

  const isEventOrNotice = ["event", "notice"].includes(parsed.data.kind);
  if (
    context.mode !== "live" ||
    !can(context, isEventOrNotice ? "events.publish" : "content.manage")
  ) {
    return authResponse({ error: "Permission denied." }, 403);
  }

  const { kind, id } = parsed.data;
  const db = await createClient();
  const admin = createAdminClient() as unknown as SupabaseClient;

  // Try RPC first
  const result = await db.rpc("csc_complete_content", {
    content_kind: kind,
    target: id,
  });

  if (result.error) {
    // Direct administrative fallback
    try {
      if (kind === "event") {
        await admin
          .from("events")
          .update({
            settings: { completed: true },
            registration_state: "completed",
            status: "published",
          })
          .eq("id", id);
        await admin
          .from("event_notices")
          .update({
            completed_at: new Date().toISOString(),
            visible_until: null,
          })
          .eq("event_id", id);
        await admin
          .from("community_updates")
          .update({
            completed_at: new Date().toISOString(),
          })
          .eq("related_event_id", id);
      } else if (kind === "notice") {
        await admin
          .from("event_notices")
          .update({
            completed_at: new Date().toISOString(),
            visible_until: null,
          })
          .eq("id", id);
      } else if (kind === "update") {
        await admin
          .from("community_updates")
          .update({
            completed_at: new Date().toISOString(),
          })
          .eq("id", id);
      } else if (kind === "collaboration") {
        await admin
          .from("collaborations")
          .update({
            status: "completed",
            publication_status: "published",
          })
          .eq("id", id);
      } else if (kind === "opportunity") {
        await admin
          .from("opportunities")
          .update({
            completed_at: new Date().toISOString(),
          })
          .eq("id", id);
      } else if (kind === "resource") {
        await admin
          .from("resources")
          .update({
            completed_at: new Date().toISOString(),
          })
          .eq("id", id);
      }
    } catch {
      return authResponse({ error: "Could not mark content completed." }, 500);
    }
  }

  for (const tag of ["events", "collaborations", "updates", "event-notices", "opportunities", "resources"]) {
    revalidateTag(tag, { expire: 0 });
  }
  revalidatePath("/", "layout");
  revalidatePath("/events");
  revalidatePath("/collaborations");
  revalidatePath("/updates");
  revalidatePath("/opportunities");
  revalidatePath("/resources");
  const featureForKind: Record<string, PublicCacheFeature> = {
    event: "events",
    notice: "events",
    update: "updates",
    collaboration: "collaborations",
    opportunity: "opportunities",
    resource: "resources",
  };
  const feature = featureForKind[kind];
  if (feature) await invalidatePublicContent(feature);
  return authResponse({ ok: true });
}
