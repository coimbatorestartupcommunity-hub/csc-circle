import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createConnection } from "node:net";
import {
  assertLocalSupabaseStatus,
  assertSafeTestTarget,
  createLocalE2EEnvironment,
  dotenvAssignmentNames,
  parseSupabaseStatus,
} from "./e2e-staging-safety.mjs";

function run(command, args, env) {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.error) throw new Error(`Could not start ${command}: ${result.error.message}`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const statusResult = spawnSync("supabase", ["status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
if (statusResult.status !== 0) throw new Error("Local Supabase must be running. No email test was started.");
const local = parseSupabaseStatus(statusResult.stdout);
assertLocalSupabaseStatus(local);
assertSafeTestTarget(local.API_URL, { authenticated: true, mailSinkUrl: local.MAILPIT_URL });

const smtp = await new Promise((resolve, reject) => {
  const socket = createConnection({ host: "127.0.0.1", port: 54325 });
  socket.setTimeout(1500);
  socket.once("connect", () => { socket.destroy(); resolve(true); });
  socket.once("error", reject);
  socket.once("timeout", () => { socket.destroy(); reject(new Error("Local SMTP capture is not listening.")); });
});
if (!smtp) throw new Error("Local SMTP capture is unavailable.");

const dotenvFiles = [".env", ".env.local", ".env.development", ".env.development.local", ".env.test", ".env.test.local", ".env.production", ".env.production.local"];
const dotenvKeys = [];
for (const file of dotenvFiles) {
  try { dotenvKeys.push(...dotenvAssignmentNames(await readFile(file, "utf8"))); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
}
const env = createLocalE2EEnvironment(process.env, local, dotenvKeys);
Object.assign(env, {
  CSC_LOCAL_EMAIL_CAPTURE: "true",
  CSC_RUN_LOCAL_EMAIL_INTEGRATION: "true",
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: "54325",
  SMTP_SECURE: "false",
  SMTP_USER: "",
  SMTP_APP_PASSWORD: "",
  SMTP_PASSWORD: "",
  SMTP_FROM_EMAIL: "csc-circle@example.test",
  SMTP_FROM_NAME: "CSC Circle Local Test",
  CSC_SUPPORT_EMAIL: "support@example.test",
  CSC_ADMIN_NOTIFICATION_EMAILS: "admin@example.test",
  EMAIL_NOTIFICATIONS_ENABLED: "true",
  VERCEL: "",
  VERCEL_ENV: "",
  NODE_ENV: "test",
});
console.log("Running one synthetic transactional outbox job against local Supabase and loopback SMTP capture only.");
run(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "tests/local-notification-delivery.integration.test.ts"], env);
