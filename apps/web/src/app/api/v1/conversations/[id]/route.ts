import { NextRequest, NextResponse } from 'next/server';
import { conversationsStore } from '@/lib/app-data';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const conv = conversationsStore.find((c) => c.id === id);

  if (!conv) {
    return NextResponse.json(
      { success: false, error: { message: 'Conversation not found' } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: conv,
  });
}
