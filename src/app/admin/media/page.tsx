import { ImageIcon, Upload } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MediaUpload } from "@/components/admin/media-upload";
import { EmptyState } from "@/components/common/empty-state";
import { getAdminContext, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";

export const metadata = { title: "Media" };

function formatSize(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminMediaPage() {
  const ctx = await getAdminContext();
  const res = await adminServices.listMedia();
  const assets = res.ok ? res.data : [];

  return (
    <>
      <AdminPageHeader
        title="Media library"
        description="Manage branding, photos, logos and banners. Uploads validate type, size and dimensions before saving to scoped Supabase Storage."
        isDemo={ctx.mode === "preview"}

      />

      {can(ctx, "media.manage") ? <MediaUpload isDemo={ctx.mode === "preview"} /> : null}
      {assets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => (
            <div key={a.id} className="flex flex-col gap-3 rounded-2xl bg-brand-white p-4 ring-1 ring-brand-border">
              <div className="flex aspect-video items-center justify-center rounded-xl bg-brand-cloud">
                <ImageIcon className="size-8 text-brand-muted" aria-hidden />
              </div>
              <div className="flex flex-col gap-1">
                <p className="truncate text-sm font-medium text-brand-ink">{a.filename}</p>
                <p className="truncate text-xs text-brand-muted">{a.altText ?? "No alt text"}</p>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-brand-muted">
                  <span className="rounded-full bg-brand-cloud px-2 py-0.5">{a.category}</span>
                  <span className="rounded-full bg-brand-cloud px-2 py-0.5">{a.visibility}</span>
                  <span className="rounded-full bg-brand-cloud px-2 py-0.5">
                    {a.width && a.height ? `${a.width}×${a.height}` : a.type}
                  </span>
                  <span className="rounded-full bg-brand-cloud px-2 py-0.5">{formatSize(a.sizeBytes)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Upload} title="No media yet." description={res.ok ? "Upload branding, photos and banners to reuse across the site." : res.error.message} />
      )}
    </>
  );
}
