import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { createLocalE2EFixtures, deleteLocalE2EFixtures } from "./local-e2e-fixtures.mjs";
import { assertLocalSupabaseStatus, parseSupabaseStatus } from "./e2e-staging-safety.mjs";

const fixturePath = "supabase/.temp/phase4-local-concurrency-users.json";
const statusText = (await import("node:child_process")).execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const local = parseSupabaseStatus(statusText);
assertLocalSupabaseStatus(local);
const api = new URL(local.API_URL);
if (api.hostname !== "127.0.0.1" || api.port !== "54321" || api.protocol !== "http:") throw new Error("Concurrency tests are restricted to the verified local Supabase API.");

const runId = randomUUID().slice(0, 8);
const memberCount = Number(process.env.CSC_CONCURRENCY_MEMBER_COUNT ?? 235);
if (!Number.isInteger(memberCount) || memberCount < 50 || memberCount > 250) throw new Error("Concurrency fixture member count must be between 50 and 250.");
let fixtures;
const createdEvents = [];
const uploadedObjects = [];
const timings = [];
const outcomes = { expectedCapacityRejections: 0, unexpectedFailures: 0, checks: [] };
const admin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)] * 100) / 100 : null;
}

async function measure(name, fn) {
  const started = performance.now();
  try {
    const value = await fn();
    const elapsedMs = performance.now() - started;
    timings.push({ name, elapsedMs, outcome: "success" });
    return { ok: true, value, elapsedMs };
  } catch (error) {
    const elapsedMs = performance.now() - started;
    timings.push({ name, elapsedMs, outcome: "failure" });
    return { ok: false, error, elapsedMs };
  }
}

async function createEvent(capacity, label) {
  const startsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const event = {
    slug: `csc-local-concurrency-${runId}-${label}`,
    title: `Synthetic concurrency event ${label}`,
    category: "Synthetic test",
    description: "Local synthetic event used only to verify concurrent registration and capacity behavior.",
    starts_at: startsAt,
    ends_at: new Date(Date.parse(startsAt) + 2 * 60 * 60 * 1000).toISOString(),
    location: "Coimbatore",
    venue: "Local test fixture",
    capacity,
    registration_deadline: new Date(Date.parse(startsAt) - 60 * 60 * 1000).toISOString(),
    status: "published",
    admission: "free",
    registration_state: "open",
    price_minor: 0,
    settings: {},
  };
  const { data, error } = await admin.from("events").insert(event).select("id").single();
  if (error || !data?.id) throw new Error("Could not create local synthetic event.");
  createdEvents.push(data.id);
  return data.id;
}

async function runBatch(name, items, operation, classifyExpected = () => false) {
  const started = performance.now();
  const settled = await Promise.all(items.map(async (item) => {
    const result = await measure(name, () => operation(item));
    if (!result.ok && classifyExpected(result.error)) return { expected: true, error: result.error };
    if (!result.ok) return { expected: false, error: result.error };
    return { expected: false, value: result.value };
  }));
  const elapsedMs = performance.now() - started;
  const expected = settled.filter((entry) => entry.expected).length;
  const failures = settled.filter((entry) => !entry.expected && entry.error);
  outcomes.expectedCapacityRejections += expected;
  outcomes.unexpectedFailures += failures.length;
  return { elapsedMs, settled, expected, failures };
}

async function authenticate(members) {
  const clients = Array(members.length);
  let next = 0;
  await Promise.all(Array.from({ length: 12 }, async () => {
    while (next < members.length) {
      const i = next++;
      const client = createClient(local.API_URL, local.PUBLISHABLE_KEY ?? local.ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error } = await client.auth.signInWithPassword({ email: members[i].email, password: members[i].password });
      if (error || !data.session) throw new Error("A synthetic local member could not sign in.");
      clients[i] = { client, userId: members[i].userId, email: members[i].email };
    }
  }));
  return clients;
}

async function register(client, eventId) {
  const { data, error } = await client.rpc("csc_register_event", { event: eventId, objective: "Synthetic concurrency test" });
  if (error) throw error;
  return data;
}

async function approve(adminClient, registrationId, decision = "confirmed") {
  const { data, error } = await adminClient.rpc("csc_admin_action", {
    kind: "registration", target: registrationId, decision, reason: "Synthetic local capacity verification",
  });
  if (error) throw error;
  return data;
}

async function exerciseRegistrationStage(stage, clients, adminClient) {
  const { size, capacity, label } = stage;
  const group = clients.slice(stage.offset, stage.offset + size);
  const eventId = await createEvent(capacity, label);
  const firstUserDuplicateCalls = await runBatch(`registration-idempotency-${label}`, Array(4).fill(group[0]), (member) => register(member.client, eventId));
  const duplicateIds = firstUserDuplicateCalls.settled.map((entry) => entry.value?.id);
  if (firstUserDuplicateCalls.failures.length || new Set(duplicateIds).size !== 1) throw new Error(`Registration idempotency failed at ${size} users.`);

  const rest = group.slice(1);
  const submitted = await runBatch(`registration-submit-${label}`, rest, (member) => register(member.client, eventId));
  if (submitted.failures.length) throw new Error(`Registration submission had unexpected failures at ${size} users.`);
  const { data: rows, error: queryError } = await admin.from("event_registrations").select("id,user_id,status,pass_token").eq("event_id", eventId);
  if (queryError || rows.length !== size || new Set(rows.map((row) => row.user_id)).size !== size) throw new Error(`Registration rows are lost or duplicated at ${size} users.`);
  const { data: eventNotices, error: noticeError } = await admin.from("notifications").select("related_record_id")
    .eq("channel", "in_app").in("related_record_id", rows.map((row) => row.id));
  if (noticeError || new Set((eventNotices ?? []).map((notice) => notice.related_record_id)).size !== size) {
    throw new Error(`An event registration did not create its corresponding in-app notification at ${size} users.`);
  }

  const confirmations = await runBatch(`registration-confirm-${label}`, rows, (row) => approve(adminClient, row.id, "confirmed"), (error) => /event full/i.test(error?.message ?? ""));
  const confirmedCount = confirmations.settled.filter((entry) => entry.value?.status === "confirmed" || entry.value?.ok === true).length;
  const expectedConfirmed = Math.min(capacity, size);
  if (confirmations.failures.length || confirmedCount !== expectedConfirmed || confirmations.expected !== size - expectedConfirmed) {
    throw new Error(`Capacity allocation mismatch at ${size} users: ${confirmedCount} confirmed, ${confirmations.expected} capacity rejections.`);
  }
  const { data: current, error: currentError } = await admin.from("event_registrations").select("id,status,pass_token").eq("event_id", eventId);
  if (currentError) throw new Error("Could not verify local event registration statuses.");
  const rejectedIds = current.filter((row) => row.status === "pending_review").map((row) => row.id);
  const waitlisted = await runBatch(`registration-waitlist-${label}`, rejectedIds, (id) => approve(adminClient, id, "waitlisted"));
  if (waitlisted.failures.length) throw new Error(`Could not waitlist capacity-rejected registrations at ${size} users.`);
  const { data: finalRows, error: finalError } = await admin.from("event_registrations").select("id,status,pass_token").eq("event_id", eventId);
  if (finalError) throw new Error("Could not verify final event registration state.");
  const confirmed = finalRows.filter((row) => row.status === "confirmed" || row.status === "checked_in");
  const waitlistedRows = finalRows.filter((row) => row.status === "waitlisted");
  if (confirmed.length !== expectedConfirmed || confirmed.length > capacity || waitlistedRows.length !== size - expectedConfirmed) throw new Error("Event capacity or waitlist state is inconsistent.");
  if (confirmed.some((row) => !row.pass_token) || waitlistedRows.some((row) => row.pass_token)) throw new Error("Event pass token state does not match registration status.");
  outcomes.checks.push(`${size} users: duplicate retry idempotency, ${confirmed.length}/${capacity} confirmed, ${waitlistedRows.length} waitlisted, no overbooking`);
}

async function exerciseMembershipAndProfileWrites(clients) {
  const submissions = clients.map((member, index) => ({
    user_id: member.userId,
    full_name: `Synthetic Member ${index}`,
    linked_account_email: member.email,
    applicant_type: "existing_member",
    whatsapp: `+9198765${String(index).padStart(5, "0")}`,
    designation: "startup_founder",
    declaration_accurate: true,
  }));
  const claimWrites = await runBatch("membership-claim-insert", submissions, async (claim) => {
    const member = clients.find((candidate) => candidate.userId === claim.user_id);
    const { data, error } = await member.client.from("membership_claims").insert(claim).select("id").single();
    if (error) throw error;
    return data;
  });
  if (claimWrites.failures.length) throw new Error("Distinct synthetic membership submissions failed.");
  const { data: claimNotices, error: noticeError } = await admin.from("notifications").select("related_record_id")
    .eq("channel", "in_app").in("related_record_id", claimWrites.settled.map((entry) => entry.value.id));
  if (noticeError || new Set((claimNotices ?? []).map((notice) => notice.related_record_id)).size !== clients.length) {
    throw new Error("A membership submission did not create its corresponding in-app notification.");
  }

  const duplicateAccount = clients.at(-1);
  const duplicateClaim = {
    user_id: duplicateAccount.userId,
    full_name: "Synthetic Duplicate Claim",
    linked_account_email: duplicateAccount.email,
    applicant_type: "existing_member",
    whatsapp: "+919876500000",
    designation: "startup_founder",
    declaration_accurate: true,
  };
  const duplicateClaims = await Promise.all(Array.from({ length: 5 }, () => measure("membership-claim-duplicate", async () => {
    const { data, error } = await duplicateAccount.client.from("membership_claims").insert(duplicateClaim).select("id").single();
    if (error) throw error;
    return data;
  })));
  const successfulDuplicates = duplicateClaims.filter((result) => result.ok).length;
  if (successfulDuplicates !== 0 || duplicateClaims.filter((result) => !result.ok && result.error?.code === "23505").length !== 5) {
    throw new Error("Duplicate membership claims were not rejected by the database constraint/guard.");
  }

  const profileWrites = await runBatch("profile-update", clients, async (member, index) => {
    const { data, error } = await member.client.from("profiles").update({ city: `Synthetic City ${index}` }).eq("id", member.userId).select("id").single();
    if (error || data?.id !== member.userId) throw error ?? new Error("Profile ownership response mismatch.");
    return data;
  });
  if (profileWrites.failures.length) throw new Error("Authenticated own-profile updates failed.");
  outcomes.checks.push(`${clients.length} authenticated membership submissions and own-profile updates; five concurrent duplicate claims rejected`);
}

async function exerciseStartupWrites(clients) {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="90"><rect width="120" height="90" fill="#6257ed"/><circle cx="60" cy="45" r="20" fill="#fff"/></svg>');
  const webp = await sharp(svg).webp({ quality: 75 }).toBuffer();
  const work = clients.map((member, index) => {
    const id = randomUUID();
    const path = `${member.userId}/${id}-directory-startup.webp`;
    uploadedObjects.push(path);
    return { member, index, id, path };
  });
  const uploads = await runBatch("startup-image-object", work, async (item) => {
    const { error } = await admin.storage.from("member-portraits").upload(item.path, webp, { contentType: "image/webp", upsert: false });
    if (error) throw error;
    return item.path;
  });
  if (uploads.failures.length) throw new Error("Local startup image fixtures could not be created.");

  const payloadFor = ({ member, index, id, path }) => ({
    id,
    name: `Concurrency Startup ${runId} ${index}`,
    slug: `csc-concurrency-${runId}-${member.userId}`,
    industry: "Software",
    description: "Synthetic local startup used to check concurrent, owner-bound submissions.",
    directoryImagePath: path,
    consent: true,
    details: { founderRole: "Founder", visibility: {}, collaboration: [] },
  });
  const submissions = await runBatch("startup-save", work, async (item) => {
    const { data, error } = await item.member.client.rpc("save_member_startup", { p_startup: payloadFor(item), p_private_details: { supportEmail: "synthetic@example.test" } });
    if (error || data !== item.id) throw error ?? new Error("Startup save returned an unexpected id.");
    return data;
  });
  if (submissions.failures.length) {
    const details = submissions.failures.slice(0, 5).map((failure) => `${failure.error?.code ?? "unknown"}:${failure.error?.message ?? "unknown"}`).join("; ");
    throw new Error(`Concurrent startup submissions failed (${details}).`);
  }

  const duplicate = work[0];
  const duplicatePayload = payloadFor(duplicate);
  const retry = await Promise.all(Array.from({ length: 3 }, () => measure("startup-save-retry", async () => {
    const { data, error } = await duplicate.member.client.rpc("save_member_startup", { p_startup: duplicatePayload, p_private_details: { supportEmail: "synthetic@example.test" } });
    if (error) throw error;
    return data;
  })));
  if (retry.some((result) => !result.ok || result.value !== duplicate.id)) throw new Error("Retrying a startup submission created an inconsistent result.");
  const { count, error: countError } = await admin.from("directory_startups").select("id", { count: "exact", head: true }).in("user_id", work.map((item) => item.member.userId));
  if (countError || count !== work.length) throw new Error("Concurrent startup records were lost or duplicated.");
  const { data: startupNotices, error: startupNoticeError } = await admin.from("notifications").select("related_record_id")
    .eq("channel", "in_app").in("related_record_id", work.map((item) => item.id));
  if (startupNoticeError || new Set((startupNotices ?? []).map((notice) => notice.related_record_id)).size !== work.length) {
    throw new Error("A startup submission did not create its corresponding in-app notification.");
  }

  const { data: hidden, error: ownerError } = await work[1].member.client.from("directory_startups").select("id").eq("id", work[0].id);
  if (ownerError || hidden.length !== 0) throw new Error("Startup ownership isolation failed under concurrent writes.");
  outcomes.checks.push(`${work.length} owner-authenticated startup writes, idempotent repeated save, cross-owner pending startup hidden by RLS`);
}

async function mixedBurst(clients) {
  const group = clients.slice(85, 235);
  const eventId = await createEvent(group.length, "mixed-150");
  const workloadStarted = performance.now();
  const tasks = group.map(async (member, index) => {
    // Model 150 active sessions arriving over a 10-second ramp and then
    // taking one action after a realistic 2–4 second think time. The separate
    // registration stages below retain true synchronized write bursts.
    await new Promise((resolve) => setTimeout(resolve, index / group.length * 10_000));
    await new Promise((resolve) => setTimeout(resolve, 2_000 + Math.random() * 2_000));
    const started = performance.now();
    const write = index % 7 === 0;
    try {
      if (write) {
        const { error } = await member.client.rpc("csc_register_event", { event: eventId, objective: "Synthetic mixed local workload" });
        if (error) throw error;
        return { ok: true, elapsedMs: performance.now() - started, kind: "write" };
      }
      const [inbox, profile] = await Promise.all([
        member.client.rpc("csc_member_notification_inbox"),
        member.client.from("profiles").select("id,display_name,city").eq("id", member.userId).maybeSingle(),
      ]);
      if (inbox.error || profile.error || !profile.data) throw inbox.error ?? profile.error ?? new Error("Own profile not visible.");
      return { ok: true, elapsedMs: performance.now() - started, kind: "read" };
    } catch (error) {
      return {
        ok: false,
        elapsedMs: performance.now() - started,
        kind: write ? "write" : "read",
        code: error?.code ?? "unknown",
        status: error?.status ?? null,
        message: String(error?.cause?.code ? `${error.message} (${error.cause.code}: ${error.cause.message})` : error?.message ?? "unknown error").slice(0, 180),
      };
    }
  });
  const results = await Promise.all(tasks);
  const failures = results.filter((result) => !result.ok);
  if (failures.length) {
    const sample = failures.slice(0, 8).map(({ kind, code, status, message }) => `${kind}:${code}/${status ?? "-"}:${message}`).join(" | ");
    throw new Error(`Mixed 150-member burst had ${failures.length} unexpected failures. Sample: ${sample}`);
  }
  const writeResults = results.filter((result) => result.kind === "write");
  const registrations = await admin.from("event_registrations").select("id,user_id,status,pass_token").eq("event_id", eventId);
  if (registrations.error || (registrations.data ?? []).length !== writeResults.length
    || new Set((registrations.data ?? []).map((row) => row.user_id)).size !== writeResults.length
    || (registrations.data ?? []).some((row) => row.status !== "pending_review" || row.pass_token !== null)) {
    throw new Error("Mixed-workload event writes were lost, duplicated, or issued a pass before authorized confirmation.");
  }
  outcomes.checks.push(`150 independent sessions: ${writeResults.length} event-registration writes and ${results.length - writeResults.length} concurrent notification/profile read journeys`);
  const durationSeconds = (performance.now() - workloadStarted) / 1000;
  return {
    users: results.length,
    writes: writeResults.length,
    reads: results.length - writeResults.length,
    p50Ms: percentile(results.map((result) => result.elapsedMs), 0.50),
    p95Ms: percentile(results.map((result) => result.elapsedMs), 0.95),
    p99Ms: percentile(results.map((result) => result.elapsedMs), 0.99),
    failureRatePercent: Math.round(failures.length / results.length * 10000) / 100,
    workloadDurationSeconds: Math.round(durationSeconds * 100) / 100,
    throughputRps: Math.round(results.length / durationSeconds * 100) / 100,
    // Sampled once after the workload; this is not a measured peak.
    dbConnectionsAtEnd: await getConnectionCount(),
  };
}

async function getConnectionCount() {
  try {
    const output = execFileSync("supabase", ["db", "query", "--local", "--output-format", "json",
      "select count(*)::integer as connections from pg_stat_activity where datname=current_database();"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return JSON.parse(output).rows?.[0]?.connections ?? null;
  } catch {
    return null;
  }
}

try {
  console.log(`Verified local Supabase only (${api.hostname}:${api.port}); creating synthetic fixture accounts.`);
  fixtures = await createLocalE2EFixtures(fixturePath, { memberCount });
  const clients = await authenticate(fixtures.members);
  const adminAccount = fixtures.accounts.event_manager;
  const adminClient = createClient(local.API_URL, local.PUBLISHABLE_KEY ?? local.ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const adminSignIn = await adminClient.auth.signInWithPassword({ email: adminAccount.email, password: adminAccount.password });
  if (adminSignIn.error || !adminSignIn.data.session) throw new Error("Synthetic local event-manager login failed.");

  const registrationStages = [
    { size: 10, offset: 0, capacity: 12, label: "ample-10" },
    { size: 25, offset: 10, capacity: 8, label: "limited-25" },
    { size: 50, offset: 35, capacity: 16, label: "limited-50" },
  ];
  if (process.env.CSC_CONCURRENCY_MIXED_ONLY !== "1") {
    await exerciseMembershipAndProfileWrites(clients.slice(0, 85));
    for (const stage of registrationStages) await exerciseRegistrationStage(stage, clients, adminClient);
    const startupStages = [clients.slice(0, 10), clients.slice(10, 35), clients.slice(35, 85)];
    for (const stage of startupStages) await exerciseStartupWrites(stage);
  }

  const mixed = memberCount >= 235 && process.env.CSC_CONCURRENCY_SKIP_MIXED !== "1"
    ? await mixedBurst(clients)
    : { skipped: "requires 235 synthetic accounts; set CSC_CONCURRENCY_MEMBER_COUNT=235" };
  const timingGroups = Object.fromEntries([...new Set(timings.map((entry) => entry.name))].map((name) => {
    const group = timings.filter((entry) => entry.name === name);
    return [name, {
      samples: group.length,
      p50Ms: percentile(group.map((entry) => entry.elapsedMs), 0.50),
      p95Ms: percentile(group.map((entry) => entry.elapsedMs), 0.95),
      p99Ms: percentile(group.map((entry) => entry.elapsedMs), 0.99),
      failures: group.filter((entry) => entry.outcome === "failure").length,
    }];
  }));
  console.log(JSON.stringify({
    environment: "local Supabase loopback only; local synthetic accounts and records; RLS enabled",
    totalSyntheticMembers: memberCount,
    registrationStages,
    mixedBurst: mixed,
    timingGroups,
    expectedCapacityRejections: outcomes.expectedCapacityRejections,
    unexpectedFailures: outcomes.unexpectedFailures,
    checks: outcomes.checks,
  }, null, 2));
} finally {
  if (fixtures) {
    // Remove notification delivery rows before notifications/users, matching
    // the repository's local fixture cleanup behavior.
    await deleteLocalE2EFixtures(fixtures.created);
  }
  for (const path of uploadedObjects) {
    // User cleanup cascades startup rows; these local objects are removed
    // explicitly so no fixture media is left behind.
    await admin.storage.from("member-portraits").remove([path]);
  }
  for (const id of createdEvents) await admin.from("events").delete().eq("id", id);
  await rm(fixturePath, { force: true });
}
