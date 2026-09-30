import { NextRequest, NextResponse } from 'next/server';
import { conversationsStore, ConversationItem } from '@/lib/app-data';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: conversationsStore,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const newConv: ConversationItem = {
      id: `conv-${Date.now().toString(36)}`,
      channel: body.channel || 'WEB',
      status: 'AI_ACTIVE',
      customerName: body.customerName || 'Web Client',
      customerEmail: body.customerEmail || 'client@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    conversationsStore.unshift(newConv);
    return NextResponse.json({ success: true, data: newConv });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Failed to create conversation' } },
      { status: 500 }
    );
  }
}
