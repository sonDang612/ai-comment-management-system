# AI Comment Moderation

Monorepo for the AI Comment Moderation service (requirements: [`docs/requirements/v_1.0.md`](docs/requirements/v_1.0.md)).
This is the **foundation only**: infrastructure, conventions and health checks. No business features yet.

```
web (Next.js) ──HTTP──▶ api (NestJS) ──HTTP + X-Internal-Token──▶ ai-server (FastAPI, internal) ┐ apps/ai:
                         │   │                                                                    │ one Python package,
                         │   └──BullMQ (Redis)──▶ ai-worker (BullMQ consumer) ────────────────────┘ two entrypoints
                         │                           └── results via BullMQ events ──▶ api
                         └──Prisma──▶ PostgreSQL
```

| Layer          | Stack                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------- |
| Frontend       | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Zustand, TanStack Query |
| Main API       | NestJS 12 (ESM), Prisma 7 (`@prisma/adapter-pg`), BullMQ producer, Vitest                |
| AI server      | `apps/ai` → `acms_ai.server`: Python 3.12, FastAPI, Pydantic v2. Internal, called by the API |
| AI worker      | `apps/ai` → `acms_ai.worker`: BullMQ (Python) consumer of the `ai-jobs` queue            |
| Database       | PostgreSQL 17 (tables in the `app` schema), migrations by Prisma Migrate                 |
| Cache / Queue  | Redis 7                                                                                  |
| Monorepo       | Turborepo + npm workspaces (JS), uv workspace (Python)                                   |
| Infrastructure | Docker Compose                                                                           |

**Who owns what.** The NestJS API is the only public backend and the only owner of the database schema.
`apps/ai` is one Python package with two entrypoints that share the same `core/` and `modules/` code: the server
does stateless inference over HTTP for synchronous calls, and the worker runs long or batch AI work from the queue.
Python never writes business tables directly: results go back to the API.

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
│   │       ├── infrastructure/   # prisma, redis, queue (BullMQ), ai-service (HTTP client)
│   │       ├── modules/<x>/      # feature modules (controller / service / *.spec.ts)
│   │       └── generated/prisma/ # generated client (git-ignored)
│   └── ai/                       # Python: one package (acms_ai), two entrypoints
│       ├── src/acms_ai/
│       │   ├── core/             # shared: settings base, logging, request context, AppError
│       │   ├── modules/<x>/      # shared feature logic (service.py), plus router.py/schemas.py
│       │   ├── server/           # entrypoint 1: FastAPI app, middleware, auth, error envelope
│       │   └── worker/           # entrypoint 2: BullMQ consumer, processor, jobs/, healthcheck
│       └── tests/{server,worker}/
├── packages/
│   └── shared/                   # TS contracts: error envelope, health types, queue + job names
├── infrastructure/docker/        # api / python / web Dockerfiles + docker-compose.yml
├── scripts/                      # docker.mjs (Compose per environment), env-init.mjs
├── package.json / turbo.json     # npm workspaces + Turborepo pipeline
└── pyproject.toml / uv.lock      # uv workspace (apps/ai)
```

`apps/ai` also has a small `package.json` so Turborepo can run its `dev` / `lint` / `test` tasks (they call `uv`).
Its `turbo.json` makes `dev` start the server and the worker together (`dev` + `dev:worker`).

## Prerequisites

- Node.js ≥ 22.18 (runs `scripts/*.ts` natively) and npm ≥ 10
- [uv](https://docs.astral.sh/uv/getting-started/installation/) ≥ 0.9 (uv installs Python 3.12 itself)
- Docker with Docker Compose v2

## Quick start: everything in Docker

```bash
npm run env:init -- development   # apps/*/.env.development
npm run docker:up                 # = npm run docker -- development up -d --build
```

Other environments use the same wrapper with their own files, e.g.
`npm run env:init -- production`, edit the secrets, then `npm run docker -- production up -d --build`.

| Service  | URL                                   |
| -------- | ------------------------------------- |
| Web      | http://localhost:3000                 |
| API      | http://localhost:4000/api/v1          |
| Health   | http://localhost:4000/api/v1/health   |

The AI server is not published to the host. Only the API calls it, inside the Compose network.
The `migrate` service runs `prisma migrate deploy` once, and `api` starts only after it succeeds.
To stop the stack, run `npm run docker:down`. Data volumes are kept; remove them only on purpose with `npm run docker -- <env> down -v`.

## Local development: apps on the host, infra in Docker

```bash
npm run env:init                                      # apps/api/.env, apps/ai/.env, apps/web/.env.local
npm run env:init -- development                       # apps/api/.env.development (postgres credentials)
npm install
uv sync                                               # Python workspace -> .venv

npm run docker -- development up -d postgres redis   # development postgres + redis only
npm run db:migrate                                    # prisma migrate deploy
npm run dev                                           # web :3000, api :4000, ai-server :8000, ai-worker
npm run queue:smoke --workspace @acms/api             # optional: API -> queue -> worker round trip
```

`AI_SERVICE_TOKEN` (api) and `INTERNAL_API_TOKEN` (apps/ai) must have the same value.
You can also run one app on its own, e.g. `npx turbo run dev --filter @acms/api`, or `--filter @acms/ai`
for both AI processes. One AI process alone: `npm run dev --workspace @acms/ai` (server) or
`npm run dev:worker --workspace @acms/ai`.

## Common commands

| Command                              | What it does                                                 |
| ------------------------------------ | ------------------------------------------------------------ |
| `npm run dev`                        | Run all apps in watch mode (Turborepo)                       |
| `npm run build`                      | Build shared, api and web                                    |
| `npm run lint`                       | ESLint (web), oxlint (api), Ruff (Python)                    |
| `npm run typecheck`                  | `tsc` for web, api and shared                                |
| `npm run test`                       | Vitest (api), pytest (apps/ai)                               |
| `uv run pytest`                      | Every Python suite, from the repo root                       |
| `npm run db:migrate`                 | Apply pending migrations                                     |
| `npm run env:init [-- <env>]`        | Create missing env files from the templates                  |
| `npm run docker:up` / `docker:down`  | Full development stack in Docker                             |
| `npm run docker -- <env> <args>`     | Any Compose command for `development`/`staging`/`production` |

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
npm run db:migrate:create -- --name create_comments   # writes prisma/migrations/<ts>_create_comments/migration.sql
# 2. Review the SQL, then apply:
npm run db:migrate:dev
npm run db:status
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

## Environment variables

There is **no `.env` at the repository root**. Each project keeps its own files, and Docker picks them by environment.

| File                                   | Used by                                   | Template                 |
| -------------------------------------- | ----------------------------------------- | ------------------------ |
| `apps/api/.env`                        | API on the host (`npm run dev`)           | `.env.example`           |
| `apps/ai/.env`                         | AI server + worker on the host            | `.env.example`           |
| `apps/web/.env.local`                  | Web on the host                           | `.env.example`           |
| `apps/api/.env.<env>`                  | `api` + `migrate`, Postgres credentials   | `.env.docker.example`    |
| `apps/ai/.env.<env>`                   | `ai-server` + `ai-worker` containers      | `.env.docker.example`    |
| `apps/web/.env.<env>`                  | `web` image build args (`NEXT_PUBLIC_*`)  | `.env.docker.example`    |

`<env>` is `development`, `staging` or `production`. `npm run docker -- <env> …` (`scripts/docker.mjs`) does three things:

- sets `APP_ENV=<env>` in every container,
- runs the stack as its own Compose project, `acms-<env>`, with separate containers, network and data volumes,
- refuses to start a service whose env file is missing, and prints the `cp` command that fixes it.

`npm run env:init` creates the host files and `npm run env:init -- <env>` creates the Docker files, both from the
templates. Existing files are never overwritten. Only the templates are committed: every real `.env*` file is
git-ignored. Real environment variables always take precedence.

Values that must agree across files:

- `AI_SERVICE_TOKEN` (apps/api) = `INTERNAL_API_TOKEN` (apps/ai).
- The credentials in `DATABASE_URL` = `POSTGRES_USER/PASSWORD/DB`, both in `apps/api/.env.<env>`. On the host,
  `apps/api/.env` must use the same credentials as `apps/api/.env.development`.
- `NEXT_PUBLIC_API_URL` (apps/web) is the API URL **as seen from the browser**. It is inlined at build time, so rebuild after changing it.
- `APP_ENV=production` disables the AI server's `/docs`. `LOG_FORMAT=json` is meant for log shipping.

## Cross-cutting conventions

**Errors.** Every non-2xx response, from the API and from the AI server, uses the same envelope:

```json
{ "error": { "code": "not_found", "message": "…", "details": null, "request_id": "…" } }
```

- API: throw an `AppException` subclass (`NotFoundException`, `ConflictException`, …) from
  `src/common/errors/app.exception.ts`. Nest `HttpException`s and Prisma `P2002`/`P2025` are mapped too.
  Unexpected errors are logged with a stack trace and returned as a generic `internal_error`.
- AI (server and worker): raise an `AppError` subclass from `acms_ai.core.errors`. Its failures reach the browser
  only as the API's `service_unavailable`.
- Web: `apiClient` throws `ApiError` (`status`, `code`, `details`, `requestId`).
- The shared types live in `packages/shared/src/api.ts`.

**Request ids.** Clients may send `X-Request-ID`. Otherwise one is generated. It is echoed in the response,
added to every log line, forwarded to the AI server and attached to queued jobs.

**Health checks.**

| Endpoint                         | Purpose                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| `GET :4000/api/v1/health`        | Readiness: database, redis, ai_service, worker. 503 if degraded |
| `GET :4000/api/v1/health/live`   | API liveness (Docker healthcheck)                              |
| `GET ai-server:8000/health`      | AI server readiness (`/health/live` for liveness)              |
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
- AI: shared code lives in `core/` and `modules/`; `core` never imports `server` or `worker`, and
  `server` and `worker` never import each other. Server: `/health*` is public. Everything under `/v1` requires `X-Internal-Token`.
- Web: server state lives in TanStack Query and client UI state in Zustand. Each feature goes in `features/<name>`.

## Troubleshooting

- **Port already in use**: change `POSTGRES_PORT`, `REDIS_PORT`, `API_PORT` or `WEB_PORT` as an environment variable (`POSTGRES_PORT=5433 npm run docker:up`) or in `apps/api/.env.<env>`.
  Two environments running at once need different ports.
- **Web shows "API unreachable"**: check `NEXT_PUBLIC_API_URL`, and that the web origin is listed in `CORS_ORIGINS`.
  For the Docker image, rebuild after changing it (it is a build arg).
- **Health shows `worker: No workers connected`**: start the AI worker, and check that it uses the same `REDIS_URL` (and db) as the API.
- **Health shows `ai_service` error**: check that the AI server is running, that `AI_SERVICE_URL` is correct, and that the tokens match.
- **`Invalid environment configuration`** on API start: the message lists every invalid variable. Compare with `apps/api/.env.example`.
