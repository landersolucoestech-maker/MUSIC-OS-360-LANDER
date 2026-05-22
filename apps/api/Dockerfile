# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine3.21 AS builder

# Patch Alpine system packages before build to reduce scanner findings
RUN apk upgrade --no-cache

RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

WORKDIR /app

# Copy workspace manifests (allows pnpm to resolve the monorepo graph)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/auth/package.json          ./packages/auth/
COPY packages/config/package.json        ./packages/config/
COPY packages/observability/package.json ./packages/observability/
COPY packages/schemas/package.json       ./packages/schemas/
COPY packages/types/package.json         ./packages/types/
COPY packages/ui/package.json            ./packages/ui/
COPY packages/utils/package.json         ./packages/utils/

RUN pnpm install --frozen-lockfile

# Copy source after deps to maximise layer cache hits
COPY apps/api/  ./apps/api/
COPY packages/  ./packages/

RUN pnpm --filter @music-os-360/api build

# ─── Stage 2: Production (distroless — no shell, no package manager, minimal CVEs) ──
FROM gcr.io/distroless/nodejs20-debian12:nonroot AS production

LABEL org.opencontainers.image.title="MUSIC OS 360 API"
LABEL org.opencontainers.image.description="Enterprise Music Management SaaS — NestJS API"

WORKDIR /app

# Copy prod dependencies from builder
COPY --from=builder --chown=65532:65532 /app/node_modules        ./node_modules
COPY --from=builder --chown=65532:65532 /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=65532:65532 /app/apps/api/dist        ./apps/api/dist
COPY --from=builder --chown=65532:65532 /app/packages             ./packages

# distroless:nonroot already runs as UID 65532 — no USER directive needed

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# No shell in distroless — configure platform health check externally:
#   Railway / Render / Fly.io → HTTP GET /api/v1/health/live → expect 200
WORKDIR /app/apps/api

CMD ["dist/main.js"]
