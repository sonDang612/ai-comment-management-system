# syntax=docker/dockerfile:1
# Python AI package (apps/ai). Build context: repository root.
# Production runs only the BullMQ worker. Online inference is served by TEI (see docker-compose.yml),
# and classifier training runs offline on a training machine, not in this image.
#   docker build -f infrastructure/docker/python.Dockerfile --target ai-worker .

ARG PYTHON_VERSION=3.12

FROM ghcr.io/astral-sh/uv:0.13 AS uv

# ---------- builder: resolve and install dependencies into /app/.venv ----------
FROM python:${PYTHON_VERSION}-slim AS builder
COPY --from=uv /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/app/.venv
WORKDIR /src

# Dependencies first (cached layer): only lock + manifests.
COPY pyproject.toml uv.lock .python-version ./
COPY apps/ai/pyproject.toml apps/ai/pyproject.toml
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-workspace --package acms-ai

# Then the source; install the package as a regular (non-editable) package.
COPY apps/ai apps/ai
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-editable --package acms-ai

# ---------- runtime base ----------
FROM python:${PYTHON_VERSION}-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:${PATH}"
RUN groupadd --system app && useradd --system --gid app --home-dir /app app
WORKDIR /app
COPY --from=builder --chown=app:app /app/.venv /app/.venv
USER app

# ---------- Worker (BullMQ consumer) ----------
FROM runtime AS ai-worker
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
    CMD ["python", "-m", "acms_ai.worker.healthcheck"]
CMD ["python", "-m", "acms_ai.worker"]
