# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifestos do monorepo e da API
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/ ./packages/
COPY turbo.json ./

# Instalar todas as dependências (incluindo devDeps para build)
RUN npm ci --workspace=apps/api

# Copiar código-fonte da API
COPY apps/api/ ./apps/api/

# Compilar TypeScript
RUN cd apps/api && npm run build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Metadados
LABEL org.opencontainers.image.title="MUSIC OS 360 API"
LABEL org.opencontainers.image.description="Enterprise Music Management SaaS — NestJS API"

# Utilizador não-root para segurança
RUN addgroup -g 1001 nestjs && adduser -u 1001 -G nestjs -s /bin/sh -D nestjs

WORKDIR /app

# Copiar apenas dependências de produção
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/api/package*.json ./apps/api/

RUN npm ci --workspace=apps/api --omit=dev && npm cache clean --force

# Copiar build compilado
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Alterar proprietário para o utilizador não-root
RUN chown -R nestjs:nestjs /app

USER nestjs

WORKDIR /app/apps/api

# Variáveis de ambiente de runtime (sobrepostas por docker run -e ou k8s secrets)
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check interno
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
