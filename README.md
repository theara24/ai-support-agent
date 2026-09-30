# 🤖 Theara AI Support Platform (ប្រព័ន្ធឆ្លើយតបអតិថិជនឆ្លាតវៃ)

**A Personal Full-Stack AI Customer Support Platform**  
*Built by [Chim Theara (ជឺម ធារ៉ា)](https://github.com/theara24)*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.0-red?logo=nestjs)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20pgvector-blue?logo=postgresql)](https://github.com/pgvector/pgvector)
[![Redis](https://img.shields.io/badge/Redis-7.0%20Alpine-red?logo=redis)](https://redis.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5.8-orange)](https://docs.bullmq.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-black?logo=socket.io)](https://socket.io/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-Flash%20Lite-purple?logo=google)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

A modern, practical **AI Customer Support & Assistant Platform** created to help businesses, schools, clinics, and shops answer customer questions automatically 24/7. Built with modern full-stack technologies combining document search (pgvector RAG), real-time tool calling, live agent handoff via Socket.IO, an embeddable website widget, and Telegram bot integration.

---

## 🏛️ System Architecture

```text
                                  ┌────────────────────────────────────────────────────────┐
                                  │                  Customer Touchpoints                  │
                                  ├─────────────────┬──────────────────────┬───────────────┤
                                  │    Web Chat     │   Embeddable Widget  │  Telegram Bot │
                                  │ (/chat - 3002)  │    (<script> tag)    │  (Webhooks)   │
                                  └────────┬────────┴──────────┬───────────┴───────┬───────┘
                                           │                   │                   │
                                           └───────────────────┼───────────────────┘
                                                               ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                   NestJS API Gateway                                     │
│  - JWT / RBAC Authentication (Super Admin, Agent, User) - Rate Limiting (Throttler)      │
│  - Correlation ID Middleware                            - Audit Trails & Token Tracking  │
│  - Socket.IO Real-time Gateway                          - REST Endpoints (Swagger /docs) │
│  - Intent & Capability Routing Layer                    - Multi-Tenant Isolation         │
└──────────┬───────────────────────────┬───────────────────────────────┬───────────────────┘
           │                           │                               │
           ▼                           ▼                               ▼
┌──────────────────────┐   ┌──────────────────────┐        ┌──────────────────────┐
│ PostgreSQL(pgvector) │   │     Redis 7 PubSub   │        │     BullMQ Queues    │
│ Storage & Embeddings │   │   Real-time Cache    │        │  Async Doc Ingestion │
│     Port: 5436       │   │     Port: 6380       │        └──────────┬───────────┘
└──────────────────────┘   └──────────────────────┘                   │
                                                                      ▼
                                                           ┌──────────────────────┐
                                                           │     Async Worker     │
                                                           │     (Port 3001)      │
                                                           └──────────┬───────────┘
                                                                      │
                                                                      ▼
                                            ┌──────────────────────────────────────────────┐
                                            │          Generative AI Engine                │
                                            │  - Model: gemini-flash-lite-latest           │
                                            │  - Embeddings: gemini-embedding-001          │
                                            │  - Providers: REAL_AI (Gemini) | DEMO_AI     │
                                            └──────────────┬───────────────────────────────┘
                                                           │
                                ┌──────────────────────────┴──────────────────────────┐
                                ▼                                                     ▼
                    ┌─────────────────────────┐                           ┌─────────────────────────┐
                    │   pgvector RAG Search   │                           │    Dynamic AI Tools     │
                    │ - 768-dim Vector Chunks │                           │ - getCurrentTime (Clock)│
                    │ - Cosine Distance Top-K │                           │ - getOrderStatus (DB)   │
                    │ - Business Grounding    │                           │ - createSupportTicket   │
                    │ - Document Ingestion    │                           │ - escalateToHuman       │
                    └─────────────────────────┘                           └─────────────────────────┘
```

---

## ✨ Key Capabilities

### 1. Embeddable Floating Chat Widget (`<script>` Integration)
- **Zero-Dependency Script ([`public/widget.js`](file:///e:/Mine/AI%20Support%20Agent/apps/web/public/widget.js))**: Drop into any external website (Shopify, WordPress, Webflow, React, HTML) with a single `<script>` tag.
- **Interactive Widget Builder ([`/widget-config`](file:///e:/Mine/AI%20Support%20Agent/apps/web/src/app/widget-config/page.tsx))**: Visual customizer for brand name, colors, greetings, and positions with side-by-side live iframe preview.
- **External Demo Site ([`/widget-demo.html`](file:///e:/Mine/AI%20Support%20Agent/apps/web/public/widget-demo.html))**: Live simulated e-commerce website demonstrating the floating bubble launcher and modal.

### 2. General AI Assistance & Intent Routing
- **Lightweight Intent / Capability Routing**: Automatically categorizes user queries into `GENERAL`, `BUSINESS_KNOWLEDGE`, `TOOL_ACTION`, `HUMAN_HANDOFF`, or `MIXED`.
- **General Knowledge Support**: Responds directly to general inquiries (programming, math, technology, definitions, explanations) without domain-locked restrictions or unneeded RAG overhead.
- **Mixed Request Handling**: Seamlessly addresses combined questions (e.g. explaining a concept and checking live company policies or orders in the same turn).

### 3. Business-Specific RAG & Rapid Ingestion
- **pgvector Semantic Search**: Queries private company documents, policies, FAQs, and procedures using 768-dimensional cosine distance similarity.
- **File Upload & Business Templates**: Admin portal supports uploading `.txt`, `.md`, `.json`, `.csv` files and 1-click loading of business templates (Company FAQ, Shipping, Refunds, Pricing).

### 4. Real-Time Tool Calling
- **Real Current-Time Tool (`getCurrentTime`)**: Queries the real runtime server clock and provides formatted local time, date, and timezone (defaulting to configurable company timezone `Asia/Phnom_Penh`).
- **Order Tracking (`getOrderStatus`)**: Looks up live order status, carrier, tracking number, and delivery estimates from PostgreSQL.
- **Ticketing & Escalation (`createSupportTicket`, `escalateToHuman`)**: Logs official tickets and escalates to human agents.

### 5. Omnichannel Communication & Human Handoff
- **Customer Web Chat (`/chat`)**: Dedicated customer interface with real-time Socket.IO streaming and typing indicators.
- **Telegram Bot Integration**: Webhook-driven channel mapping incoming messages into the unified conversation pipeline.
- **One-Click Agent Takeover**: Support agents claim conversations from the dashboard, immediately pausing automated AI responses.
- **Internal Note Privacy**: Staff collaboration notes are hidden from customers and never sent to external LLMs.

### 6. Dual-Engine Execution (REAL_AI & DEMO_AI)
- **Real AI Mode (`AI_PROVIDER=gemini`)**: Live inference using Google Gemini models with automatic exponential retry backoff.
- **Demo AI Mode (`AI_MODE=DEMO_AI` or `AI_PROVIDER=demo`)**: Deterministic local sandbox simulating general knowledge, current-time tools (using the real runtime clock), business RAG, and human handoff with zero external dependencies.

### 7. Agent Dashboard & Analytics
- **Live Agent Console**: Next.js 14 App Router, Tailwind CSS, TanStack Query, and Lucide icons.
- **Token Usage Tracking**: Records prompt tokens, completion tokens, total token usage, and cost estimates per conversation.

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ (tested on Node 20 & 24)
- [Docker](https://www.docker.com/) and Docker Compose
- Google Gemini API Key (optional; deterministic demo mode available out of the box)

---

### Step 1: Environment Setup
Clone the repository and copy the environment configuration:
```bash
cp .env.example .env
```

Ensure `.env` matches your infrastructure:
```ini
NODE_ENV=development
PORT=3000
WORKER_PORT=3001
WEB_PORT=3002

# Docker Compose Ports
DATABASE_URL="postgresql://postgres:postgres@localhost:5436/ai_support_db?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6380

# AI Configuration
AI_PROVIDER=gemini       # Options: gemini | demo
GEMINI_API_KEY=your_key_here
```

---

### Step 2: Launch Database & Cache
Start PostgreSQL with `pgvector` and Redis via Docker Compose:
```bash
docker compose up -d
```

Verify services are healthy:
```bash
docker compose ps
```

---

### Step 3: Install & Seed Database
Install workspace dependencies and seed demo organization data:
```bash
# Install dependencies
npm install

# Generate Prisma Client & Run Migrations
npm run prisma:generate
npm run prisma:migrate

# Seed Demo Data (Idempotent)
npm run db:seed
```

The seed script initializes:
- **Organization**: Acme Corporation
- **Demo Users**: Admin, Support Agent, and Customer accounts
- **Knowledge Base**: 8 standard Acme policy documents with vector embeddings
- **Demo Orders**: `ACME-1001`, `ACME-1002`, `ACME-1003` with shipping status
- **Initial Tickets**: Sample customer inquiries

---

### Step 4: Start All Services
Run all applications in development mode:
```bash
# Run all services concurrently (API, Worker, Frontend)
npm run dev
```

Or run individual services in separate terminals:
```bash
# Terminal 1: NestJS API (Port 3000)
npm run dev:api

# Terminal 2: BullMQ Worker (Port 3001)
npm run dev:worker

# Terminal 3: Next.js Web App (Port 3002)
npm run dev:web
```

---

## 👥 Demo Accounts & Testing Data

| Role | Email | Password | Access / Capabilities |
| :--- | :--- | :--- | :--- |
| **Support Agent** | `agent@company.com` | `SecureP@ss123` | Full support console, conversation takeover, tickets |
| **Demo Agent** | `demo@acme-support.local` | `DemoPass123!` | Alternative support agent credential |
| **System Admin** | `admin@acme-support.local` | `AdminPass123!` | Knowledge base management, team administration |
| **Web Customer** | N/A (Guest Session) | None | Access customer chat directly at `http://localhost:3002/chat` |

### Sample Demo Orders for Tool Testing:
- `ACME-1001`: Shipped via FedEx (`FX-982341`), expected arrival in 2 business days.
- `ACME-1002`: Processing, scheduled to ship tomorrow.
- `ACME-1003`: Delivered yesterday at front door.

---

## 🎬 Golden Path Demonstration

Follow this 5-minute walkthrough to demonstrate all platform features:

### 1. Customer Web Chat (`http://localhost:3002/chat`)
1. Open `http://localhost:3002/chat` in an Incognito browser window.
2. **Test Vector RAG**: Ask *"What is your return policy?"*
   - *Observation*: AI queries `pgvector` knowledge base and cites Acme's 30-day return policy.
3. **Test Autonomous Tool Calling**: Ask *"Where is my order ACME-1001?"*
   - *Observation*: AI autonomously invokes `getOrderStatus`, retrieves FedEx tracking details, and summarizes shipping status.
4. **Test Escalation**: Type *"This is urgent, please connect me to a human agent"*.
   - *Observation*: Conversation is flagged with `ESCALATED_TO_HUMAN`. An alert badge informs the customer an agent has been notified.

### 2. Support Agent Dashboard (`http://localhost:3002/dashboard`)
1. In another browser window, navigate to `http://localhost:3002` and log in as `agent@company.com` / `SecureP@ss123`.
2. Go to **Conversations**:
   - Locate the escalated conversation at the top of the queue.
   - Click **Take Over Conversation** (disables automated AI response).
   - Reply to the customer: *"Hello! Support agent here, I have taken over your case."*
   - Toggle **Internal Note** and submit: *"Customer asked about ACME-1001; validated order status."* (Customer will not see this).
3. Return to the customer chat window: the agent's message appears instantly via WebSocket, but the internal note remains hidden.
4. In the agent dashboard, click **Resolve Conversation**.

### 3. Automated End-to-End Verification Script
You can also run the automated end-to-end golden flow script:
```bash
node scratch/test-golden-flow.js
```
This script exercises all 12 platform milestones sequentially and validates WebSocket broadcast delivery.

---

## 📡 API & Health Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `GET /api/v1/health` | `GET` | Health check verifying Database, Redis, and AI provider status |
| `POST /api/v1/auth/login` | `POST` | Agent/Admin JWT authentication |
| `POST /api/v1/auth/refresh` | `POST` | Rotates short-lived access tokens via refresh token |
| `GET /api/v1/conversations` | `GET` | Lists conversations (paginated, filterable by status) |
| `POST /api/v1/conversations` | `POST` | Creates a new guest or customer conversation |
| `POST /api/v1/conversations/:id/messages` | `POST` | Sends customer or agent message (triggers AI if active) |
| `POST /api/v1/conversations/:id/takeover` | `POST` | Agent claims conversation, silencing AI |
| `POST /api/v1/conversations/:id/resolve` | `POST` | Marks conversation resolved |
| `GET /api/v1/knowledge` | `GET` | Lists vectorized knowledge base articles |
| `POST /api/v1/knowledge` | `POST` | Ingests document, triggers chunking and embedding |
| `GET /api/v1/analytics/overview` | `GET` | Summarizes token usage, resolution rates, and ticket counts |
| `GET /docs` | `GET` | Interactive Swagger API Documentation |

---

## 🧪 Testing Suite

Run all test suites across the monorepo:
```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:cov

# Production build check
npm run build
```

---

## 🛡️ Security & Production Readiness

- **Role-Based Access Control**: Strict guard architecture (`JwtAuthGuard`, `RolesGuard`, `OptionalJwtAuthGuard`).
- **Token Security**: 15-minute access tokens with bcrypt-hashed refresh token rotation stored in PostgreSQL.
- **Audit Trails**: Every AI tool invocation, human handoff, and conversation resolution is logged with timestamps and actor IDs.
- **Tenant Data Isolation**: Database queries enforce multi-tenant organization scoping (`organizationId`).
- **Customer Privacy**: Internal notes and agent metadata are scrubbed from public Socket.IO rooms.

---

## 👨‍💻 Author & Creator
- **Creator & Lead Architect**: **Chim Theara (ជឺម ធារ៉ា)**
- **GitHub**: [@theara24](https://github.com/theara24)
- **Role**: Software Engineer & AI Systems Architect

---

## 📄 License
This project is licensed under the MIT License.
