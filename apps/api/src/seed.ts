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
      title: 'Return Policy',
      content:
        'Customers can return merchandise within 30 days of delivery. To be eligible for a full refund, items must be in original packaging with all included accessories. Customers can initiate a return by contacting support or generating a pre-paid return shipping label through the portal.',
    },
    {
      title: 'Refund Policy',
      content:
        'Once returned items are received and inspected at our central fulfillment warehouse, refunds are initiated within 3-5 business days. The refund will be credited back to your original payment method (KHQR, credit card, or bank account). Depending on your financial institution, funds appear on your statement within 2-4 business days.',
    },
    {
      title: 'Order Cancellation',
      content:
        'Orders can be cancelled free of charge within 2 hours of placement while in PROCESSING status. Once an order has reached SHIPPED status, the shipment cannot be intercepted or cancelled; customers should instead utilize our 30-day return policy upon delivery.',
    },
    {
      title: 'Account Security',
      content:
        'Acme implements strict data privacy and user account security standards. Two-factor authentication (2FA) is supported. Support agents will never ask for your password or full payment credentials. If you notice suspicious activity, reset your password immediately via the account settings.',
    },
    {
      title: 'Delivery Times',
      content:
        'Orders submitted before 2:00 PM EST on business days are processed and dispatched on the same day. Orders placed during weekends or public holidays ship on the next business day. Estimated delivery dates are displayed during checkout and tracked via order IDs (such as ACME-1001, ACME-1002, ACME-1003).',
    },
    {
      title: 'Frequently Asked Questions',
      content:
        'Frequently Asked Questions at Acme Support:\nQ: How can I track my order?\nA: Provide your order ID (e.g., ACME-1001) in the chat and our assistant will look up the status and tracking details.\nQ: Can I speak to a live human agent?\nA: Yes! Simply ask to speak with a human support agent and your conversation will be escalated to our available team.\nQ: What if my item arrives damaged?\nA: Our AI assistant or support staff can immediately open an official support ticket and arrange a replacement shipment.',
    },
  ];

  console.log(`\n📚 Ingesting Acme Knowledge Base Documents & Generating 768-dim Vector Embeddings...`);

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
