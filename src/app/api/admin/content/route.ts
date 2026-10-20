import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin/gate";
import { createClient } from "@/lib/supabase/server";
import { authResponse, readAuthBody } from "@/lib/auth/http";
export async function POST(request: Request) {
  try {
    const ctx = await getAdminContext();
    if (ctx.mode !== "live" || !ctx.permissions.has("content.manage")) return authResponse({ error: "Permission denied." }, 403);
    const parsed = z.object({
      action: z.enum(["save", "publish", "unpublish", "delete"]),
      content_key: z.enum(["homepage.announcement", "community.introduction", "about.mission", "about.vision"]),
      content_value: z.string().max(4000).default(""),
      visible_from: z.union([z.string().datetime({ offset: true }), z.null()]).optional(),
      visible_until: z.union([z.string().datetime({ offset: true }), z.null()]).optional(),
    }).safeParse(await readAuthBody(request));
    if (!parsed.success) return authResponse({ error: "Invalid content." }, 422);
    const sb = await createClient();
    const { error } = await sb.rpc("csc_manage_content", parsed.data);
    if (error) {
      // Keep database details server-side; return an actionable permission message
      // without leaking SQL, row data, or other implementation details.
      console.error("CSC_CONTENT_SAVE_FAILED", { code: error.code ?? "unknown" });
      if (error.code === "42501") return authResponse({ error: "Your administrator account does not have permission to manage website content." }, 403);
      if (error.code === "PGRST202" || error.code === "42883") return authResponse({ error: "The content publishing database function is unavailable. Apply the latest CSC Supabase migrations, then try again." }, 503);
      return authResponse({ error: "Content could not be saved. Check the content and try again." }, 409);
    }
    revalidateTag("content", { expire: 0 });
    revalidatePath("/");
    if (parsed.data.content_key.startsWith("about.")) revalidatePath("/about");
    return authResponse({ ok: true, published: parsed.data.action === "publish", action: parsed.data.action });
  } catch { return authResponse({ error: "Content saving is unavailable." }, 503); }
}
