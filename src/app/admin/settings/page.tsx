import { Check } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ActionButton } from "@/components/admin/action-button";
import { getAdminContext, can } from "@/lib/admin/gate";
import {
  ALL_PERMISSIONS,
  roleHasPermission,
  roleLabels,
  permissionLabels,
  rolePermissions,
  type AdminRole,
} from "@/lib/admin/permissions";
import { siteConfig } from "@/lib/content/site";

export const metadata = { title: "Settings" };

const roles = Object.keys(rolePermissions) as AdminRole[];

export default async function AdminSettingsPage() {
  const ctx = await getAdminContext();
  const canManage = can(ctx, "settings.manage");

  return (
    <>
      <AdminPageHeader
        title="Settings & roles"
        description="Organisation details, membership policy, and the role-permission matrix."
        isDemo={ctx.mode === "preview"}
      />

      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3 rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border">
          <h2 className="text-sm font-semibold text-brand-ink">Organisation</h2>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Field label="Name" value={siteConfig.legalName} />
            <Field label="Established" value={String(siteConfig.established)} />
            <Field label="Email" value={siteConfig.social.email} />
            <Field label="City" value={`${siteConfig.city}, ${siteConfig.region}`} />
            <Field label="Member ID format" value="CSC-2026-000000" mono />
            <Field label="Timezone" value={siteConfig.timezone} />
          </dl>
          {canManage ? <div className="pt-2"><ActionButton label="Edit organisation settings" /></div> : null}
        </section>

        <section className="flex flex-col gap-3 rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-brand-ink">Role & permission matrix</h2>
            {can(ctx, "roles.manage") ? (
              <ActionButton label="Assign role" message="Role assignment requires a verified identity + privileged server-side operation (Phase 1). Never granted from the UI alone." variant="default" />
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-brand-border text-left">
                  <th className="px-3 py-2 text-xs font-semibold tracking-wide text-brand-muted uppercase">Permission</th>
                  {roles.map((r) => (
                    <th key={r} className="px-3 py-2 text-center text-[10px] font-semibold tracking-wide text-brand-muted uppercase">
                      {roleLabels[r].replace(" ", "\n")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_PERMISSIONS.map((p) => (
                  <tr key={p} className="border-b border-brand-border/60 last:border-0">
                    <td className="px-3 py-2 text-brand-ink">{permissionLabels[p]}</td>
                    {roles.map((r) => (
                      <td key={r} className="px-3 py-2 text-center">
                        {roleHasPermission(r, p) ? (
                          <Check className="mx-auto size-4 text-green-600" aria-label="granted" />
                        ) : (
                          <span className="text-brand-border" aria-label="not granted">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-brand-muted">
            The backend independently enforces every permission via Supabase RLS
            and privileged operations. A matching email is never authority.
          </p>
        </section>
      </div>
    </>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs tracking-wide text-brand-muted uppercase">{label}</dt>
      <dd className={mono ? "font-mono text-xs text-brand-ink" : "text-brand-ink"}>{value}</dd>
    </div>
  );
}
