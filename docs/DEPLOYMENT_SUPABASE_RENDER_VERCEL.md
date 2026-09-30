# Production Deployment Guide: Supabase + Render + Vercel

This guide provides the complete setup, environment configuration, and deployment walkthrough for deploying the **AI Support Agent Platform** across **Supabase**, **Render**, and **Vercel**.

---

## 🏗️ Architecture Overview

```mermaid
flowchart TD
    subgraph Vercel ["Vercel (Frontend)"]
        WEB["Next.js 14 Web App<br/>(Dashboard, Widget, Live Chat)"]
    end

    subgraph Render ["Render (Backend & Worker)"]
        API["NestJS API Web Service<br/>(REST & Socket.IO)"]
        WORKER["BullMQ Background Worker<br/>(Embeddings & Chunking)"]
        REDIS[("Render Managed Redis<br/>(Queues & Socket Adapter)")]
    end

    subgraph Supabase ["Supabase (Database)"]
        DB[("PostgreSQL 16 + pgvector<br/>(Port 6543 Pooler / Port 5432 Direct)")]
    end

    WEB -->|"REST API & WebSockets (WSS)"| API
    API -->|"BullMQ Producer"| REDIS
    REDIS -->|"BullMQ Consumer"| WORKER
    API -->|"Prisma Client (Pooler)"| DB
    WORKER -->|"Prisma & Raw Vector Inserts"| DB
    WEB -.->|"Prisma Client (Pooler SSR)"| DB
```

---

## 1. 🗄️ Supabase Setup (Database & Vector Store)

### 1.1 Create Supabase Project
1. Log in to [Supabase](https://supabase.com) and create a new project.
2. Note your database password and choose a region close to your Render deployment (e.g., `us-east` or `frankfurt`).

### 1.2 Enable `vector` Extension
Supabase comes with `pgvector` pre-installed:
1. Navigate to **SQL Editor** in the Supabase Dashboard.
2. Run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### 1.3 Obtain Connection Strings
In Supabase, go to **Project Settings** -> **Database**:
1. **Connection Pooling (Transaction mode, port 6543)**:
   - Use this for `DATABASE_URL` (for runtime queries):
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
2. **Direct Connection (Session mode, port 5432)**:
   - Use this for `DIRECT_URL` (for Prisma migrations):
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```

### 1.4 Apply Prisma Migrations & Seed Initial Data
From your local terminal, deploy migrations directly to Supabase:
```bash
# Set your environment variables
export DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
export DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Run migrations
npm run prisma:migrate:deploy

# (Optional) Seed initial demo organization and agent accounts
npm run db:seed
```

---

## 2. ⚡ Render Setup (API, Worker & Redis)

### 2.1 Deploy Redis on Render
1. In Render Dashboard, click **New +** -> **Redis**.
2. Name: `ai-support-redis`.
3. Choose the same region as your Web Service.
4. Copy the **Internal Redis URL** (e.g., `redis://red-xxxx:6379` or `rediss://...`).

---

### 2.2 Deploy NestJS API (`apps/api`)
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the service:
   - **Name**: `ai-support-api`
   - **Region**: Same region as Redis & Supabase
   - **Branch**: `main`
   - **Root Directory**: `.` (repository root)
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm run build:types && npm run build:shared && npm run prisma:generate && npm run build:api
     ```
   - **Pre-Deploy Command** (optional):
     ```bash
     npm run prisma:migrate:deploy
     ```
   - **Start Command**:
     ```bash
     node apps/api/dist/main.js
     ```
4. Configure **Environment Variables** in Render:

| Variable | Recommended Value | Note |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `10000` | Injected automatically by Render |
| `DATABASE_URL` | *Supabase Pooler URL (port 6543)* | With `?pgbouncer=true` |
| `DIRECT_URL` | *Supabase Direct URL (port 5432)* | For migrations |
| `REDIS_URL` | *Render Internal Redis URL* | Connects BullMQ & Socket.IO adapter |
| `JWT_SECRET` | *(64-char random hex string)* | e.g. `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | *(64-char random hex string)* | e.g. `openssl rand -hex 32` |
| `JWT_ACCESS_EXPIRATION` | `15m` | Token validity |
| `JWT_REFRESH_EXPIRATION` | `7d` | Refresh token validity |
| `CORS_ORIGINS` | `https://your-app.vercel.app` | Vercel domain (*.vercel.app is also auto-allowed) |
| `AI_PROVIDER` | `gemini` (or `demo`) | Gemini API integration |
| `GEMINI_API_KEY` | *Your Google AI Gemini API Key* | Embedding & Chat |

---

### 2.3 Deploy Background Worker (`apps/worker`)
1. In Render Dashboard, click **New +** -> **Background Worker**.
2. Connect your Git repository.
3. Configure the worker:
   - **Name**: `ai-support-worker`
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm run build:types && npm run build:shared && npm run prisma:generate && npm run build:worker
     ```
   - **Start Command**:
     ```bash
     node apps/worker/dist/main.js
     ```
4. Configure **Environment Variables**:

| Variable | Recommended Value |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *Supabase Direct or Pooler URL* |
| `REDIS_URL` | *Render Internal Redis URL* |
| `AI_PROVIDER` | `gemini` (or `demo`) |
| `GEMINI_API_KEY` | *Your Google AI Gemini API Key* |

---

## 3. ▲ Vercel Setup (Next.js Frontend `apps/web`)

### 3.1 Import Project into Vercel
1. In Vercel Dashboard, click **Add New...** -> **Project**.
2. Import your Git repository.
3. In **Project Settings**:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click *Edit* and select `apps/web`.
   - **Build Command**: Leave default (`prisma generate && next build` — the `prebuild` hook will automatically compile `@ai-support/types` and `@ai-support/shared`).
   - **Output Directory**: `.next` (default)

### 3.2 Configure Environment Variables in Vercel

| Variable | Recommended Value | Note |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://ai-support-api.onrender.com` | Your deployed Render API URL |
| `NEXT_PUBLIC_WS_URL` | `https://ai-support-api.onrender.com` | WSS URL for live chats & agent status |
| `DATABASE_URL` | *Supabase Pooler URL* | Required for Next.js SSR / route handlers |
| `DIRECT_URL` | *Supabase Direct URL* | Port 5432 |
| `JWT_SECRET` | *(Same JWT_SECRET as Render API)* | For verifying session tokens |
| `JWT_REFRESH_SECRET`| *(Same JWT_REFRESH_SECRET)* | For refreshing tokens |

4. Click **Deploy**.

---

## 4. 🧪 Post-Deployment Verification Checklist

1. [ ] **Supabase**: Verify table creation under **Table Editor** (`users`, `organizations`, `conversations`, `document_chunks`, etc.).
2. [ ] **Render API Health**: Open `https://your-api.onrender.com/health` -> should return `{"status":"ok"}`.
3. [ ] **Swagger Documentation**: Open `https://your-api.onrender.com/docs` -> interactive API UI.
4. [ ] **Vercel Web App**:
   - Visit `https://your-app.vercel.app/login`
   - Log in with seeded admin credentials:
     - **Email**: `agent@company.com`
     - **Password**: `SecureP@ss123`
5. [ ] **Live Chat & WebSocket**: Open `https://your-app.vercel.app/widget` and send a test message. Check real-time response from AI / Agent queue.
6. [ ] **Knowledge Base & Worker**: Upload a document (.pdf or .txt) and ensure the background worker chunks and generates embeddings into Supabase.
