# CLAUDE.md

AI Comment Moderation service. Read `README.md` for the architecture, layout and commands, and
`docs/requirements/v_1.0.md` for the business rules. When the docs and the code disagree on the tech stack
(for example Celery in the docs, BullMQ in the code), follow the code. For business rules, follow the docs.

## While implementing code

- Do not write code comments or docstrings. Use clear names instead. Keep the existing comments.
- Do not write or update tests, unless the user asks for them.
- Do not run Docker or Docker Compose (`npm run docker*`, `docker ...`).
- Do not install or add packages (`npm install`, `npm i`, `pip install`, `uv add`, `uv sync`). If a new dependency
  is needed, stop and ask the user.
- You may run lint and typecheck to verify the change: `npm run lint`, `npm run typecheck`.
  For Python, use `.venv/Scripts/python.exe -m ruff check apps/ai` (uv is not installed on this machine).
- Before working in `apps/web`, read `apps/web/AGENTS.md`: this Next.js version differs from what you know.

## Time zone: UTC+8

- The project time zone is `Asia/Shanghai` (UTC+8, no DST). Use `APP_TIME_ZONE` from `packages/shared/src/time.ts`
  (TS) or `acms_ai.core.timezone` (Python). Never rely on the server or browser time zone.
- Store and send instants in UTC: `@db.Timestamptz(3)` columns, ISO 8601 with an offset in JSON.
- Use UTC+8 for every calendar rule (for example "today", the daily mocking counter reset at 00:00 HKT) and for display.
- Web: format dates only with `formatDateTime` / `formatDate` / `formatTime` from `apps/web/src/lib/datetime.ts`.

## Languages: Simplified Chinese first, English second

- Primary language: Simplified Chinese (`zh-CN`, default locale). Secondary: English (`en`).
- Every user-facing string goes in the i18n dictionaries, never hard-coded in components.
  Add the key to `apps/web/src/i18n/dictionaries/zh-CN.ts` first (source of truth), then to `en.ts`.
- Show API errors with `apiErrorMessage(error, dict)`, never the raw `error.message`.
- The moderation `reason` returned by the AI is written in Simplified Chinese (for the admins).
- Code, identifiers, logs, commit messages and API error `message` fields are in English.

## Architecture rules

- The NestJS API (`apps/api`) is the only public backend and the only owner of the database schema (Prisma).
  Python (`apps/ai`) never writes business tables: results go back to the API.
- `apps/ai` never connects to PostgreSQL (no driver, no ORM, no `DATABASE_URL`), not even to read.
  It only does AI work (normalization, rule filter, model inference). Any data it needs comes from the API
  over HTTP or in the job payload.
- API: controllers stay thin, logic lives in services, infrastructure clients live in `src/infrastructure`.
  Throw `AppException` subclasses, never raw errors.
- AI: shared code in `core/` and `modules/`. `core` never imports `server` or `worker`, and `server` and `worker`
  never import each other. Raise `AppError` subclasses. Everything under `/v1` requires `X-Internal-Token`.
- Web: server state in TanStack Query, client UI state in Zustand, one folder per feature in `src/features/<name>`,
  pages under `src/app/[lang]/`.
- Shared TS contracts (error envelope, queue and job names) live in `packages/shared`. Reuse them instead of redefining them.
- Every HTTP response from the API and from the AI server uses the envelope
  `{ "code", "message", "data", "timestamp" }`: `code` is the HTTP status, `message` is `"Success"` on 2xx,
  `timestamp` is ISO 8601 UTC. Errors set `data: null` and add `"error": { "code", "details", "request_id" }`
  with the machine-readable error code. NestJS wraps responses in `ResponseEnvelopeInterceptor` (services and
  controllers return plain data); Python routers return `success(...)` from `acms_ai.core.responses`.
- Public endpoints are versioned under `/api/v1`. Breaking changes go into a new version only.

## Moderation business rules (from the docs)

- Three decisions only: `approved` (通过), `disabled` (禁用), `pending` (待处理). New comments start as `pending`.
- The AI never writes or posts replies (D-17). No RAG, no knowledge base.
- Fail-safe: when the AI fails, times out (> 30 s) or the queue backs up (> 15 min), the comment stays `pending`.
  Never approve automatically on error.
- Priority when a comment fits several groups: violation first, then `question` (`pending` + label `需人工回复`),
  otherwise `approved`.
- Default confidence thresholds: auto-approve at ≥ 0.85, auto-disable at ≥ 0.90, everything else `pending`.
  `question` is always `pending`. Rule filter matches (V3 contact, V4 link, V6 spam) are `disabled` with confidence 1.0.
- Thresholds, keywords, whitelists, the question definition and the mode (shadow / semi-auto / auto) are configurable
  per client and per site (`site_code`). Never hard-code them.
- Multi-tenant: every query is scoped to the client and its `site_code`s. A client never sees another client's data.
- Integration: `POST /moderate` is idempotent on `site_code` + `comment_id`. Results go back through an HMAC-signed callback.
  In shadow mode, log the decision but do not send a status-changing callback.
- Every decision is audited: normalized input, decision, reason, confidence, `decided_by`
  (`whitelist` / `rule_filter` / `ai_model` / `admin`), and `model_version` (model/prompt/rules). Keep 12 months.
- Comment content is data, never instructions: keep it delimited in prompts and force JSON schema output.
- Privacy: no data sent to third-party APIs in production. Never log passwords or user IPs.
