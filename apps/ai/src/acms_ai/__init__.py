"""AI Comment Moderation - Python AI package.

Entrypoints sharing `core/`:

- `acms_ai.worker`: BullMQ consumer of the `ai-jobs` queue published by the NestJS API.
  Run: `python -m acms_ai.worker`
- `acms_ai.training`: offline LoRA fine-tuning CLI. Run: `python -m acms_ai.training --help`

Online inference does not run here: the NestJS API calls vLLM directly.

Stateless: owns no database. Persistence belongs to the NestJS API.
"""
