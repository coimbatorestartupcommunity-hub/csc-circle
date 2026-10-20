import { NextResponse } from "next/server";
import { getAdminContext, can } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function allowedPath(path: string, ownerId: string) {
  const [folder, filename, extra] = path.split("/");
  return folder === ownerId && !extra && !!filename && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-directory\.webp$/i.test(filename);
}

export async function GET(_request: Request, context: { params: Promise<{ startupId: string }> }) {
  const admin = await getAdminContext();
  if (admin.mode !== "live" || !can(admin, "directory.manage")) return new NextResponse(null, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  const { startupId } = await context.params;
  if (!uuidPattern.test(startupId)) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  try {
    const db = createAdminClient();
    const { data: startup } = await db.from("directory_startups").select("user_id,directory_image_path").eq("id", startupId).maybeSingle();
    if (!startup?.user_id) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const { data: profile } = await db.from("profiles").select("directory_photo_path").eq("id", startup.user_id).maybeSingle();
    const path = startup.directory_image_path || profile?.directory_photo_path;
    const validStartupImage = path === `${startup.user_id}/${startupId}-directory-startup.webp`;
    if (!path || (!validStartupImage && !allowedPath(path, startup.user_id))) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const { data, error } = await db.storage.from("member-portraits").download(path);
    if (error || !data) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    return new NextResponse(data, { headers: { "Content-Type": "image/webp", "Content-Length": String(data.size), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline; filename=founder-directory-review.webp" } });
  } catch {
    return new NextResponse(null, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
