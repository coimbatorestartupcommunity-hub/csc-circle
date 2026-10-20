import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStartupLogoPath } from "@/lib/startups/media-paths";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ startupId: string }> }) {
  const { startupId } = await context.params;
  if (!uuidPattern.test(startupId)) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  const publicDb = createAnonClient();
  if (!publicDb) return new NextResponse(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  const { data: visible } = await publicDb.from("directory_startups").select("id").eq("id", startupId).eq("status", "published").maybeSingle();
  if (!visible) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });

  try {
    const admin = createAdminClient();
    const { data: startup } = await admin.from("directory_startups").select("user_id,logo_url").eq("id", startupId).eq("status", "published").maybeSingle();
    const userId = startup?.user_id;
    const path = startup?.logo_url ?? "";
    if (!userId || !uuidPattern.test(userId) || !isStartupLogoPath(path, userId, startupId)) {
      return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    const { data: image, error } = await admin.storage.from("member-portraits").download(path);
    if (error || !image) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    return new NextResponse(image, { headers: { "Content-Type": "image/webp", "Content-Length": String(image.size), "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline; filename=startup-logo.webp" } });
  } catch {
    return new NextResponse(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
