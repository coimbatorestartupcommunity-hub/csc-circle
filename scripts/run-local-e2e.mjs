import { spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { createLocalE2EFixtures, deleteLocalE2EFixtures } from "./local-e2e-fixtures.mjs";
import {
  assertLocalSupabaseStatus,
  createLocalE2EEnvironment,
  dotenvAssignmentNames,
  parseSupabaseStatus,
} from "./e2e-staging-safety.mjs";

function run(command, args, env) {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.error) throw new Error(`Could not start ${command}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status ?? "unknown"}.`);
}

const statusResult = spawnSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
if (statusResult.status !== 0) {
  throw new Error("Local Supabase is unavailable. Start it with `supabase start`; no E2E test was run.");
}
const local = parseSupabaseStatus(statusResult.stdout);
assertLocalSupabaseStatus(local);

const dotenvFiles = [
  ".env", ".env.local", ".env.development", ".env.development.local",
  ".env.test", ".env.test.local", ".env.production", ".env.production.local",
];
const dotenvKeys = [];
for (const file of dotenvFiles) {
  try {
    dotenvKeys.push(...dotenvAssignmentNames(await readFile(file, "utf8")));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
const env = createLocalE2EEnvironment(process.env, local, dotenvKeys);

const fixturePath = "supabase/.temp/phase2-local-e2e-users.json";
let fixtures;
try {
  fixtures = await createLocalE2EFixtures(fixturePath);
  env.CSC_E2E_USERS_FILE = fixturePath;
  console.log("Building against local Supabase with synthetic identities. Outbound email is disabled and Mailpit captures Auth messages.");
  if (process.env.CSC_E2E_SKIP_BUILD !== "1") run("npm", ["run", "build"], env);
  delete env.CSC_E2E_SKIP_BUILD;
  run("npx", ["playwright", "test", ...process.argv.slice(2)], env);
} finally {
  try {
    if (fixtures?.created.length) await deleteLocalE2EFixtures(fixtures.created);
  } finally {
    // Remove local plaintext fixture credentials even if account cleanup fails.
    await rm(fixturePath, { force: true });
  }
}
