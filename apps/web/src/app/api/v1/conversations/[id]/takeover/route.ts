import { NextRequest, NextResponse } from 'next/server';
import { conversationsStore } from '@/lib/app-data';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const conv = conversationsStore.find((c) => c.id === id);
    if (!conv) {
      return NextResponse.json(
        { success: false, error: { message: 'Conversation not found' } },
        { status: 404 }
      );
    }

    conv.status = 'HUMAN_ACTIVE';
    conv.assignedAgentName = 'Theara Chim';
    conv.updatedAt = new Date().toISOString();

    const systemMsg = {
      id: `msg-${Date.now().toString(36)}`,
      senderType: 'SYSTEM' as const,
      content: 'Agent Theara Chim took over this conversation.',
      createdAt: new Date().toISOString(),
    };
    conv.messages.push(systemMsg);

    return NextResponse.json({
      success: true,
      data: conv,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Failed to take over' } },
      { status: 500 }
    );
  }
}
