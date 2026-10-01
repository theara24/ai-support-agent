import { PrismaClient, Role, ConversationChannel, ConversationStatus, MessageSenderType, TicketStatus, TicketPriority, DocumentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Theara AI Support Platform Production Seeding...');

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'theara-ai-support' },
    update: { name: 'Theara AI Support' },
    create: {
      name: 'Theara AI Support',
      slug: 'theara-ai-support',
    },
  });
  console.log(`✅ Organization created/verified: ${org.name} (${org.id})`);

  // 2. Demo Users (Hashed with bcrypt)
  const salt = await bcrypt.genSalt(10);
  const agentHash = await bcrypt.hash('SecureP@ss123', salt);
  const demoHash = await bcrypt.hash('DemoPass123!', salt);
  const adminHash = await bcrypt.hash('AdminPass123!', salt);

  const agentUser = await prisma.user.upsert({
    where: { email: 'agent@company.com' },
    update: {
      passwordHash: agentHash,
      role: Role.SUPPORT_AGENT,
      organizationId: org.id,
      firstName: 'Support',
      lastName: 'Agent',
    },
    create: {
      email: 'agent@company.com',
      passwordHash: agentHash,
      role: Role.SUPPORT_AGENT,
      organizationId: org.id,
      firstName: 'Support',
      lastName: 'Agent',
    },
  });

  const demoAgent = await prisma.user.upsert({
    where: { email: 'demo@acme-support.local' },
    update: {
      passwordHash: demoHash,
      role: Role.SUPPORT_AGENT,
      organizationId: org.id,
      firstName: 'Demo',
      lastName: 'Specialist',
    },
    create: {
      email: 'demo@acme-support.local',
      passwordHash: demoHash,
      role: Role.SUPPORT_AGENT,
      organizationId: org.id,
      firstName: 'Demo',
      lastName: 'Specialist',
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@acme-support.local' },
    update: {
      passwordHash: adminHash,
      role: Role.SUPER_ADMIN,
      organizationId: org.id,
      firstName: 'Super',
      lastName: 'Admin',
    },
    create: {
      email: 'admin@acme-support.local',
      passwordHash: adminHash,
      role: Role.SUPER_ADMIN,
      organizationId: org.id,
      firstName: 'Super',
      lastName: 'Admin',
    },
  });

  const tenantAdmin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {
      passwordHash: agentHash,
      role: Role.ADMIN,
      organizationId: org.id,
      firstName: 'Tenant',
      lastName: 'Admin',
    },
    create: {
      email: 'admin@company.com',
      passwordHash: agentHash,
      role: Role.ADMIN,
      organizationId: org.id,
      firstName: 'Tenant',
      lastName: 'Admin',
    },
  });

  console.log(`✅ Accounts configured:`);
  console.log(`   - admin@acme-support.local (Password: AdminPass123!) [Role: SUPER_ADMIN]`);
  console.log(`   - admin@company.com (Password: SecureP@ss123) [Role: ADMIN / Tenant Admin]`);
  console.log(`   - agent@company.com (Password: SecureP@ss123) [Role: SUPPORT_AGENT]`);

  // 3. Knowledge Base Documents
  const DOCS = [
    {
      title: 'Theara Chim - Biography, Technical Stack & Skills',
      content:
        'Theara Chim is a versatile Software Developer and Full-Stack Engineer based in Cambodia. She specializes in backend engineering, distributed message-queue services, REST APIs, and responsive web applications.\n\nPrimary Technical Stack:\n- Programming Languages: TypeScript, JavaScript, SQL, HTML5, CSS3\n- Backend Frameworks: Node.js, Express.js, NestJS\n- Databases: PostgreSQL (with pgvector), MySQL, MongoDB\n- Messaging & Distributed Queues: RabbitMQ, BullMQ, Redis\n- Frontend: React.js, Next.js 14, Tailwind CSS, Three.js, Vue.js\n- DevOps, Cloud & Tools: Docker, Docker Compose, Docker Swarm, Nginx, Git, GitHub Actions CI/CD.',
    },
    {
      title: 'Theara Chim - Professional Work Experience',
      content:
        'Theara Chim has extensive experience in software development and distributed architectures:\n1. Backend Developer at Everlast Information & Apps Dev Co., Ltd. (October 2025 – September 2026):\n- Built and maintained REST APIs and monorepo microservices using TypeScript, Node.js, and Express.js.\n- Engineered omnichannel messaging services integrating Telegram, WhatsApp, LINE, and Messenger powered by RabbitMQ, BullMQ, and Redis.\n- Designed database schemas and optimized SQL queries across PostgreSQL, MySQL, and MongoDB.\n- Implemented strict concurrency control, distributed caching, transactional integrity, and HMAC/JWT security.\n- Deployed production services with Docker Swarm, Nginx, and automated CI/CD pipelines.\n\n2. Freelance Full-Stack Developer (2024 – Present):\n- Engineered full-stack solutions, client admin dashboards, and custom AI support automation platforms.',
    },
    {
      title: 'Theara Chim - Featured Projects & Contact',
      content:
        'Featured Projects built by Theara Chim:\n1. AI Customer Support & Assistant Platform: Multi-tenant autonomous support platform with pgvector HNSW semantic search, deterministic tool execution, real-time WebSockets, and human agent takeover.\n2. Omnichannel Notification & Queue Dispatcher: High-throughput asynchronous messaging engine using RabbitMQ and Redis.\n3. Modern 3D Interactive Portfolio: Built with Next.js 14, Three.js, React Three Fiber, and Tailwind CSS.\n\nContact & Links:\n- Portfolio: https://theara-portfolio.vercel.app\n- GitHub: https://github.com/theara24\n- LinkedIn: https://www.linkedin.com/in/theara-chim-971845341/\n- Telegram: https://t.me/chim_theara\n- Availability: Open to software developer roles, full-stack, and backend engineering positions.',
    },
    {
      title: 'Payment Methods',
      content:
        'Acme Support accepts payments through KHQR, Visa, Mastercard, and Direct Bank Transfer. All payments are encrypted with 256-bit SSL protocols. We do not accept cash-on-delivery or cryptocurrency at this time. Invoices are automatically emailed upon payment authorization.',
    },
    {
      title: 'Shipping Policy',
      content:
        'Acme Support partners with FedEx, UPS, and DHL. Standard ground shipping delivers within 2-4 business days across the continental United States. Express shipping (1-2 business days) is available at checkout. All orders exceeding $50 automatically qualify for free standard shipping. Tracking numbers are provided as soon as packages leave the facility.',
    },
    {
      title: 'Frequently Asked Questions',
      content:
        'Frequently Asked Questions at Acme Support:\nQ: How can I track my order?\nA: Provide your order ID (e.g., ACME-1001) in the chat and our assistant will look up the status and tracking details.\nQ: Can I speak to a live human agent?\nA: Yes! Simply ask to speak with a human support agent and your conversation will be escalated to our available team.',
    },
  ];

  console.log(`\n📚 Ingesting Knowledge Base Documents & Generating 768-dim Vector Embeddings...`);

  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = (apiKey && apiKey !== 'mock_key' && apiKey !== 'your_gemini_api_key_here')
    ? new GoogleGenerativeAI(apiKey)
    : null;
  const embeddingModel = genAI ? genAI.getGenerativeModel({ model: 'gemini-embedding-001' }) : null;

  for (const docData of DOCS) {
    let doc = await prisma.knowledgeDocument.findFirst({
      where: { title: docData.title, organizationId: org.id },
    });

    if (!doc) {
      doc = await prisma.knowledgeDocument.create({
        data: {
          title: docData.title,
          contentType: 'text/plain',
          status: DocumentStatus.PROCESSING,
          organizationId: org.id,
        },
      });
    }

    // Clear existing chunks for idempotency
    await prisma.documentChunk.deleteMany({ where: { documentId: doc.id } });

    // Generate embedding
    let embeddingValues: number[] | null = null;
    if (embeddingModel) {
      try {
        const res = await embeddingModel.embedContent({
          content: { role: 'user', parts: [{ text: docData.content }] },
          outputDimensionality: 768,
        } as any);
        embeddingValues = res.embedding.values;
      } catch (err: any) {
        console.warn(`  Gemini embedding API transient error for "${docData.title}": ${err.message}. Using deterministic vector fallback.`);
      }
    }

    if (!embeddingValues) {
      embeddingValues = new Array(768).fill(0).map((_, i) => Math.sin(docData.content.length * 3 + i * 7) * 0.05);
    }

    const chunkId = crypto.randomUUID();
    const vectorStr = `[${embeddingValues.join(',')}]`;

    await prisma.$executeRaw`
      INSERT INTO document_chunks ("id", "documentId", "chunkIndex", "content", "embedding", "createdAt")
      VALUES (${chunkId}, ${doc.id}, 0, ${docData.content}, ${vectorStr}::vector, NOW());
    `;

    await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: { status: DocumentStatus.READY },
    });

    console.log(`  ✓ Indexed: "${docData.title}" (Status: READY, Chunks: 1, Dimensions: ${embeddingValues.length})`);
  }

  console.log(`\n🎉 Theara AI Support Platform Production Seeding COMPLETED successfully!\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
