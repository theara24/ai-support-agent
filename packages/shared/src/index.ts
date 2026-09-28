import { UserRole, Permission } from '@ai-support/types';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  [UserRole.ADMIN]: [
    Permission.CONVERSATION_READ,
    Permission.CONVERSATION_WRITE,
    Permission.CONVERSATION_ASSIGN,
    Permission.CONVERSATION_TAKEOVER,
    Permission.TICKET_CREATE,
    Permission.TICKET_UPDATE,
    Permission.KNOWLEDGE_BASE_READ,
    Permission.KNOWLEDGE_BASE_WRITE,
    Permission.ANALYTICS_READ,
    Permission.USER_MANAGE
  ],
  [UserRole.SUPPORT_AGENT]: [
    Permission.CONVERSATION_READ,
    Permission.CONVERSATION_WRITE,
    Permission.CONVERSATION_ASSIGN,
    Permission.CONVERSATION_TAKEOVER,
    Permission.TICKET_CREATE,
    Permission.TICKET_UPDATE,
    Permission.KNOWLEDGE_BASE_READ
  ],
  [UserRole.CUSTOMER]: [
    Permission.CONVERSATION_READ,
    Permission.CONVERSATION_WRITE,
    Permission.TICKET_CREATE
  ]
};

export const DEFAULT_AI_SYSTEM_PROMPT = `
You are an intelligent customer support agent for our platform.
Your objective is to provide concise, polite, and accurate assistance to customers based strictly on verified company knowledge and tools.

Rules:
1. Use company knowledge base documents when answering questions.
2. If you do not have sufficient information or are unsure about policy, pricing, or procedures, politely express that you cannot confirm the information and offer to escalate to a human support agent.
3. NEVER make up policy, prices, promo codes, or procedures.
4. Execute tools when appropriate (e.g. searching knowledge base, fetching order details, creating tickets, or escalating to a human).
5. Always maintain a professional, helpful tone.
`;
