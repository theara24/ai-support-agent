# Development & Getting Started Guide

## Prerequisites
- **Node.js**: v20+ (v24.x recommended)
- **Docker & Docker Compose**: Required for running PostgreSQL + pgvector and Redis locally.
- **npm**: Workspace-enabled version (v10+)

---

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Start database and cache services via Docker Compose:
   ```bash
   docker compose up -d
   ```

3. Install monorepo dependencies:
   ```bash
   npm install
   ```

4. Run Prisma database migrations and generate client:
   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```

5. Run services in development mode:
   ```bash
   # Run NestJS API (Port 3000)
   npm run dev:api

   # Run Worker Service (Port 3001)
   npm run dev:worker

   # Run Next.js Admin Dashboard (Port 3002)
   npm run dev:web
   ```

---

## Monorepo Layout

- `apps/api`: Main NestJS API application, WebSockets gateway, and REST controllers.
- `apps/worker`: BullMQ consumer app handling heavy async tasks (PDF chunking, vector embedding, email dispatch).
- `apps/web`: Next.js 14 Admin & Support Staff Dashboard application.
- `packages/shared`: Shared domain utilities, tool definitions, and DTO validations.
- `packages/types`: Core TypeScript interfaces, database enums, and API payload definitions.
- `packages/config`: Common ESLint, Prettier, and TypeScript configurations.
