# syntax=docker/dockerfile:1
# NestJS API. Build context: repository root.
#   docker build -f infrastructure/docker/api.Dockerfile --target api     .   # the API
#   docker build -f infrastructure/docker/api.Dockerfile --target migrate .   # `prisma migrate deploy`

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS base
ENV TURBO_TELEMETRY_DISABLED=1 \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    PNPM_STORE_DIR=/pnpm/store
RUN corepack enable
WORKDIR /repo

# ---------- prune: keep only @acms/api and its workspace dependencies ----------
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.11.11 prune @acms/api --docker

# ---------- builder: install everything, build shared + api ----------
FROM base AS builder
COPY --from=pruner /repo/out/json/ ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ ./
RUN pnpm turbo run build --filter=@acms/api

# ---------- migrate: full toolchain (Prisma CLI is a dev dependency) ----------
FROM builder AS migrate
WORKDIR /repo/apps/api
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

# ---------- prod-deps: runtime dependencies only ----------
FROM builder AS prod-deps
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    rm -rf node_modules apps/*/node_modules packages/*/node_modules \
    && pnpm install --frozen-lockfile --prod --offline

# ---------- api runtime ----------
FROM node:${NODE_VERSION}-alpine AS api
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /repo
RUN addgroup -S app && adduser -S app -G app
COPY --from=prod-deps --chown=app:app /repo/node_modules ./node_modules
COPY --from=prod-deps --chown=app:app /repo/package.json ./package.json
COPY --from=prod-deps --chown=app:app /repo/packages/shared/package.json ./packages/shared/package.json
COPY --from=prod-deps --chown=app:app /repo/packages/shared/dist ./packages/shared/dist
COPY --from=prod-deps --chown=app:app /repo/apps/api/package.json ./apps/api/package.json
COPY --from=prod-deps --chown=app:app /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps --chown=app:app /repo/apps/api/dist ./apps/api/dist
WORKDIR /repo/apps/api
USER app
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/v1/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "dist/main.js"]
