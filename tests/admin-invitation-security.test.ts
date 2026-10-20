import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261020223000_admin_role_invitations_acceptance.sql"), "utf8");

describe("administrator invitation database boundary", () => {
  it("keeps invitation records inaccessible to ordinary authenticated clients", () => {
    expect(migration).toMatch(/alter table public\.admin_role_invitations enable row level security/i);
    expect(migration).toMatch(/revoke all on public\.admin_role_invitations from public, anon, authenticated/i);
    expect(migration).toMatch(/grant all on public\.admin_role_invitations to service_role/i);
    expect(migration).toMatch(/token_hash text not null unique check \(token_hash ~ '\^\[a-f0-9\]\{64\}\$'\)/i);
    expect(migration).toMatch(/where status = 'pending'/i);
  });

  it("binds activation to a verified matching auth identity and a single-use accepted SMTP invitation", () => {
    const fn = migration.match(/create or replace function public\.csc_accept_admin_role_invitation[\s\S]*?\$\$;/i)?.[0] ?? "";
    expect(fn).toMatch(/auth\.uid\(\)/);
    expect(fn).toMatch(/email_confirmed_at is not null/i);
    expect(fn).toMatch(/normalized_email <> verified_email/i);
    expect(fn).toMatch(/delivery_status <> 'smtp_accepted'/i);
    expect(fn).toMatch(/expires_at <= now\(\)/i);
    expect(fn).toMatch(/for update/i);
    expect(fn).toMatch(/status = 'accepted'/i);
    expect(fn).toMatch(/insert into public\.admin_roles/i);
    expect(fn).toMatch(/recent authentication required for Super Admin/i);
  });

  it("protects invitation and role mutations with server-side roles.manage authorization", () => {
    expect(migration).toMatch(/if auth\.uid\(\) is null or not private\.has_permission\('roles\.manage'\)/i);
    const retry = migration.match(/create or replace function private\.retry_notification[\s\S]*?\$\$;/i)?.[0] ?? "";
    expect(retry).toMatch(/private\.has_permission\('roles\.manage'\)/i);
    const notices = migration.match(/create or replace function private\.manage_event_notice[\s\S]*?\$\$;/i)?.[0] ?? "";
    expect(notices).toMatch(/private\.has_permission\('events\.publish'\)/i);
    expect(notices).not.toMatch(/private\.has_permission\('content\.manage'\)|private\.has_permission\('settings\.manage'\)/i);
  });

  it("keeps direct database access for collaboration, content, and transactional notifications permission-scoped", () => {
    expect(migration).toMatch(/collab_admin_all on public\.collaborations for all to authenticated using \(private\.has_permission\('content\.manage'\)\)/i);
    expect(migration).toMatch(/collab_org_admin_all on public\.collaboration_organizations for all to authenticated using \(private\.has_permission\('content\.manage'\)\)/i);
    expect(migration).toMatch(/notif_admin_read on public\.notifications for select to authenticated using \(private\.has_permission\('roles\.manage'\)\)/i);
    expect(migration).toMatch(/notification_delivery_admin_read on public\.notification_deliveries for select to authenticated using \(private\.has_permission\('roles\.manage'\)\)/i);
    const saveContent = migration.match(/create or replace function private\.save_content[\s\S]*?\$\$;/i)?.[0] ?? "";
    expect(saveContent).toMatch(/private\.has_permission\('content\.manage'\)/i);
    expect(saveContent).not.toMatch(/private\.has_permission\('settings\.manage'\)/i);
  });
});
