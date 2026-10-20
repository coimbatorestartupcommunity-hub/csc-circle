import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin/gate";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";

const schema = z.object({
  revisionId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().trim().max(1000).default(""),
});

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return authResponse({ error: "Request origin could not be verified." }, 403);
  }

  const ctx = await getAdminContext();
  if (ctx.mode !== "live" || !ctx.permissions.has("directory.manage")) {
    return authResponse({ error: "Startup review permission is required." }, 403);
  }
  if (!rateLimit(`startup-revision:${ctx.userId}:${clientIp(request)}`, 20, 60_000).allowed) {
    return authResponse({ error: "Too many review actions. Try again shortly." }, 429);
  }

  const parsed = schema.safeParse(await readAuthBody(request));
  if (!parsed.success) return authResponse({ error: parsed.error.issues[0]?.message ?? "Invalid review action." }, 422);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("review_startup_revision", {
    p_revision_id: parsed.data.revisionId,
    p_decision: parsed.data.decision,
    p_reason: parsed.data.reason,
  });

  if (error) {
    if (error.code === "42501") return authResponse({ error: "Your account cannot review startup changes." }, 403);
    if (error.code === "P0002") return authResponse({ error: "This revision is no longer awaiting review." }, 404);
    if (error.code === "40001") return authResponse({ error: "The startup changed after this revision was submitted. Ask the owner to submit the latest changes again." }, 409);
    if (error.code === "22023") return authResponse({ error: "A rejection reason of at least five characters is required." }, 422);
    console.error("CSC_STARTUP_REVISION_REVIEW_FAILED", { code: error.code ?? "unknown" });
    return authResponse({ error: "The startup revision could not be reviewed. Refresh and try again." }, 409);
  }

  revalidateTag("directory", { expire: 0 });
  revalidatePath("/directory");
  revalidatePath("/admin/startups/revisions");
  revalidatePath("/member/startups");
  scheduleNotificationDelivery();
  return authResponse({ ok: true, result: data });
}
