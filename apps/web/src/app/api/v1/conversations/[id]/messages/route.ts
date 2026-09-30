import { NextRequest, NextResponse } from 'next/server';
import { conversationsStore } from '@/lib/app-data';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { content, isInternalNote } = body;

    const conv = conversationsStore.find((c) => c.id === id);
    if (!conv) {
      return NextResponse.json(
        { success: false, error: { message: 'Conversation not found' } },
        { status: 404 }
      );
    }

    const newMessage = {
      id: `msg-${Date.now().toString(36)}`,
      senderType: (isInternalNote ? 'SYSTEM' : 'AGENT') as any,
      content,
      isInternalNote: !!isInternalNote,
      createdAt: new Date().toISOString(),
    };

    conv.messages.push(newMessage);
    conv.updatedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      data: newMessage,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Failed to send message' } },
      { status: 500 }
    );
  }
}
