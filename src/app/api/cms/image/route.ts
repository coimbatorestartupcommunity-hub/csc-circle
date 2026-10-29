import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const PATH = /^(resource-media|opportunity-media|updates-media)\/[0-9a-f-]{36}\.webp$/i;
const indiaToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

function anon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(request: Request) {
  try {
    const path = new URL(request.url).searchParams.get("path") ?? "";
    if (!PATH.test(path)) return new Response(null, { status: 404 });
    const db = anon();
    if (!db) return new Response(null, { status: 404 });

    // Anon reads are RLS-limited to published rows, so a hit proves the image
    // belongs to a published, publicly eligible record.
    let referenced = false;
    if (path.startsWith("resource-media/")) {
      const { data } = await db.from("resources").select("id").eq("cover_image_path", path).eq("publication_status", "published").limit(1);
      referenced = Boolean(data?.length);
    } else if (path.startsWith("updates-media/")) {
      const [{ data: covers }, { data: galleries }] = await Promise.all([
        db.from("community_updates").select("id").eq("cover_image_path", path).eq("publication_status", "published").limit(1),
        db.from("community_updates").select("id").contains("gallery", [{ path }]).eq("publication_status", "published").limit(1),
      ]);
      referenced = Boolean(covers?.length || galleries?.length);
    } else {
      const [{ data: banners }, { data: logos }] = await Promise.all([
        db.from("opportunities").select("id").eq("banner_path", path).eq("publication_status", "published").or(`deadline.is.null,deadline.gte.${indiaToday()}`).limit(1),
        db.from("opportunities").select("id").eq("org_logo_path", path).eq("publication_status", "published").or(`deadline.is.null,deadline.gte.${indiaToday()}`).limit(1),
      ]);
      referenced = Boolean(banners?.length || logos?.length);
    }
    if (!referenced) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });

    const admin = createAdminClient();
    const { data: image, error } = await admin.storage.from("member-portraits").download(path);
    if (error || !image) return new Response(null, { status: 404 });
    return new Response(await image.arrayBuffer(), {
      headers: { "Content-Type": "image/webp", "Content-Length": String(image.size), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
