import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStartupDirectoryImagePath } from "@/lib/startups/media-paths";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    const { data: startup } = await adminDb.from("directory_startups").select("user_id,directory_image_path").eq("id", startupId).eq("status", "published").maybeSingle();
    if (!startup?.user_id) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    const { data: profile } = await adminDb.from("profiles").select("display_name,consent").eq("id", startup.user_id).maybeSingle();
    const consent = profile?.consent;
    if (!profile?.display_name || !consent || typeof consent !== "object" || Array.isArray(consent) || consent.directoryParticipation !== true || consent.displayNamePublicly !== true) {
      return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    // Startup directory photography is a distinct asset from a member's
    // identity portrait. Never silently substitute profile media here.
    const imagePath = startup.directory_image_path;
    if (!imagePath || !isStartupDirectoryImagePath(imagePath, startup.user_id, startupId)) {
      console.warn("CSC_DIRECTORY_IMAGE_UNAVAILABLE", { startupId, reason: "invalid_or_missing_startup_media_reference" });
      return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    const { data: image, error } = await adminDb.storage.from("member-portraits").download(imagePath);
    if (error || !image) {
      console.warn("CSC_DIRECTORY_IMAGE_UNAVAILABLE", { startupId, reason: "storage_object_unavailable", storageCode: error?.name ?? "not_found" });
      return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    return new NextResponse(image, { headers: { "Content-Type": "image/webp", "Content-Length": String(image.size), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline; filename=startup-directory.webp" } });
  } catch (error) {
    console.error("CSC_DIRECTORY_IMAGE_READ_FAILED", { startupId, reason: error instanceof Error ? error.name : "unknown" });
    return new NextResponse(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
