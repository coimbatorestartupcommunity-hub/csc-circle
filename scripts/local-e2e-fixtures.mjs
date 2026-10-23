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

export async function createLocalE2EFixtures(path, { memberCount = 1 } = {}) {
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
  const members = [];
  const created = [];

  try {
    if (!Number.isInteger(memberCount) || memberCount < 1 || memberCount > 250) {
      throw new Error("Local fixture member count must be between 1 and 250.");
    }
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
      if (role === "member") members.push(accounts[role]);
    }
    for (let index = 1; index < memberCount; index++) {
      const userId = randomUUID();
      const email = `csc-phase4-bench-${runId}-${index}@example.test`;
      const password = `T9!${randomBytes(24).toString("base64url")}x`;
      const { data, error } = await supabase.auth.admin.createUser({
        id: userId,
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: `Synthetic CSC Benchmark ${index}`, name: `Synthetic Benchmark ${index}` },
      });
      if (error || !data.user) throw new Error("Could not provision a local benchmark member.");
      created.push(data.user.id);
      const membership = await supabase.from("memberships").update({
        status: "active",
        member_number: `CSC-PHASE4-BENCH-${runId}-${index}`,
        issued_at: new Date().toISOString(),
        verification_token: randomBytes(32).toString("hex"),
      }).eq("user_id", data.user.id);
      if (membership.error) throw new Error("Could not provision a local benchmark membership.");
      members.push({ userId: data.user.id, email, password });
    }
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify({ created, accounts, members }, null, 2), { mode: 0o600 });
    await chmod(path, 0o600);
    return { created, accounts, members };
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
  // Admin-facing outbox rows have no recipient_user_id, so collect records
  // owned by these synthetic identities as well as their member inbox rows.
  // This keeps local synthetic queues from growing between test runs.
  const relatedIds = new Set();
  for (const table of ["membership_claims", "directory_startups", "event_registrations", "reviews"]) {
    for (const chunk of chunks(userIds, 50)) {
      const ownedRecords = await supabase.from(table).select("id").in("user_id", chunk);
      if (ownedRecords.error) throw new Error(`Could not inspect local synthetic ${table} rows.`);
      for (const row of ownedRecords.data ?? []) relatedIds.add(row.id);
    }
  }
  const notificationIds = new Set();
  for (const chunk of chunks(userIds, 50)) {
    const ownedNotifications = await supabase.from("notifications").select("id").in("recipient_user_id", chunk);
    if (ownedNotifications.error) throw new Error("Could not inspect local synthetic notification rows.");
    for (const row of ownedNotifications.data ?? []) notificationIds.add(row.id);
  }
  for (const chunk of chunks([...relatedIds], 50)) {
    const relatedNotifications = await supabase.from("notifications").select("id").in("related_record_id", chunk);
    if (relatedNotifications.error) throw new Error("Could not inspect local synthetic business-event notifications.");
    for (const row of relatedNotifications.data ?? []) notificationIds.add(row.id);
  }
  for (const chunk of chunks([...notificationIds], 50)) {
    const deliveries = await supabase.from("notification_deliveries").delete().in("notification_id", chunk);
    if (deliveries.error) throw new Error("Could not clean local synthetic notification delivery rows.");
    const notifications = await supabase.from("notifications").delete().in("id", chunk);
    if (notifications.error) throw new Error("Could not clean local synthetic notification rows.");
  }
  const failures = [];
  for (const id of userIds) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (!error || error.code === "user_not_found") break;
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
    if (lastError) failures.push(id);
  }
  if (failures.length) throw new Error(`Could not clean up ${failures.length} local synthetic identities.`);
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}
