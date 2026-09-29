export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
  CUSTOMER = 'CUSTOMER'
}

export enum Permission {
  CONVERSATION_READ = 'conversation:read',
  CONVERSATION_WRITE = 'conversation:write',
  CONVERSATION_ASSIGN = 'conversation:assign',
  CONVERSATION_TAKEOVER = 'conversation:takeover',
  TICKET_CREATE = 'ticket:create',
  TICKET_UPDATE = 'ticket:update',
  KNOWLEDGE_BASE_READ = 'knowledge_base:read',
  KNOWLEDGE_BASE_WRITE = 'knowledge_base:write',
  ANALYTICS_READ = 'analytics:read',
  USER_MANAGE = 'user:manage'
}

export enum ConversationChannel {
  WEB = 'WEB',
  TELEGRAM = 'TELEGRAM'
}

export enum ConversationStatus {
  OPEN = 'OPEN',
  AI_ACTIVE = 'AI_ACTIVE',
  WAITING_FOR_AGENT = 'WAITING_FOR_AGENT',
  HUMAN_ACTIVE = 'HUMAN_ACTIVE',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum MessageSenderType {
  CUSTOMER = 'CUSTOMER',
  AI = 'AI',
  AGENT = 'AGENT',
  SYSTEM = 'SYSTEM'
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_CUSTOMER = 'PENDING_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED'
}

export enum IntentCategory {
  GENERAL = 'GENERAL',
  BUSINESS_KNOWLEDGE = 'BUSINESS_KNOWLEDGE',
  TOOL_ACTION = 'TOOL_ACTION',
  HUMAN_HANDOFF = 'HUMAN_HANDOFF',
  MIXED = 'MIXED',
}

export interface IntentClassification {
  category: IntentCategory;
  requiresRag: boolean;
  suggestedTools?: string[];
  confidence?: number;
  reasoning?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  orgId?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  firstName?: string;
  lastName?: string;
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface LLMToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface LLMResponse {
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, any>;
  }>;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: Record<string, any>;
}
