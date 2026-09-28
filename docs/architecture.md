# System Architecture Overview

## Overview
The **AI Support Agent** is a multi-tenant, enterprise-grade AI customer service platform. It integrates LLM-based intelligent assistance with human support handoff workflows, vector-based RAG knowledge management, asynchronous background processing, real-time WebSockets, and multi-channel messaging (Web Chat & Telegram).

---

## Technical Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js (App Router), React, Tailwind CSS, TanStack Query, Zustand | Support & Admin Dashboard |
| **Backend API** | NestJS, TypeScript, Socket.IO, JWT, Swagger | Core REST API, WebSockets, Webhook processing |
| **Background Worker** | NestJS, BullMQ, Redis | Async document chunking, embedding generation, notifications |
| **Database** | PostgreSQL + Prisma ORM + pgvector | Relational storage & vector embeddings |
| **Caching & Queues**| Redis | Session data, rate limiting, BullMQ backend |
| **AI / LLM** | Gemini / OpenAI / Anthropic Provider Abstraction | Flexible LLM provider adapters |

---

## High-Level Architecture Diagram

```text
                             ┌────────────────────────┐
                             │    Customer Clients    │
                             │  (Web Chat / Telegram) │
                             └───────────┬────────────┘
                                         │
                                   HTTPS / WSS / Webhooks
                                         │
                                         ▼
                             ┌────────────────────────┐
                             │       NestJS API       │
                             │   (REST & WebSockets)  │
                             └───────────┬────────────┘
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         ▼                               ▼                               ▼
  ┌──────────────┐                ┌──────────────┐                ┌──────────────┐
  │  PostgreSQL  │                │    Redis     │                │    BullMQ    │
  │  (pgvector)  │                │ (Cache/State)│                │  (Queue API) │
  └──────┬───────┘                └──────────────┘                └──────┬───────┘
         │                                                               │
         │                                                               ▼
         │                                                        ┌──────────────┐
         │                                                        │ Worker Service│
         │                                                        │ (RAG & Tasks)│
         │                                                        └──────┬───────┘
         │                                                               │
         └───────────────────────────────┬───────────────────────────────┘
                                         ▼
                             ┌────────────────────────┐
                             │   AI Agent Subsystem   │
                             │ (LLM Abstraction & RAG)│
                             └───────────┬────────────┘
```

---

## Data Models & Schema Design (Prisma)
- **User & Roles**: `SUPER_ADMIN`, `ADMIN`, `SUPPORT_AGENT`, `CUSTOMER` with RBAC permissions.
- **Organization**: Multi-tenant isolation for customer accounts.
- **Conversation & Message**: Lifecycle states (`OPEN`, `AI_ACTIVE`, `WAITING_FOR_AGENT`, `HUMAN_ACTIVE`, `RESOLVED`, `CLOSED`), channel origins (`WEB`, `TELEGRAM`).
- **Knowledge Base**: Documents, chunking metadata, vector embeddings stored natively using `pgvector`.
- **Tickets**: Escalated issues with ticket comments and agent assignments.
- **Audit Logs & Analytics**: AI usage metrics, tool calls, and performance logging.

---

## AI Agent & RAG Subsystem
- **Provider Abstraction**: Unified `LLMProvider` interface permitting seamlessly switching between Gemini, OpenAI, or Anthropic.
- **RAG Architecture**: Async file ingestion -> Document cleaning & chunking -> Vector embedding -> `pgvector` index cosine distance search.
- **Tool Execution Framework**: Strictly authorized tools (`searchKnowledgeBase`, `getCustomerProfile`, `createSupportTicket`, `escalateToHuman`) preventing LLMs from direct DB manipulation.
