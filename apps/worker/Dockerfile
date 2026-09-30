# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

# Copy root & workspace package manifests
COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/web/package.json ./apps/web/

RUN npm ci

# Copy source code and Prisma schema
COPY packages/types ./packages/types
COPY packages/shared ./packages/shared
COPY apps/api/prisma ./apps/api/prisma
COPY apps/worker ./apps/worker

# Build dependencies and worker service
RUN npm run build:types
RUN npm run build:shared
RUN npm run prisma:generate
RUN npm run build:worker

# Prune development dependencies
RUN npm prune --omit=dev

# Stage 2: Production Minimal Runtime
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl dumb-init

ENV NODE_ENV=production
ENV WORKER_PORT=3001

# Create unprivileged runtime user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 workeruser

COPY --from=builder --chown=workeruser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=workeruser:nodejs /app/package.json ./package.json
COPY --from=builder --chown=workeruser:nodejs /app/packages/types ./packages/types
COPY --from=builder --chown=workeruser:nodejs /app/packages/shared ./packages/shared
COPY --from=builder --chown=workeruser:nodejs /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=builder --chown=workeruser:nodejs /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder --chown=workeruser:nodejs /app/apps/api/prisma ./apps/api/prisma

USER workeruser

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/worker/dist/main"]
