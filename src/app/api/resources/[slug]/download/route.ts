import { createAdminClient } from "@/lib/supabase/admin";
import { getPublishedResource } from "@/lib/services/cms-public";

const DOC_PATH = /^resource-docs\/[0-9a-f-]{36}\.pdf$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const resource = await getPublishedResource(slug);
    if (!resource || !resource.documentPath || !DOC_PATH.test(resource.documentPath)) {
      return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    }
    const admin = createAdminClient();
    const safeName = (resource.documentFilename || `${resource.slug}.pdf`).replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
    const { data, error } = await admin.storage.from("member-portraits").createSignedUrl(resource.documentPath, 60, { download: safeName });
    if (error || !data?.signedUrl) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    return new Response(null, { status: 302, headers: { Location: data.signedUrl, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
