#!/usr/bin/env node
/**
 * Docker Compose wrapper: one stack per environment, configured by per-app env files.
 *
 *   node scripts/docker.mjs <development|staging|production> <compose args...>
 *   pnpm docker production up -d --build
 *
 * It sets APP_ENV (compose project `acms-<env>`, env_file paths, image tags) and passes
 * `apps/api/.env.<env>` (POSTGRES_* credentials) and `apps/web/.env.<env>` to Compose for interpolation.
 * It fails early, with the command to fix it, when a needed env file is missing.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const ENVIRONMENTS = ["development", "staging", "production"];
const ROOT = path.resolve(import.meta.dirname, "..");
const COMPOSE_FILE = "infrastructure/docker/docker-compose.yml";

/** Env file each service needs, besides the api file (always required). */
const SERVICE_ENV_FILES = {
  migrate: "apps/api",
  api: "apps/api",
  "ai-worker": "apps/ai",
  web: "apps/web",
};
// Compose subcommands that create or start containers (and so need their env files).
const STARTING_COMMANDS = new Set(["up", "create", "run", "build", "start", "restart"]);

const [env, ...composeArgs] = process.argv.slice(2).filter((arg, index) => !(index === 0 && arg === "--"));
if (!ENVIRONMENTS.includes(env) || composeArgs.length === 0) {
  console.error(`Usage: node scripts/docker.mjs <${ENVIRONMENTS.join("|")}> <compose args...>`);
  process.exit(2);
}

// Holds POSTGRES_*, which every Compose command interpolates, so it is always required.
const apiFile = `apps/api/.env.${env}`;
const webFile = `apps/web/.env.${env}`;
const missing = new Set();
if (!existsSync(path.join(ROOT, apiFile))) missing.add("apps/api");

// Global Compose options whose value is a separate argument (`--profile vllm`), so it is not the subcommand.
const OPTIONS_WITH_VALUE = new Set(["--profile", "-f", "--file", "--env-file", "-p", "--project-name", "--project-directory", "--ansi", "--progress", "--parallel"]);
const commandIndex = composeArgs.findIndex(
  (arg, index) => !arg.startsWith("-") && !OPTIONS_WITH_VALUE.has(composeArgs[index - 1]),
);
const command = composeArgs[commandIndex];
// Positional args after the subcommand are service names; none means every service.
if (STARTING_COMMANDS.has(command)) {
  const named = composeArgs.slice(commandIndex + 1).filter((a) => !a.startsWith("-"));
  const services = named.length > 0 ? named : Object.keys(SERVICE_ENV_FILES);
  for (const service of services) {
    const dir = SERVICE_ENV_FILES[service];
    if (dir && !existsSync(path.join(ROOT, dir, `.env.${env}`))) missing.add(dir);
  }
}

if (missing.size > 0) {
  console.error(`Missing env files for "${env}". Create them from the templates, then edit secrets:`);
  for (const dir of missing) {
    console.error(`  cp ${dir}/.env.example ${dir}/.env.${env}`);
  }
  console.error(`Or run: pnpm env:init ${env}`);
  process.exit(1);
}

const envFileArgs = ["--env-file", apiFile];
if (existsSync(path.join(ROOT, webFile))) envFileArgs.push("--env-file", webFile);

const result = spawnSync("docker", ["compose", "-f", COMPOSE_FILE, ...envFileArgs, ...composeArgs], {
  cwd: ROOT,
  stdio: "inherit",
  env: { ...process.env, APP_ENV: env },
});
if (result.error) {
  console.error(`Could not run docker: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
