import type { Metadata } from "next";
import { FlaskConical } from "lucide-react";
import { getAdminContext } from "@/lib/admin/gate";
import { roleLabels } from "@/lib/admin/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · CSC Admin" },
  robots: { index: false, follow: false },
};

// Reads the session + admin roles on every request, so it blocks server-side.
export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAdminContext();

  if (ctx.mode === "closed") return <AdminUnavailable />;
  if (ctx.mode === "forbidden") return <AdminUnavailable forbidden />;

  const roleLabel =
    ctx.mode === "preview"
      ? "Demo Super Admin"
      : ctx.roles.map((r) => roleLabels[r]).join(", ") || "Administrator";

  return (
    <div>
      {ctx.mode === "preview" ? (
        <div className="flex items-center justify-center gap-2 bg-brand-gold px-4 py-1.5 text-center text-xs font-medium text-brand-ink">
          <FlaskConical className="size-3.5" aria-hidden />
          DEMO admin preview — sample data only. No action here affects real CSC
          records. Fails closed in production.
        </div>
      ) : null}
      <AdminShell
        displayName={ctx.displayName}
        roleLabel={roleLabel}
        permissions={[...ctx.permissions]}
      >
        {children}
      </AdminShell>
    </div>
  );
}
