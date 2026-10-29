import { execFile, spawn, spawnSync } from "node:child_process";
import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { createServerClient } from "@supabase/ssr";
import { createLocalE2EFixtures, deleteLocalE2EFixtures } from "./local-e2e-fixtures.mjs";
import {
  assertLocalSupabaseStatus,
  createLocalE2EEnvironment,
  dotenvAssignmentNames,
  parseSupabaseStatus,
} from "./e2e-staging-safety.mjs";

const statusResult = spawnSync("supabase", ["status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
if (statusResult.status !== 0) throw new Error("Local Supabase must be running; benchmark aborted.");
const local = parseSupabaseStatus(statusResult.stdout);
assertLocalSupabaseStatus(local);

const target = new URL("http://127.0.0.1:3107");
const dotenvFiles = [".env", ".env.local", ".env.development", ".env.development.local", ".env.test", ".env.test.local", ".env.production", ".env.production.local"];
const dotenvKeys = [];
for (const file of dotenvFiles) {
  try { dotenvKeys.push(...dotenvAssignmentNames(await readFile(file, "utf8"))); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
}
const env = createLocalE2EEnvironment(process.env, local, dotenvKeys);
Object.assign(env, {
  NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.PUBLISHABLE_KEY ?? local.ANON_KEY,
  NEXT_PUBLIC_SITE_URL: target.origin,
  APP_BASE_URL: target.origin,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
  EMAIL_NOTIFICATIONS_ENABLED: "false",
  CSC_LOCAL_EMAIL_CAPTURE: "",
  CSC_PERF_DIAGNOSTICS: "true",
  NODE_ENV: "production",
});

const fixturePath = "supabase/.temp/phase4-local-benchmark-users.json";
const execFileAsync = promisify(execFile);
const allowedStages = new Set([5, 25, 50, 100, 150, 200]);
const requestedStages = process.env.CSC_LOCAL_BENCH_STAGES
  ? process.env.CSC_LOCAL_BENCH_STAGES.split(",").map(Number)
  : [5, 25, 50, 100, 150, 200];
const repetitions = Number(process.env.CSC_LOCAL_BENCH_REPETITIONS ?? 3);
const durationSeconds = Number(process.env.CSC_LOCAL_BENCH_DURATION_SECONDS ?? 30);
const rampSeconds = Number(process.env.CSC_LOCAL_BENCH_RAMP_SECONDS ?? 10);
const thinkTimeMinMs = Number(process.env.CSC_LOCAL_BENCH_THINK_MIN_MS ?? 2000);
const thinkTimeMaxMs = Number(process.env.CSC_LOCAL_BENCH_THINK_MAX_MS ?? 4000);
if (requestedStages.some((stage) => !allowedStages.has(stage))) throw new Error("Benchmark stages must be selected from the fixed local-only stage list.");
if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 3) throw new Error("Benchmark repetitions must be between 1 and 3.");
if (!Number.isFinite(durationSeconds) || durationSeconds < 5 || durationSeconds > 180) throw new Error("Benchmark duration must be between 5 and 180 seconds.");
if (!Number.isFinite(rampSeconds) || rampSeconds < 0 || rampSeconds > 60) throw new Error("Benchmark ramp must be between 0 and 60 seconds.");
if (!Number.isFinite(thinkTimeMinMs) || !Number.isFinite(thinkTimeMaxMs) || thinkTimeMinMs < 0 || thinkTimeMaxMs < thinkTimeMinMs || thinkTimeMaxMs > 30_000) throw new Error("Benchmark think-time range is invalid.");

let fixtures;
let server;
let serverLog = "";
const stages = [];
const startedAt = process.hrtime.bigint();
const cpuStart = process.cpuUsage();

function run(command, args, runEnv) {
  const result = spawnSync(command, args, { stdio: "inherit", env: runEnv });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status ?? "unknown"}.`);
}

async function assertProductionHostAbsent() {
  const roots = [".next/server", ".next/static"];
  async function scan(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await scan(fullPath);
      else if (/\.(?:js|json|html|txt|css)$/.test(entry.name)) {
        const contents = await readFile(fullPath, "utf8");
        if (contents.includes("mmsrtfktwcrbyrucjmzo.supabase.co")) throw new Error("Unsafe build detected: production Supabase host was found in generated output.");
      }
    }
  }
  for (const root of roots) await scan(root);
}

function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)] * 100) / 100;
}

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw new Error(`Local Next server exited early: ${serverLog.slice(-1000)}`);
    try { const response = await fetch(target); if (response.status < 500) return; }
    catch { /* wait for startup */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Local Next server did not start: ${serverLog.slice(-1000)}`);
}

async function localMemberCookie(account) {
  let jar = [];
  const authClient = createServerClient(local.API_URL, local.PUBLISHABLE_KEY ?? local.ANON_KEY, {
    cookies: {
      getAll: () => jar,
      setAll: (values) => { jar = values.map(({ name, value }) => ({ name, value })); },
    },
  });
  const { data, error } = await authClient.auth.signInWithPassword({ email: account.email, password: account.password });
  if (error || !data.session) throw new Error(`Synthetic local member authentication failed${error?.code ? ` (${error.code})` : ""}.`);
  const cookie = jar.map(({ name, value }) => `${name}=${value}`).join("; ");
  if (!cookie || !/sb-.+-auth-token(?:\.\d+)?=/.test(cookie)) throw new Error("Local login did not issue the expected Supabase session cookie.");
  return cookie;
}

async function createMemberCookies(members) {
  const cookies = Array(members.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: 10 }, async () => {
    while (nextIndex < members.length) {
      const index = nextIndex++;
      cookies[index] = await localMemberCookie(members[index]);
    }
  }));
  return cookies;
}

async function request(url, cookie) {
  const start = performance.now();
  try {
    const response = await fetch(new URL(url, target), {
      headers: cookie ? { Cookie: cookie } : {},
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    await response.arrayBuffer();
    const elapsed = performance.now() - start;
    const serverTiming = Object.fromEntries((response.headers.get("server-timing") ?? "").split(",")
      .map((entry) => entry.trim().match(/^([a-z-]+);dur=([0-9.]+)$/))
      .filter(Boolean)
      .map((match) => [match[1], Number(match[2])]));
    return { path: url, ok: response.status >= 200 && response.status < 400, status: response.status, elapsed, serverTiming };
  } catch {
    return { path: url, ok: false, status: 0, elapsed: performance.now() - start };
  }
}

async function runStage(concurrency, cookies) {
  const results = [];
  let attemptedRequests = 0;
  let virtualUsersStarted = 0;
  let requestsInFlight = 0;
  let maxRequestsInFlight = 0;
  const publicPaths = ["/", "/events", "/directory", "/collaborations"];
  const memberPaths = ["/member", "/member/profile", "/member/id-card", "/member/startups", "/api/member/notifications"];
  const begun = performance.now();
  const durationMs = durationSeconds * 1000;
  const resourceMaxima = { nextCpuPercent: 0, nextRssMb: 0, postgresConnections: 0, postgresActiveQueries: 0, supabaseContainers: {} };
  let lastContainerSample = 0;
  let resourceSampleInFlight = false;
  const sampleResources = async () => {
    if (server?.pid) {
      const ps = spawnSync("ps", ["-o", "%cpu=,rss=", "-p", String(server.pid)], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      const [cpu, rssKb] = (ps.stdout ?? "").trim().split(/\s+/).map(Number);
      if (Number.isFinite(cpu)) resourceMaxima.nextCpuPercent = Math.max(resourceMaxima.nextCpuPercent, cpu);
      if (Number.isFinite(rssKb)) resourceMaxima.nextRssMb = Math.max(resourceMaxima.nextRssMb, rssKb / 1024);
    }
    if (!resourceSampleInFlight && performance.now() - lastContainerSample >= 5_000) {
      lastContainerSample = performance.now();
      resourceSampleInFlight = true;
      try {
      // Docker and `docker exec` are diagnostic-only. Run them asynchronously
      // with short timeouts so a stalled daemon cannot block the load driver or
      // distort request latency measurements.
      const [stats, pg] = await Promise.all([
        execFileAsync("docker", ["stats", "--no-stream", "--format", "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}",
        "supabase_db_csc-circle", "supabase_auth_csc-circle", "supabase_rest_csc-circle", "supabase_kong_csc-circle"],
        { encoding: "utf8", timeout: 1_500, maxBuffer: 32_768 }).catch(() => ({ stdout: "" })),
        execFileAsync("docker", ["exec", "supabase_db_csc-circle", "psql", "-U", "postgres", "-d", "postgres", "-At", "-c",
          "select count(*)||','||count(*) filter (where state='active') from pg_stat_activity where datname=current_database();"],
        { encoding: "utf8", timeout: 1_500, maxBuffer: 4_096 }).catch(() => ({ stdout: "" })),
      ]);
      for (const line of (stats.stdout ?? "").trim().split("\n")) {
        const [name, cpuText, memoryText] = line.split("\t");
        if (!name) continue;
        const cpu = Number.parseFloat(cpuText);
        const memory = memoryText?.split("/")[0]?.trim() ?? "";
        const match = memory.match(/^([0-9.]+)\s*(MiB|GiB|MB|GB)$/i);
        const multiplier = /^(GiB|GB)$/i.test(match?.[2] ?? "") ? 1024 : 1;
        const bucket = resourceMaxima.supabaseContainers[name] ?? { maxCpuPercent: 0, maxMemoryMiB: 0 };
        if (Number.isFinite(cpu)) bucket.maxCpuPercent = Math.max(bucket.maxCpuPercent, cpu);
        if (match) bucket.maxMemoryMiB = Math.max(bucket.maxMemoryMiB, Number(match[1]) * multiplier);
        resourceMaxima.supabaseContainers[name] = bucket;
      }
      const [connections, active] = (pg.stdout ?? "").trim().split(",").map(Number);
      if (Number.isFinite(connections)) resourceMaxima.postgresConnections = Math.max(resourceMaxima.postgresConnections, connections);
      if (Number.isFinite(active)) resourceMaxima.postgresActiveQueries = Math.max(resourceMaxima.postgresActiveQueries, active);
      } finally {
        resourceSampleInFlight = false;
      }
    }
  };
  void sampleResources();
  const resourceTimer = setInterval(() => { void sampleResources(); }, 1000);
  try {
    await Promise.all(Array.from({ length: concurrency }, async (_, index) => {
      const delay = Math.round(index / Math.max(concurrency, 1) * rampSeconds * 1000);
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      virtualUsersStarted++;
      let requestIndex = index;
      while (performance.now() - begun < durationMs) {
        const authenticated = requestIndex % 3 !== 0;
        const pool = authenticated ? memberPaths : publicPaths;
        attemptedRequests++;
        requestsInFlight++;
        maxRequestsInFlight = Math.max(maxRequestsInFlight, requestsInFlight);
        results.push(await request(pool[requestIndex % pool.length], authenticated ? cookies[index] : undefined));
        requestsInFlight--;
        const thinkTime = thinkTimeMinMs + ((index * 37 + requestIndex * 53) % (thinkTimeMaxMs - thinkTimeMinMs + 1));
        requestIndex++;
        await new Promise((resolve) => setTimeout(resolve, thinkTime));
      }
    }));
  } finally {
    clearInterval(resourceTimer);
    await sampleResources();
  }
  const durations = results.map((result) => result.elapsed);
  const failures = results.filter((result) => !result.ok);
  const serverErrors = results.filter((result) => result.status >= 500 || result.status === 0);
  const inboxRequests = results.filter((result) => result.path === "/api/member/notifications");
  const timingNames = ["client-init", "auth-claims", "inbox-queries", "request"];
  const serverTiming = Object.fromEntries(timingNames.map((metric) => {
    const values = inboxRequests.map((result) => result.serverTiming?.[metric]).filter(Number.isFinite);
    return [metric, { samples: values.length, p50Ms: percentile(values, 0.50), p95Ms: percentile(values, 0.95), p99Ms: percentile(values, 0.99) }];
  }));
  const endpointMetrics = Object.fromEntries([...new Set(results.map((result) => result.path))].map((url) => {
    const subset = results.filter((result) => result.path === url);
    return [url, {
      requests: subset.length,
      p50Ms: percentile(subset.map((result) => result.elapsed), 0.50),
      p95Ms: percentile(subset.map((result) => result.elapsed), 0.95),
      p99Ms: percentile(subset.map((result) => result.elapsed), 0.99),
      failures: subset.filter((result) => !result.ok).length,
    }];
  }));
  return {
    users: concurrency,
    durationSeconds: Math.round((performance.now() - begun) / 100) / 10,
    virtualUsersStarted,
    attemptedRequests,
    maxRequestsInFlight,
    requestsStillInFlight: requestsInFlight,
    requests: results.length,
    requestsPerSecond: Math.round(results.length / ((performance.now() - begun) / 1000) * 100) / 100,
    p50Ms: percentile(durations, 0.50),
    p95Ms: percentile(durations, 0.95),
    p99Ms: percentile(durations, 0.99),
    failures: failures.length,
    failureRatePercent: Math.round(failures.length / Math.max(1, results.length) * 10000) / 100,
    statusCounts: Object.fromEntries([...new Set(results.map((result) => result.status))]
      .sort((a, b) => a - b)
      .map((status) => [String(status), results.filter((result) => result.status === status).length])),
    http5xxOrTimeouts: serverErrors.length,
    resourceMaxima: {
      nextCpuPercent: Math.round(resourceMaxima.nextCpuPercent * 100) / 100,
      nextRssMb: Math.round(resourceMaxima.nextRssMb * 100) / 100,
      postgresConnections: resourceMaxima.postgresConnections,
      postgresActiveQueries: resourceMaxima.postgresActiveQueries,
      supabaseContainers: resourceMaxima.supabaseContainers,
    },
    notificationEndpoint: {
      requests: inboxRequests.length,
      p50Ms: percentile(inboxRequests.map((result) => result.elapsed), 0.50),
      p95Ms: percentile(inboxRequests.map((result) => result.elapsed), 0.95),
      p99Ms: percentile(inboxRequests.map((result) => result.elapsed), 0.99),
      failures: inboxRequests.filter((result) => !result.ok).length,
      serverTiming,
    },
    endpointMetrics,
  };
}

try {
  env.CSC_PERF_DIAGNOSTICS = "true";
  console.log("Building production output with verified loopback Supabase settings; dotenv secrets are shadowed.");
  run("npm", ["run", "build"], env);
  await assertProductionHostAbsent();
  console.log("Generated build verified: production Supabase hostname absent.");

  const memberCount = Math.max(...requestedStages);
  fixtures = await createLocalE2EFixtures(fixturePath, { memberCount });
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3107"], { env, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout.on("data", (chunk) => { serverLog = `${serverLog}${chunk}`.slice(-4000); });
  server.stderr.on("data", (chunk) => { serverLog = `${serverLog}${chunk}`.slice(-4000); });
  await waitForServer();
  const cookies = await createMemberCookies(fixtures.members);
  for (const concurrency of requestedStages) {
    for (let repetition = 1; repetition <= repetitions; repetition++) {
      const stage = await runStage(concurrency, cookies);
      stage.repetition = repetition;
      stages.push(stage);
      console.log(JSON.stringify(stage));
      const persistentServerErrors = stage.http5xxOrTimeouts >= Math.max(2, Math.ceil(stage.requests * 0.01));
      if (stage.failureRatePercent >= 1 || persistentServerErrors ||
        (stage.p95Ms ?? 0) >= 3_000 || (stage.notificationEndpoint.p95Ms ?? 0) >= 3_000) {
        console.log("Stopped escalation after a critical local instability signal.");
        throw Object.assign(new Error("Local benchmark stopped at the first failing stage."), { benchmarkStopped: true });
      }
    }
  }
  const cpu = process.cpuUsage(cpuStart);
  const seconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
  console.log(JSON.stringify({
    summary: "Local independently authenticated read-only route benchmark after temporarily provisioning synthetic local identities. RLS remained enabled; no production services, business writes, real email, or Google OAuth were used.",
    target: target.origin,
    memberIdentities: fixtures.members.length,
    repetitions,
    steadyStateSeconds: durationSeconds,
    rampSeconds,
    thinkTimeMs: { min: thinkTimeMinMs, max: thinkTimeMaxMs },
    stages,
    generatorCpuSeconds: Math.round((cpu.user + cpu.system) / 1e6 * 100) / 100,
    generatorPeakRssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    elapsedSeconds: Math.round(seconds * 100) / 100,
  }));
} catch (error) {
  if (error?.benchmarkStopped) {
    const cpu = process.cpuUsage(cpuStart);
    console.log(JSON.stringify({
      summary: "Local independently authenticated benchmark stopped after threshold failure.",
      target: target.origin,
      memberIdentities: fixtures?.members?.length ?? 0,
      repetitions,
      steadyStateSeconds: durationSeconds,
      rampSeconds,
      thinkTimeMs: { min: thinkTimeMinMs, max: thinkTimeMaxMs },
      stages,
      generatorCpuSeconds: Math.round((cpu.user + cpu.system) / 1e6 * 100) / 100,
      generatorPeakRssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    }));
    process.exitCode = 2;
  } else {
    console.error(`Local benchmark aborted: ${error instanceof Error ? error.message : "unknown failure"}`);
    process.exitCode = 1;
  }
} finally {
  if (server && server.exitCode === null) { server.kill("SIGTERM"); await new Promise((resolve) => server.once("exit", resolve)); }
  let cleanupFailed = false;
  try {
    if (fixtures?.created.length) await deleteLocalE2EFixtures(fixtures.created);
  } catch (error) {
    console.error(`Local synthetic identity cleanup failed: ${error instanceof Error ? error.message : "unknown failure"}. Credentials file retained for safe recovery.`);
    process.exitCode = 1;
    cleanupFailed = true;
  }
  if (!cleanupFailed) await rm(fixturePath, { force: true });
}
