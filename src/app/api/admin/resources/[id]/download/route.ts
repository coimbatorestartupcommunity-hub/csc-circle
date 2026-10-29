import { can, getAdminContext } from "@/lib/admin/gate";
import { getResourceAdmin } from "@/lib/admin/cms";
import { createAdminClient } from "@/lib/supabase/admin";

const DOC_PATH = /^resource-docs\/[0-9a-f-]{36}\.pdf$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdminContext();
  if (context.mode !== "live" || !context.userId || !can(context, "content.manage")) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  const resource = await getResourceAdmin(id);
  if (!resource?.documentPath || !DOC_PATH.test(resource.documentPath) || resource.documentMime !== "application/pdf") return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  try {
    const filename = (resource.documentFilename || `${resource.slug}.pdf`).replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
    const { data, error } = await createAdminClient().storage.from("member-portraits").createSignedUrl(resource.documentPath, 60, { download: filename });
    if (error || !data?.signedUrl) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    return new Response(null, { status: 302, headers: { Location: data.signedUrl, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
}
