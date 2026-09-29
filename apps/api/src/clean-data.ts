import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up test data (keeping Knowledge Base and User Accounts)...');

  // Delete in order of foreign key constraints
  const ticketComments = await prisma.ticketComment.deleteMany();
  console.log(`✓ Deleted ${ticketComments.count} ticket comments`);

  const tickets = await prisma.ticket.deleteMany();
  console.log(`✓ Deleted ${tickets.count} tickets`);

  const toolCalls = await prisma.toolCall.deleteMany();
  console.log(`✓ Deleted ${toolCalls.count} tool call logs`);

  const messages = await prisma.message.deleteMany();
  console.log(`✓ Deleted ${messages.count} messages`);

  const aiUsages = await prisma.aIUsage.deleteMany();
  console.log(`✓ Deleted ${aiUsages.count} AI usage logs`);

  const conversations = await prisma.conversation.deleteMany();
  console.log(`✓ Deleted ${conversations.count} conversations`);

  const auditLogs = await prisma.auditLog.deleteMany();
  console.log(`✓ Deleted ${auditLogs.count} audit logs`);

  const notifications = await prisma.notification.deleteMany();
  console.log(`✓ Deleted ${notifications.count} notifications`);

  const customers = await prisma.customer.deleteMany();
  console.log(`✓ Deleted ${customers.count} test customers`);

  // Verify remaining records
  const usersCount = await prisma.user.count();
  const orgCount = await prisma.organization.count();
  const docsCount = await prisma.knowledgeDocument.count();
  const chunksCount = await prisma.documentChunk.count();

  console.log('\n📊 Preserved Production Data:');
  console.log(`   - Organizations: ${orgCount}`);
  console.log(`   - User Accounts: ${usersCount}`);
  console.log(`   - Knowledge Base Documents: ${docsCount}`);
  console.log(`   - Vector Chunks (pgvector): ${chunksCount}`);
  console.log('\n✨ Database clean up completed successfully!');
}

main()
  .catch((e) => {
    console.error('Clean up failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
