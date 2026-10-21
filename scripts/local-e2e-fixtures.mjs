import { randomBytes, randomUUID } from "node:crypto";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { assertLocalSupabaseStatus, parseSupabaseStatus } from "./e2e-staging-safety.mjs";

const roleNames = [
  "super_admin",
  "community_admin",
  "event_manager",
  "checkin_staff",
  "finance_reviewer",
  "content_manager",
  "tech_admin",
];

export async function createLocalE2EFixtures(path) {
  const statusOutput = await import("node:child_process").then(({ execFileSync }) =>
    execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }),
  );
  const status = parseSupabaseStatus(statusOutput);
  assertLocalSupabaseStatus(status);
  const supabase = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const runId = randomUUID().slice(0, 8);
  const accounts = {};
  const created = [];

  try {
    for (const role of [...roleNames, "member"]) {
      const userId = randomUUID();
      const email = `csc-phase2-${role}-${runId}@example.test`;
      const password = `T9!${randomBytes(24).toString("base64url")}x`;
      const { data, error } = await supabase.auth.admin.createUser({
        id: userId,
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: `Synthetic CSC ${role.replaceAll("_", " ")}`, name: `Synthetic ${role}` },
      });
      if (error || !data.user) throw new Error(`Could not provision local ${role} identity.`);
      created.push(data.user.id);
      const membership = await supabase.from("memberships").update({
        status: "active",
        member_number: `CSC-PHASE2-${role}-${runId}`,
        issued_at: new Date().toISOString(),
        verification_token: randomBytes(32).toString("hex"),
      }).eq("user_id", data.user.id);
      if (membership.error) throw new Error(`Could not provision local ${role} membership.`);

      if (role !== "member") {
        const assignment = await supabase.from("admin_roles").insert({ user_id: data.user.id, role });
        if (assignment.error) throw new Error(`Could not provision local ${role} role.`);
      }
      accounts[role] = { userId: data.user.id, email, password };
    }
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify({ created, accounts }, null, 2), { mode: 0o600 });
    await chmod(path, 0o600);
    return { created, accounts };
  } catch (error) {
    await deleteUsers(supabase, created);
    throw error;
  }
}

export async function deleteLocalE2EFixtures(created) {
  const statusOutput = await import("node:child_process").then(({ execFileSync }) =>
    execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }),
  );
  const status = parseSupabaseStatus(statusOutput);
  assertLocalSupabaseStatus(status);
  const supabase = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await deleteUsers(supabase, created);
}

async function deleteUsers(supabase, userIds) {
  if (userIds.length === 0) return;
  // Notification rows intentionally retain a restrictive recipient FK in CSC.
  // Remove only rows owned by these synthetic local test identities first.
  const notifications = await supabase.from("notifications").delete().in("recipient_user_id", userIds);
  if (notifications.error) throw new Error("Could not clean local synthetic notification rows.");
  const results = await Promise.all(userIds.map((id) => supabase.auth.admin.deleteUser(id)));
  if (results.some(({ error }) => error)) throw new Error("Some local synthetic identities could not be cleaned up.");
}
