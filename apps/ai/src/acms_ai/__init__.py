"""AI Comment Moderation - Python AI package.

One package, two entrypoints sharing `core/` and `modules/`:

- `acms_ai.server`: internal HTTP API (FastAPI), called synchronously by the NestJS API.
  Run: `uvicorn acms_ai.server.main:app`
- `acms_ai.worker`: BullMQ consumer of the `ai-jobs` queue published by the NestJS API.
  Run: `python -m acms_ai.worker`

Stateless: owns no database. Persistence belongs to the NestJS API.
"""
