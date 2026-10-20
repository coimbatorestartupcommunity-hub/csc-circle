import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { createAdminClient } from "@/lib/supabase/admin";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function allowedPath(path: string, userId: string) {
  const escapedUserId = userId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escapedUserId}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-directory\\.webp$`, "i").test(path);
}

export async function GET(_request: Request, context: { params: Promise<{ startupId: string }> }) {
  const { startupId } = await context.params;
  if (!uuidPattern.test(startupId)) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });

  // The anonymous RLS check ensures the listing is published and currently
  // consented before the trusted server reads its private Storage object.
  const publicDb = createAnonClient();
  if (!publicDb) return new NextResponse(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  const { data: visibleStartup } = await publicDb.from("directory_startups").select("id").eq("id", startupId).eq("status", "published").maybeSingle();
  if (!visibleStartup) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });

  try {
    const adminDb = createAdminClient();
    const { data: startup } = await adminDb.from("directory_startups").select("user_id").eq("id", startupId).eq("status", "published").maybeSingle();
    if (!startup?.user_id) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    const { data: profile } = await adminDb.from("profiles").select("directory_photo_path,portrait_path,display_name,consent").eq("id", startup.user_id).maybeSingle();
    const consent = profile?.consent;
    if (!profile?.portrait_path || !profile.directory_photo_path || !profile.display_name || !consent || typeof consent !== "object" || Array.isArray(consent) || consent.directoryParticipation !== true || consent.displayNamePublicly !== true || consent.displayPhotoPublicly !== true) {
      return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    if (!allowedPath(profile.directory_photo_path, startup.user_id)) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    const { data: image, error } = await adminDb.storage.from("member-portraits").download(profile.directory_photo_path);
    if (error || !image) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    return new NextResponse(image, { headers: { "Content-Type": "image/webp", "Content-Length": String(image.size), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline; filename=founder-directory.webp" } });
  } catch {
    return new NextResponse(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
