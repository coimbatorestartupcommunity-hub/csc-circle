import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminContext, can } from "@/lib/admin/gate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authResponse, readAuthBody } from "@/lib/auth/http";

const schema = z.object({
  kind: z.enum(["event", "notice", "update", "collaboration"]),
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
      }
    } catch {
      return authResponse({ error: "Could not mark content completed." }, 500);
    }
  }

  for (const tag of ["events", "collaborations", "updates", "event-notices"]) {
    revalidateTag(tag, { expire: 0 });
  }
  revalidatePath("/", "layout");
  return authResponse({ ok: true });
}
