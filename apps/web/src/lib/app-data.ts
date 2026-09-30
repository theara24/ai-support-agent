export interface Message {
  id: string;
  senderType: 'CUSTOMER' | 'AI' | 'AGENT' | 'SYSTEM';
  content: string;
  createdAt: string;
  isInternalNote?: boolean;
}

export interface ConversationItem {
  id: string;
  channel: 'WEB' | 'TELEGRAM';
  status: 'OPEN' | 'AI_ACTIVE' | 'WAITING_FOR_AGENT' | 'HUMAN_ACTIVE' | 'RESOLVED' | 'CLOSED';
  customerName: string;
  customerEmail?: string;
  createdAt: string;
  updatedAt: string;
  assignedAgentName?: string;
  messages: Message[];
}

export interface TicketItem {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'PENDING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  customer?: { name?: string; email?: string };
  assignedTo?: { name?: string; email?: string };
}

export interface DocumentItem {
  id: string;
  title: string;
  status: 'READY' | 'PROCESSING' | 'PENDING' | 'FAILED';
  createdAt: string;
  chunkCount: number;
  fileSize: number;
  content?: string;
}

declare global {
  var __GLOBAL_CONVERSATIONS_STORE__: ConversationItem[] | undefined;
  var __GLOBAL_TICKETS_STORE__: TicketItem[] | undefined;
  var __GLOBAL_KB_DOCUMENTS_STORE__: DocumentItem[] | undefined;
}

if (!global.__GLOBAL_CONVERSATIONS_STORE__) {
  global.__GLOBAL_CONVERSATIONS_STORE__ = [
    {
      id: 'conv-portfolio-1',
      channel: 'WEB',
      status: 'AI_ACTIVE',
      customerName: 'Portfolio Visitor',
      customerEmail: 'visitor@gmail.com',
      createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 60000).toISOString(),
      messages: [
        {
          id: 'msg-1',
          senderType: 'CUSTOMER',
          content: 'Hello! I am reviewing Chim Theara’s portfolio. Can you tell me what AI projects he has built?',
          createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
        },
        {
          id: 'msg-2',
          senderType: 'AI',
          content: 'Hello! Chim Theara (ជឺម ធារ៉ា) is a Senior Full-Stack & AI Engineer. He recently built "Theara AI Support Agent", an enterprise-ready customer support platform featuring RAG vector search, live human agent takeover, embeddable web chat widgets, and Telegram integration!',
          createdAt: new Date(Date.now() - 14 * 60000).toISOString(),
        },
        {
          id: 'msg-3',
          senderType: 'CUSTOMER',
          content: 'What tech stack does this AI Support Agent project use?',
          createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
        },
        {
          id: 'msg-4',
          senderType: 'AI',
          content: 'The platform is engineered with Next.js 14 (App Router, Tailwind CSS), NestJS backend microservices, PostgreSQL with pgvector for semantic RAG embeddings, Redis queues, and Socket.IO for real-time live agent handoff.',
          createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
        },
      ],
    },
    {
      id: 'conv-portfolio-2',
      channel: 'TELEGRAM',
      status: 'WAITING_FOR_AGENT',
      customerName: 'Vanna Meas (@vanna_m)',
      customerEmail: 'vanna@telegram.user',
      createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 60000).toISOString(),
      messages: [
        {
          id: 'msg-tg-1',
          senderType: 'CUSTOMER',
          content: 'Hi, I would like to schedule a consultation with Theara regarding a full-stack contract.',
          createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
        },
        {
          id: 'msg-tg-2',
          senderType: 'AI',
          content: 'Thank you for reaching out! Theara specializes in Full-Stack web architecture and AI applications. I have escalated this conversation to our priority queue so a human specialist can follow up with you.',
          createdAt: new Date(Date.now() - 44 * 60000).toISOString(),
        },
      ],
    },
  ];
}

if (!global.__GLOBAL_TICKETS_STORE__) {
  global.__GLOBAL_TICKETS_STORE__ = [
    {
      id: 'ticket-1',
      title: 'Inquiry regarding custom RAG dataset upload limits',
      description: 'Customer requested details on vector embedding batching and PDF document file sizes for Portfolio workspace.',
      priority: 'MEDIUM',
      status: 'OPEN',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      customer: { name: 'Theara Chim', email: 'chimtheara93@gmail.com' },
      assignedTo: { name: 'Support Agent', email: 'agent@company.com' },
    },
    {
      id: 'ticket-2',
      title: 'Bakong KHQR payment webhook confirmation',
      description: 'Webhook verification completed for customer automated subscription renewal.',
      priority: 'LOW',
      status: 'RESOLVED',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      customer: { name: 'Sophea Keo', email: 'sophea@example.com' },
    },
  ];
}

if (!global.__GLOBAL_KB_DOCUMENTS_STORE__) {
  global.__GLOBAL_KB_DOCUMENTS_STORE__ = [
    {
      id: 'doc-portfolio-profile',
      title: 'Chim Theara - Full-Stack & AI Engineering Profile',
      status: 'READY',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      chunkCount: 12,
      fileSize: 14850,
      content: `Chim Theara is a Senior Full-Stack & AI Developer specializing in Next.js, React, NestJS, Node.js, TypeScript, PostgreSQL (pgvector), and LLM RAG pipelines. He built Theara AI Support Agent as a personal flagship platform.`,
    },
    {
      id: 'doc-portfolio-services',
      title: 'Portfolio Consulting Services & Technical FAQs',
      status: 'READY',
      createdAt: new Date(Date.now() - 43200000).toISOString(),
      chunkCount: 8,
      fileSize: 9230,
      content: `Chim Theara offers end-to-end full stack web architecture, autonomous AI agents development, modern UI/UX implementation with Tailwind CSS and responsive design, and enterprise API integrations.`,
    },
    {
      id: 'doc-portfolio-contact',
      title: 'Contact Information & Communication Channels',
      status: 'READY',
      createdAt: new Date(Date.now() - 21600000).toISOString(),
      chunkCount: 4,
      fileSize: 3420,
      content: `Contact: chimtheara93@gmail.com | Phone: +855 68 427 420 | Location: Phnom Penh, Cambodia | GitHub: https://github.com/theara24`,
    },
  ];
}

export const conversationsStore = global.__GLOBAL_CONVERSATIONS_STORE__;
export const ticketsStore = global.__GLOBAL_TICKETS_STORE__;
export const kbDocumentsStore = global.__GLOBAL_KB_DOCUMENTS_STORE__;
