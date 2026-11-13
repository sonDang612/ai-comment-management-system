# syntax=docker/dockerfile:1
# Python AI package (apps/ai). Build context: repository root.
# One build, two targets that differ only in command and healthcheck (all layers are shared):
#   docker build -f infrastructure/docker/python.Dockerfile --target ai-server .
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

# ---------- HTTP server (internal, called only by the NestJS API) ----------
FROM runtime AS ai-server
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
    CMD ["python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health/live', timeout=2).status == 200 else 1)"]
CMD ["uvicorn", "acms_ai.server.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log", "--proxy-headers"]

# ---------- Worker (BullMQ consumer) ----------
FROM runtime AS ai-worker
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
    CMD ["python", "-m", "acms_ai.worker.healthcheck"]
CMD ["python", "-m", "acms_ai.worker"]
