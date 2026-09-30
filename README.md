# 🤖 AI Support Platform (ប្រព័ន្ធឆ្លើយតបអតិថិជនឆ្លាតវៃ)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.3-red?logo=nestjs)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20pgvector-blue?logo=postgresql)](https://github.com/pgvector/pgvector)
[![Redis](https://img.shields.io/badge/Redis-7.0%20Alpine-red?logo=redis)](https://redis.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5.7-orange)](https://docs.bullmq.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-black?logo=socket.io)](https://socket.io/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-Flash%20Lite-purple?logo=google)](https://ai.google.dev/)
[![Status](https://img.shields.io/badge/Status-Alpha%20%2F%20Early%20Beta-yellow)](#project-status)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

A production-oriented, multi-tenant **Autonomous AI Customer Support & Assistant Platform** engineered with NestJS, PostgreSQL (pgvector), and Next.js 14. Designed to handle high-frequency customer inquiries 24/7 across omnichannel touchpoints (web chat, embeddable website widget, Telegram bot), the system combines semantic knowledge retrieval (RAG with HNSW vector indexing), deterministic tool execution, automated intent classification, conflict-free human agent handoff, and real-time Socket.IO synchronization with strict multi-tenant boundary isolation.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
  subgraph Clients["Customer & Agent Interfaces"]
    Web["Next.js Web App & Agent Dashboard\n(Port 3002)"]
    Widget["Embeddable Floating Widget\n(widget.js)"]
    Telegram["Telegram Bot Webhooks"]
  end

  subgraph API["NestJS Core API Gateway (Port 3000)"]
    Obs["Correlation ID & Logging Interceptors\nHealth Endpoints (/health, /api/health)"]
    Gateway["MessagesGateway (Socket.IO)\nWsJwtGuard & Handshake Verification"]
    REST["REST Controllers (/api/v1)\nStrict Tenant Filtering (organizationId)"]
    Intent["Intent & Capability Router\n(GENERAL, RAG, TOOLS, ESCALATE)"]
    AiService["AiAgentService\n(Takeover Race-Free Execution)"]
    ToolReg["Tool Execution Registry\n(getCurrentTime, getOrderStatus, Tickets)"]
  end

  subgraph Storage["Data & Cache Layer"]
    PG[("PostgreSQL 16 + pgvector (Port 5436)\nHNSW Cosine Index on document_chunks")]
    Redis[("Redis 7.0 (Port 6380)\nPub/Sub & BullMQ Session Store")]
  end

  subgraph Worker["Background Ingestion Worker (Port 3001)"]
    Bull["BullMQ Document Queue"]
    Chunker["Recursive Paragraph Chunker\n(600–800 chars, 100–150 overlap)"]
  end

  subgraph LLM["Generative AI Engine"]
    Gemini["Google Gemini (Flash Lite / text-embedding-004)"]
    DemoAI["Deterministic Local Sandbox (DEMO_AI)"]
  end

  Web -->|HTTP REST / WebSocket + JWT| Obs
  Widget -->|HTTP / WebSocket| Obs
  Telegram -->|Webhook POST| Obs

  Obs --> REST
  Obs --> Gateway
  REST --> PG
  Gateway --> Redis
  Gateway --> PG

  REST --> Bull
  Bull --> Worker
  Worker --> Chunker
  Worker --> PG
  Worker --> LLM

  REST --> Intent
  Intent --> AiService
  AiService --> ToolReg
  AiService --> PG
  AiService --> LLM
  AiService --> Gateway
```

---

## 🌟 Key Technical Highlights

- **Strict Multi-Tenant Isolation**: Every database query across conversations, tickets, messages, knowledge documents, and vector embeddings is strictly constrained by `organizationId`. Prevents cross-tenant IDOR and unauthorized data reads.
- **pgvector RAG with HNSW Indexing**: High-performance approximate nearest neighbor vector similarity search (`vector_cosine_ops`) backed by a dedicated HNSW index on `document_chunks`.
- **Recursive Paragraph-Aware Chunker**: Intelligent chunking algorithm respecting semantic boundaries (paragraphs, lines, Khmer *Khan* `។` and *Bariyoosan* `៕`, Latin sentence punctuation) producing balanced 600–800 character chunks with 100–150 character overlap without corrupting Unicode syllables.
- **Race-Condition-Free Human Takeover**: AI message pipeline performs a transactional fresh state check immediately before saving/broadcasting LLM responses; if an agent clicked "Take Over", the AI response is silently discarded.
- **Secured WebSockets (Socket.IO)**: Handshake authorization via `WsJwtGuard` verifies JWTs before connection. Client-declared roles (`data.role`) are rejected; roles and tenant IDs are derived exclusively from verified JWT claims.
- **Dual AI Engine**: Seamlessly switch between live Google Gemini models (`gemini-flash-lite-latest`, `gemini-embedding-001`) and a deterministic offline simulation engine (`DEMO_AI`) requiring zero external API keys.
- **Bilingual Support (Khmer & English)**: Strict language-guarding prompt policy ensures 100% natural Khmer responses without cross-language Thai glyph contamination, with clear English for international clients.
- **Reliable Background Queue (BullMQ)**: Asynchronous document ingestion with exponential backoff and transparent fallback to synchronous processing if Redis is unavailable.
- **Real-Time Tool Execution**: Autonomous tools for live server time (`getCurrentTime`), order tracking (`getOrderStatus`), ticket generation, and live human escalation.

---

## 🔒 Security & Tenant Hardening

| Component | Vulnerability Addressed | Implementation |
| :--- | :--- | :--- |
| **Relational Queries** | IDOR / Cross-Tenant Data Access | All `findOne`, `findFirst`, `update`, and `delete` operations in `ConversationsService`, `TicketsService`, and `MessagesService` require and filter by `organizationId`. |
| **Vector Search** | RAG Multi-Tenant Leakage | Vector cosine distance queries in `SearchKnowledgeBaseTool` enforce `JOIN knowledge_documents d ON c."documentId" = d.id WHERE d."organizationId" = ${orgId}`. Queries without `organizationId` return empty results. |
| **WebSocket Gateway** | Connection & Role Spoofing | `MessagesGateway` requires a valid JWT on handshake, verifies signatures via `WsJwtGuard`, discards client-supplied `data.role`, and restricts room joining to matching `organizationId`. |
| **Secrets Management** | Insecure Development Fallbacks | Application startup strictly verifies `process.env.JWT_SECRET`. The process refuses to boot if the secret is missing or empty. |
| **CORS Policy** | Wildcard Origin Exploits | Replaced wildcard `*` with an explicit origin allow-list (`cors.config.ts`) enforced consistently across both HTTP and WebSocket handshakes. |
| **Order Lookup Tool** | Production Data Fabrication | Removed fake order fallbacks (`DEMO_ORDERS`); restricted sample mock orders strictly to authorized demo tenants (`slug: 'demo'`). All other non-existent orders return explicit "Order not found". |

---

## 🚀 Local Development Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v18+ (tested on Node 20 & 24)
- [Docker](https://www.docker.com/) and Docker Compose

### 2. Configure Environment
Clone the repository and copy the environment configuration:
```bash
cp .env.example .env
```

Ensure `.env` contains your PostgreSQL, Redis, and JWT credentials:
```ini
NODE_ENV=development
PORT=3000
WORKER_PORT=3001
WEB_PORT=3002

# Database & Cache (Docker Compose)
DATABASE_URL="postgresql://postgres:postgres@localhost:5436/ai_support_db?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=

# JWT Secrets (Must be non-empty)
JWT_SECRET=super_secret_jwt_access_key_change_in_production
JWT_REFRESH_SECRET=super_secret_jwt_refresh_key_change_in_production

# AI Provider (Options: gemini | demo)
AI_PROVIDER=demo
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start Database & Redis
Start PostgreSQL (with `pgvector`) and Redis via Docker Compose:
```bash
docker compose up -d
```

### 4. Install, Migrate & Seed
```bash
# Install root and workspace dependencies
npm install

# Build shared libraries
npm run build:types
npm run build:shared

# Run Prisma migrations & seed baseline tenant data
npm run prisma:migrate
npm run db:seed
```

### 5. Launch Services
Run all applications concurrently:
```bash
npm run dev
```

Or run individual services in separate terminals:
```bash
npm run dev:api     # NestJS API Gateway (http://localhost:3000)
npm run dev:worker  # BullMQ Worker Ingestion (Port 3001)
npm run dev:web     # Next.js 14 Frontend (http://localhost:3002)
```

---

## 👥 Demo Credentials & Test Accounts

| Role | Email | Password | Access / Capabilities |
| :--- | :--- | :--- | :--- |
| **Support Agent** | `agent@company.com` | `SecureP@ss123` | Support console, conversation takeover, internal notes |
| **Demo Specialist** | `demo@acme-support.local` | `DemoPass123!` | Alternative support agent credential |
| **System Admin** | `admin@acme-support.local` | `AdminPass123!` | Knowledge base management, team administration |
| **Customer Web Chat** | N/A | None | Direct customer chat at `http://localhost:3002/chat` |

---

## 📊 Observability & Health Endpoints

- **Health Checks**:
  - `GET /health` or `GET /api/health` or `GET /api/v1/health`
  - Verifies database connectivity (`SELECT 1`), Redis ping response, and active AI engine mode.
- **Correlation ID Tracking**:
  - Automatically reads incoming `x-request-id` or `x-correlation-id`, generating a UUID if absent.
  - Attaches `x-request-id` to every HTTP response.
- **Structured Metrics Logging**:
  - HTTP requests: `[<req-id>] <METHOD> <URL> <STATUS> +<DURATION>ms`
  - LLM completion: Duration (ms), prompt tokens, completion tokens, tool count.
  - Queue processing: Job ID, document ID, chunk count, duration (ms), success/failure status.

---

## 🧪 Testing Suite

The repository includes comprehensive unit and integration test coverage:

```bash
# Run all unit and integration test suites
npm test

# Run real database integration tests (Tenant & RAG Isolation)
npx jest src/test/tenant-isolation.integration.spec.ts

# Production build check across all workspaces
npm run build
```

---

## 📌 Project Status

**Alpha / Early Beta – suitable for portfolio and controlled demos.**

Core multi-tenant isolation, real-time messaging, vector search, and human takeover mechanisms are fully functional and verified with integration tests. Not intended for direct unmonitored production deployment without organization-specific billing, telemetry, and rate limit tuning.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
