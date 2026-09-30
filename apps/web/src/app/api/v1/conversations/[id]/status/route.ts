import { NextRequest, NextResponse } from 'next/server';
import { conversationsStore } from '@/lib/app-data';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const conv = conversationsStore.find((c) => c.id === id);
    if (!conv) {
      return NextResponse.json(
        { success: false, error: { message: 'Conversation not found' } },
        { status: 404 }
      );
    }

    if (body.status) {
      conv.status = body.status;
    }
    conv.updatedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      data: conv,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Failed to update status' } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  return POST(req, context);
}
