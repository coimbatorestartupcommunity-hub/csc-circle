import { Check } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdminPagePermission } from "@/lib/admin/gate";
import {
  ALL_PERMISSIONS,
  roleHasPermission,
  roleLabels,
  permissionLabels,
  rolePermissions,
  type AdminRole,
} from "@/lib/admin/permissions";
import { siteConfig } from "@/lib/content/site";
import { can } from "@/lib/admin/gate";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";

export const metadata = { title: "Settings" };

const roles = Object.keys(rolePermissions) as AdminRole[];

/** Admin workspaces grouped by the permission that governs access to each. */
const workspaceAccess: { permission: (typeof ALL_PERMISSIONS)[number]; sections: string[] }[] = [
  { permission: "content.manage", sections: ["Website Content", "Updates & Highlights", "Resources", "Opportunities", "Collaborations"] },
  { permission: "members.read", sections: ["Members"] },
  { permission: "members.approve", sections: ["Membership Claims"] },
  { permission: "directory.manage", sections: ["Founder Directory", "Startup Revisions"] },
  { permission: "events.update", sections: ["Events"] },
  { permission: "registrations.read", sections: ["Registrations", "Attendance Records"] },
  { permission: "attendance.scan", sections: ["Event Check-In"] },
  { permission: "payments.verify", sections: ["Payments"] },
  { permission: "reviews.moderate", sections: ["Reviews"] },
  { permission: "audit.read", sections: ["Audit Logs"] },
  { permission: "settings.manage", sections: ["Settings"] },
  { permission: "roles.manage", sections: ["Roles & Invitations"] },
];

/** Human-readable list of the roles that currently hold a permission. */
function rolesWith(permission: (typeof ALL_PERMISSIONS)[number]): string {
  return roles.filter((r) => roleHasPermission(r, permission)).map((r) => roleLabels[r]).join(", ");
}

export default async function AdminSettingsPage() {
  const ctx = await requireAdminPagePermission("settings.manage");
  if (!can(ctx, "settings.manage")) return <AdminUnavailable forbidden />;

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
        </section>

        <section className="flex flex-col gap-3 rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-brand-ink">Role & permission matrix</h2>
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

        <section className="flex flex-col gap-3 rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border">
          <h2 className="text-sm font-semibold text-brand-ink">Workspace access by section</h2>
          <p className="text-sm leading-relaxed text-brand-secondary">
            Each admin workspace is governed by one permission. The public{" "}
            <strong className="font-semibold text-brand-ink">Updates &amp; Highlights</strong>,{" "}
            <strong className="font-semibold text-brand-ink">Resources</strong>, and{" "}
            <strong className="font-semibold text-brand-ink">Opportunities</strong> sections are all
            governed by the single <span className="font-mono text-xs">content.manage</span> permission —
            roles that hold it can create, edit, publish, and unpublish those items, and publishing is what
            makes content appear on the public site.
          </p>
          {/* Mobile card view */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {workspaceAccess.map((row) => (
              <div key={row.permission} className="flex flex-col gap-1.5 rounded-xl border border-brand-border bg-white p-3.5 text-xs shadow-2xs">
                <span className="font-semibold text-brand-ink">{row.sections.join(", ")}</span>
                <div className="flex items-center justify-between border-t border-brand-border/60 pt-1.5">
                  <span className="font-mono text-[11px] text-brand-muted">{row.permission}</span>
                  <span className="text-brand-secondary font-medium">{rolesWith(row.permission)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-brand-border text-left">
                  <th className="px-3 py-2 text-xs font-semibold tracking-wide text-brand-muted uppercase">Admin section</th>
                  <th className="px-3 py-2 text-xs font-semibold tracking-wide text-brand-muted uppercase">Governing permission</th>
                  <th className="px-3 py-2 text-xs font-semibold tracking-wide text-brand-muted uppercase">Roles with access</th>
                </tr>
              </thead>
              <tbody>
                {workspaceAccess.map((row) => (
                  <tr key={row.permission} className="border-b border-brand-border/60 align-top last:border-0">
                    <td className="px-3 py-2 text-brand-ink">{row.sections.join(", ")}</td>
                    <td className="px-3 py-2"><span className="font-mono text-xs text-brand-muted">{row.permission}</span></td>
                    <td className="px-3 py-2 text-brand-secondary">{rolesWith(row.permission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-brand-muted">
            Super Admin holds every permission. Content sections (Updates, Resources, Opportunities,
            Website Content, Collaborations) are reachable by Super Admin and Content Manager.
          </p>
        </section>
      </div>
    </>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-xs tracking-wide text-brand-muted uppercase">{label}</dt>
      <dd className={`break-words ${mono ? "font-mono text-xs text-brand-ink" : "text-brand-ink"}`}>{value}</dd>
    </div>
  );
}
