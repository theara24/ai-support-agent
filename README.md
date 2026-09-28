# AI Support Agent Platform — Production-Ready Customer Support SaaS

[![Architecture](https://img.shields.io/badge/Architecture-Clean%20Monorepo-blue)](#architecture)
[![Backend](https://img.shields.io/badge/Backend-NestJS%20%7C%20Prisma%20%7C%20BullMQ-red)](#technology-stack)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js%20%7C%20Tailwind%20%7C%20TanStack-black)](#technology-stack)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20pgvector-blue)](#database)

An enterprise-grade, multi-tenant **AI Customer Support Platform** supporting hybrid AI-human customer service workflows, RAG knowledge retrieval, real-time WebSockets, background processing, and Telegram bot integration.

---

## Architecture Diagram

```text
                    ┌─────────────┐
                    │   Customer  │
                    └──────┬──────┘
                           │
                    Web / Telegram
                           │
                           ▼
                    ┌─────────────┐
                    │  NestJS API │
                    └──────┬──────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
 PostgreSQL              Redis              BullMQ
 (pgvector)                                    │
       │                                       ▼
       │                                   Worker
       │                                       │
       └──────────────────┬────────────────────┘
                          ▼
                    ┌─────────────┐
                    │ AI Agent    │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              Knowledge Base   AI Tools
```

---

## Key Features

- 🤖 **Provider-Agnostic LLM Engine**: Supports Google Gemini, OpenAI, and Anthropic via abstract provider adapters.
- 📚 **RAG Knowledge Base**: Native PostgreSQL `pgvector` similarity search powered by BullMQ background document processing.
- ⚡ **Real-time Handoff Workflow**: Socket.IO-powered live chat with agent typing status, seamless human takeover, and internal support notes.
- 📲 **Telegram Bot Integration**: Reusable channel abstraction bridging Telegram Webhooks to unified conversation management logic.
- 🔐 **Enterprise Security & RBAC**: JWT Access/Refresh tokens, bcrypt password hashing, input validation, and role-based permissions (`SUPER_ADMIN`, `ADMIN`, `SUPPORT_AGENT`, `CUSTOMER`).
- 📊 **Analytics & Audit Logging**: Real-time tracking of AI token costs, resolution metrics, tool execution audit trails, and channel breakdowns.

---

## Technology Stack

- **Backend**: NestJS, TypeScript, Prisma ORM, BullMQ, Socket.IO, Swagger, Zod / class-validator
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, TanStack Query, Zustand
- **Database**: PostgreSQL with `pgvector` extension, Redis
- **Infrastructure**: Docker & Docker Compose

---

## Quick Start

```bash
# 1. Clone repository & configure environment
cp .env.example .env

# 2. Start PostgreSQL & Redis services
docker compose up -d

# 3. Install workspace dependencies
npm install

# 4. Execute migrations
npm run prisma:migrate

# 5. Run application
npm run dev:api     # NestJS REST API & WebSockets (Port 3000)
npm run dev:worker  # Asynchronous Background Worker (Port 3001)
npm run dev:web     # Next.js Admin Dashboard (Port 3002)
```

For detailed documentation, see:
- 📖 [Architecture Overview](docs/architecture.md)
- 🛠️ [Development Setup](docs/development.md)

---

## License
MIT License. Created as a production-grade full-stack portfolio system.
