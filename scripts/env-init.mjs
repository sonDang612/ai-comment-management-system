#!/usr/bin/env node
/**
 * Creates missing env files from their templates. Never overwrites an existing file.
 *
 *   node scripts/env-init.mjs              host dev files: apps/api/.env, apps/ai/.env, apps/web/.env.local
 *   node scripts/env-init.mjs development  Docker files:   <each app>/.env.development
 *
 * Templates hold local-dev values only: replace every secret before using staging/production.
 */
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";

const ENVIRONMENTS = ["development", "staging", "production"];
const ROOT = path.resolve(import.meta.dirname, "..");

const env = process.argv[2];
if (env !== undefined && !ENVIRONMENTS.includes(env)) {
  console.error(`Usage: node scripts/env-init.mjs [${ENVIRONMENTS.join("|")}]`);
  process.exit(2);
}

/** [template, target] pairs, relative to the repo root. */
const pairs = env
  ? [
      ["apps/api/.env.docker.example", `apps/api/.env.${env}`],
      ["apps/ai/.env.docker.example", `apps/ai/.env.${env}`],
      ["apps/web/.env.docker.example", `apps/web/.env.${env}`],
    ]
  : [
      ["apps/api/.env.example", "apps/api/.env"],
      ["apps/ai/.env.example", "apps/ai/.env"],
      ["apps/web/.env.example", "apps/web/.env.local"],
    ];

for (const [template, target] of pairs) {
  if (existsSync(path.join(ROOT, target))) {
    console.log(`  exists   ${target}`);
  } else {
    copyFileSync(path.join(ROOT, template), path.join(ROOT, target));
    console.log(`  created  ${target}  (from ${template})`);
  }
}
if (env && env !== "development") {
  console.log(`\nReplace the local-dev secrets in the ${env} files before starting the stack.`);
}
