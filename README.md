# AI Comment Moderation

Monorepo for the AI Comment Moderation service (requirements: [`docs/requirements/v_1.0.md`](docs/requirements/v_1.0.md)).
This is the **foundation only**: infrastructure, conventions and health checks. No business features yet.

```
                                        online                                      offline (GPU machine)
web (Next.js) ──HTTP──▶ api (NestJS) ──HTTP (OpenAI API)──▶ vllm ◀── LoRA adapter ── apps/ai: acms_ai.training
                         │   │   rules + final result      base model + adapter     (JSONL → split → train → evaluate)
                         │   └──BullMQ (Redis)──▶ ai-worker (apps/ai, BullMQ consumer)
                         │                           └── results via BullMQ events ──▶ api
                         └──Prisma──▶ PostgreSQL
```

| Layer          | Stack                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------- |
| Frontend       | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Zustand, TanStack Query |
| Main API       | NestJS 12 (ESM), Prisma 7 (`@prisma/adapter-pg`), BullMQ producer                        |
| AI inference   | vLLM (OpenAI-compatible API): frozen base model + trained LoRA adapter. Called by the API only |
| AI worker      | `apps/ai` → `acms_ai.worker`: BullMQ (Python) consumer of the `ai-jobs` queue            |
| AI training    | `apps/ai` → `acms_ai.training`: PyTorch, Transformers, PEFT (LoRA), TRL. Offline only    |
| Database       | PostgreSQL 17 (tables in the `app` schema), migrations by Prisma Migrate                 |
| Cache / Queue  | Redis 7                                                                                  |
| Monorepo       | Turborepo + pnpm workspace (JS), uv workspace (Python)                                  |
| Infrastructure | Docker Compose                                                                           |

**Who owns what.** The NestJS API is the only public backend and the only owner of the database schema.
The API runs the rule checks, calls vLLM directly for inference, validates the answer and decides what is stored.
vLLM only runs the model. `apps/ai` is one Python package: the worker runs queue jobs, and the training CLI builds
LoRA adapters offline. Python never writes business tables directly: results go back to the API.

## Repository layout

```
.
├── apps/
│   ├── web/                      # Next.js admin UI
│   │   └── src/{app/[lang],components/ui,config,features/<x>,i18n,lib/api,providers,stores,proxy.ts}
│   ├── api/                      # NestJS main API
│   │   ├── prisma/               # schema.prisma + migrations/
│   │   ├── prisma7.config.ts     # Prisma CLI config
│   │   ├── scripts/queue-smoke.ts
│   │   └── src/
│   │       ├── common/           # request context, AppException, global filter, logger
│   │       ├── config/env.ts     # validated env schema
│   │       ├── infrastructure/   # prisma, redis, queue (BullMQ), vllm (HTTP client)
│   │       ├── modules/<x>/      # feature modules (controller / service)
│   │       └── generated/prisma/ # generated client (git-ignored)
│   └── ai/                       # Python: one package (acms_ai): worker + offline training
│       ├── src/acms_ai/
│       │   ├── core/             # shared: settings base, logging, request context, AppError
│       │   ├── worker/           # BullMQ consumer, processor, jobs/, healthcheck
│       │   └── training/         # offline: LoRA fine-tuning CLI (python -m acms_ai.training)
│       ├── training/             # LoRA configs + docs; data/, models/, outputs/ are git-ignored
├── packages/
│   └── shared/                   # TS contracts: error envelope, health types, queue + job names
├── infrastructure/docker/        # api / python / web Dockerfiles + docker-compose.yml
├── scripts/                      # docker.mjs (Compose per environment), env-init.mjs
├── package.json / pnpm-workspace.yaml / turbo.json   # pnpm workspace + Turborepo pipeline
└── pyproject.toml / uv.lock      # uv workspace (apps/ai)
```

`apps/ai` also has a small `package.json` so Turborepo can run its `dev` (worker) / `lint` tasks (they call `uv`).

## Prerequisites

- Node.js ≥ 22.18 (runs `scripts/*.ts` natively) and pnpm 11 (`corepack enable` picks the version pinned in `package.json`)
- [uv](https://docs.astral.sh/uv/getting-started/installation/) ≥ 0.9 (uv installs Python 3.12 itself)
- Docker with Docker Compose v2

## Quick start: everything in Docker

```bash
pnpm env:init development   # apps/*/.env.development
pnpm docker:up                 # = pnpm docker development up -d --build
```

Other environments use the same wrapper with their own files, e.g.
`pnpm env:init production`, edit the secrets, then `pnpm docker production up -d --build`.

| Service  | URL                                   |
| -------- | ------------------------------------- |
| Web      | http://localhost:3000                 |
| API      | http://localhost:4000/api/v1          |
| Health   | http://localhost:4000/api/v1/health   |

The `vllm` service needs an NVIDIA GPU and starts only with `--profile vllm` (see [AI inference](#ai-inference-vllm)).
It is not published to the host: only the API calls it, inside the Compose network.
The `migrate` service runs `prisma migrate deploy` once, and `api` starts only after it succeeds.
To stop the stack, run `pnpm docker:down`. Data volumes are kept; remove them only on purpose with `pnpm docker <env> down -v`.

## Local development: apps on the host, infra in Docker

```bash
pnpm env:init                                      # apps/api/.env, apps/ai/.env, apps/web/.env.local
pnpm env:init development                       # apps/api/.env.development (postgres credentials)
pnpm install
uv sync                                               # Python workspace -> .venv

pnpm docker development up -d postgres redis   # development postgres + redis only
pnpm db:migrate                                    # prisma migrate deploy
pnpm dev                                           # web :3000, api :4000, ai-worker
pnpm --filter @acms/api queue:smoke             # optional: API -> queue -> worker round trip
```

Without a vLLM server, set `AI_ANALYZER=stub` in `apps/api/.env`, or point `VLLM_URL` at a running vLLM.
You can also run one app on its own, e.g. `pnpm turbo run dev --filter @acms/api`, or
`pnpm --filter @acms/ai dev` for the AI worker.

## Common commands

| Command                              | What it does                                                 |
| ------------------------------------ | ------------------------------------------------------------ |
| `pnpm dev`                        | Run all apps in watch mode (Turborepo)                       |
| `pnpm build`                      | Build shared, api and web                                    |
| `pnpm lint`                       | ESLint (web), oxlint (api), Ruff (Python)                    |
| `pnpm typecheck`                  | `tsc` for web, api and shared                                |
| `pnpm db:migrate`                 | Apply pending migrations                                     |
| `pnpm env:init [<env>]`           | Create missing env files from the templates                  |
| `pnpm docker:up` / `docker:down`  | Full development stack in Docker                             |
| `pnpm docker <env> <args>`     | Any Compose command for `development`/`staging`/`production` |

## Database migrations (Prisma Migrate)

**Rules:**

1. **Every schema change goes through a migration.** Never edit the schema by hand, and never use
   `prisma db push` against a shared, staging or production database.
2. **Never modify a migration that has already been applied** (shared locally, staging or production).
   Create a new migration that changes things forward.
3. Review every generated SQL file before committing it.

**Workflow** (in `apps/api`):

```bash
# 1. Add/modify models in prisma/schema.prisma
pnpm db:migrate:create --name create_comments   # writes prisma/migrations/<ts>_create_comments/migration.sql
# 2. Review the SQL, then apply:
pnpm db:migrate:dev
pnpm db:status
```

- The DB URL comes from `DATABASE_URL`. `?schema=app` puts every API table in the `app` Postgres schema.
- The Prisma client is generated into `src/generated/prisma` by every API script (`prisma generate`).

## Background jobs (BullMQ)

- The contract lives in `packages/shared/src/jobs.ts`: the queue name (`ai-jobs`), job names and payloads.
  The Python handlers in `apps/ai/src/acms_ai/worker/jobs/` mirror it. Changing a name or payload is a breaking change on both sides.
- Producer: inject `AiJobsProducer` and call `enqueue(AiJobName.X, payload)`. The request id travels with the job.
- Consumer: add an async handler to `HANDLERS` in `acms_ai/worker/jobs/__init__.py`. Handlers must be idempotent
  (jobs are retried 3× with exponential backoff) and return JSON-serializable results.
- Results return to the API through BullMQ events (`AiJobsEvents`).
- Redis runs with `maxmemory-policy noeviction`, as BullMQ requires.

## AI inference (vLLM)

`ModerationService` runs the rule checks first. Only when every rule passes does it ask the configured analyzer
(`AI_ANALYZER`):

- `vllm` (default): `VllmCommentAnalyzer` sends the comment to vLLM's `/v1/chat/completions` with the same prompt
  as training (`modules/moderation/analysis/moderation-prompt.ts`, mirrors `acms_ai.training.prompt`), JSON schema
  output, temperature 0 and token logprobs. The answer is validated (`label` in `valid` / `question` / `invalid`,
  `reason` a string), and the confidence is the probability of the chosen label among the three labels.
- `stub`: marks every comment that passes the rules as valid. Allowed only when `APP_ENV` is `local`, `test` or
  `development`; the API refuses to start otherwise.

Fail-safe: a timeout (`VLLM_TIMEOUT_MS`), a transport or HTTP error, an invalid answer or a missing confidence
leaves the comment **unchecked** (result fields `null`). A non-question answer below `AI_CONFIDENCE_THRESHOLD` is
also left unchecked. Nothing is ever marked valid because inference failed.

| Variable (apps/api)       | Default            | Meaning                                                          |
| ------------------------- | ------------------ | ---------------------------------------------------------------- |
| `AI_ANALYZER`             | `vllm`             | `vllm` or `stub` (stub: local/test/development only)             |
| `AI_CONFIDENCE_THRESHOLD` | `0.85`             | Minimum confidence to store a non-question AI result             |
| `VLLM_URL`                | `http://localhost:8000` | vLLM server root (Compose: `VLLM_COMPOSE_URL`, default `http://vllm:8000`) |
| `VLLM_MODEL`              | `acms-moderation`  | Served LoRA adapter name (`--lora-modules <name>=<dir>`)         |
| `VLLM_API_KEY`            | empty              | Bearer token, if vLLM was started with an API key                |
| `VLLM_TIMEOUT_MS`         | `30000`            | Inference timeout                                                |

Run vLLM with the base model and the adapter of a training run (the base model is never modified):

```bash
# Docker (GPU host): uses VLLM_BASE_MODEL, VLLM_ADAPTER_DIR, VLLM_MODEL ... from apps/api/.env.<env>
pnpm docker production --profile vllm up -d

# Or directly:
vllm serve Qwen/Qwen3-1.7B --enable-lora --max-lora-rank 16 --max-logprobs 20 \
  --lora-modules acms-moderation=apps/ai/training/outputs/qwen3-1.7b-lora-v1/adapter
```

`GET /api/v1/health` reports `ai_service` as healthy when vLLM lists `VLLM_MODEL` (or always, with the stub).

## LoRA fine-tuning (offline)

`acms_ai.training` trains a LoRA adapter for Qwen3-1.7B on labeled JSONL exports, tunes thresholds on the
validation split and evaluates once on a held-out test split. The base model stays frozen and unmodified.
It runs on a GPU machine, not in the production containers; its adapter is then served by vLLM. See [`apps/ai/training/README.md`](apps/ai/training/README.md).

## Environment variables

There is **no `.env` at the repository root**. Each project keeps its own files, and Docker picks them by environment.

Each app has **one template, `.env.example`**, for all of its env files:

| File                                   | Used by                                   |
| -------------------------------------- | ----------------------------------------- |
| `apps/api/.env`                        | API on the host (`pnpm dev`)           |
| `apps/ai/.env`                         | AI worker on the host                     |
| `apps/web/.env.local`                  | Web on the host                           |
| `apps/api/.env.<env>`                  | `api` + `migrate`, Postgres credentials   |
| `apps/ai/.env.<env>`                   | `ai-worker` container                     |
| `apps/web/.env.<env>`                  | `web` image build args (`NEXT_PUBLIC_*`)  |

The templates use host values (`localhost`). Inside Docker, Compose overrides the in-network addresses:
`DATABASE_URL` (built from `POSTGRES_*`), `REDIS_URL` and `VLLM_URL`, plus `APP_ENV`, `NODE_ENV`, `PORT` and `TZ`.

`<env>` is `development`, `staging` or `production`. `pnpm docker <env> …` (`scripts/docker.mjs`) does three things:

- sets `APP_ENV=<env>` in every container,
- runs the stack as its own Compose project, `acms-<env>`, with separate containers, network and data volumes,
- refuses to start a service whose env file is missing, and prints the `cp` command that fixes it.

`pnpm env:init` creates the host files and `pnpm env:init <env>` creates the Docker files, both from
`.env.example`. Existing files are never overwritten. Only the templates are committed: every real `.env*` file is
git-ignored. Real environment variables always take precedence.

Values that must agree across files:

- `VLLM_API_KEY` (apps/api) = the API key vLLM runs with, and `VLLM_MODEL` = its `--lora-modules` name.
- `POSTGRES_USER/PASSWORD/DB` in `apps/api/.env.<env>` create the database, and Compose builds the in-network
  `DATABASE_URL` from them (keep the password URL-safe). On the host, `DATABASE_URL` in `apps/api/.env` must use
  the same credentials as `apps/api/.env.development`.
- `NEXT_PUBLIC_API_URL` (apps/web) is the API URL **as seen from the browser**. It is inlined at build time, so rebuild after changing it.
- `LOG_FORMAT=json` is meant for log shipping.

## Cross-cutting conventions

**Response envelope.** Every API response uses the same envelope.
`code` is the HTTP status and `timestamp` is ISO 8601 UTC:

```json
{ "code": 200, "message": "Success", "data": { }, "timestamp": "2026-11-13T13:00:00.000Z" }
```

Clients read `data`. In the API, `ResponseEnvelopeInterceptor` wraps what controllers return.

**Errors.** Errors use the same envelope with `data: null`, plus the machine-readable error code:

```json
{ "code": 404, "message": "…", "data": null, "error": { "code": "not_found", "details": null, "request_id": "…" }, "timestamp": "…" }
```

- API: throw an `AppException` subclass (`NotFoundException`, `ConflictException`, …) from
  `src/common/errors/app.exception.ts`. Nest `HttpException`s and Prisma `P2002`/`P2025` are mapped too.
  Unexpected errors are logged with a stack trace and returned as a generic `internal_error`.
- AI (worker and training): raise an `AppError` subclass from `acms_ai.core.errors`.
- vLLM failures never reach the browser: the comment stays unchecked and the API logs a warning.
- Web: `apiClient` throws `ApiError` (`status`, `code`, `details`, `requestId`).
- The shared types live in `packages/shared/src/api.ts`.

**Request ids.** Clients may send `X-Request-ID`. Otherwise one is generated. It is echoed in the response,
added to every log line, forwarded to vLLM and attached to queued jobs.

**Health checks.**

| Endpoint                         | Purpose                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| `GET :4000/api/v1/health`        | Readiness: database, redis, ai_service, worker. 503 if degraded |
| `GET :4000/api/v1/health/live`   | API liveness (Docker healthcheck)                              |
| `GET vllm:8000/health`           | vLLM liveness (Compose healthcheck)                            |
| `python -m acms_ai.worker.healthcheck` | AI worker liveness (heartbeat file)                      |
| `GET :3000/api/health`           | Web liveness                                                   |

**Time zone: UTC+8.** The project time zone is `Asia/Shanghai` (`APP_TIME_ZONE` in `packages/shared/src/time.ts`,
mirrored by `acms_ai.core.timezone`). It has no DST.

- Store and transfer instants in UTC: DB columns are `@db.Timestamptz(3)`, JSON uses ISO 8601 with an offset (`…Z`).
- Use UTC+8 for calendar logic ("today", "this month", schedules, reports) and for display.
- Web: format every date with `formatDateTime` / `formatDate` / `formatTime` from `src/lib/datetime.ts`.
  These always render UTC+8, whatever the browser's zone.
- Logs: the API sets `process.env.TZ` at startup, and Python log timestamps are rendered as `…+08:00`.
  Compose also sets `TZ` (and `PGTZ` for Postgres).

**Languages (web).** The UI supports Simplified Chinese (`zh-CN`, **default**) and English (`en`), with
locale-prefixed URLs: `/zh-CN/...`, `/en/...`.

- `src/proxy.ts` redirects a URL without a locale (e.g. `/`) to the last language used (`NEXT_LOCALE` cookie),
  or to `zh-CN` if there is none.
- Dictionaries: `src/i18n/dictionaries/zh-CN.ts` is the source of truth. `en.ts` must implement the same
  `Dictionary` type, so a missing key is a type error. Placeholders use `{name}` with `format()`.
- Server Components: `const dict = await getDictionary()` from `@/i18n/server`.
  Client Components: `const { dict, locale } = useI18n()` from `@/i18n`.
- Never show the API's `error.message` to users. Use `apiErrorMessage(error, dict)`, which translates by `error.code`.
- To add a page, create it under `src/app/[lang]/`. Unknown paths render the localized `[lang]/not-found.tsx`.

**Module boundaries.**
- API: controllers stay thin and business logic lives in services. Infrastructure clients are global providers in `src/infrastructure`.
- AI: shared code lives in `core/`; `core` never imports `worker` or `training`, and they never import each other.
- Web: server state lives in TanStack Query and client UI state in Zustand. Each feature goes in `features/<name>`.

## Troubleshooting

- **Port already in use**: change `POSTGRES_PORT`, `REDIS_PORT`, `API_PORT` or `WEB_PORT` as an environment variable (`POSTGRES_PORT=5433 pnpm docker:up`) or in `apps/api/.env.<env>`.
  Two environments running at once need different ports.
- **Web shows "API unreachable"**: check `NEXT_PUBLIC_API_URL`, and that the web origin is listed in `CORS_ORIGINS`.
  For the Docker image, rebuild after changing it (it is a build arg).
- **Health shows `worker: No workers connected`**: start the AI worker, and check that it uses the same `REDIS_URL` (and db) as the API.
- **Health shows `ai_service` error**: check that vLLM is running, that `VLLM_URL` is correct, that it serves `VLLM_MODEL`, and that `VLLM_API_KEY` matches.
- **Comments stay unchecked**: look for `Analysis failed` or `below` in the API log (vLLM error, timeout, invalid answer, or confidence below `AI_CONFIDENCE_THRESHOLD`).
- **`Invalid environment configuration`** on API start: the message lists every invalid variable. Compare with `apps/api/.env.example`.
