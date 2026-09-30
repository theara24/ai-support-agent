import { NextRequest, NextResponse } from 'next/server';
import { ticketsStore, TicketItem } from '@/lib/app-data';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: ticketsStore,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, priority = 'MEDIUM' } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: { message: 'Title is required' } },
        { status: 400 }
      );
    }

    const newTicket: TicketItem = {
      id: `ticket-${Date.now().toString(36)}`,
      title,
      description: description || '',
      priority: priority.toUpperCase() as any,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      customer: { name: 'Portal User', email: 'user@workspace.local' },
    };

    ticketsStore.unshift(newTicket);

    return NextResponse.json({
      success: true,
      data: newTicket,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Failed to create ticket' } },
      { status: 500 }
    );
  }
}
