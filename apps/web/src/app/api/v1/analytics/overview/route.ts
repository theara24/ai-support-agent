import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const totalConversations = 24;
    const aiResolvedConversations = 20;
    const humanEscalations = 4;
    const openTickets = 2;
    const totalTokens = 18450;
    const estimatedCost = 0.054;
    const channelBreakdown = { web: 19, telegram: 5 };

    const resolutionRate =
      totalConversations > 0
        ? Math.round((aiResolvedConversations / totalConversations) * 100 * 10) / 10
        : 83.3;

    return NextResponse.json({
      success: true,
      data: {
        totalConversations,
        aiResolvedConversations,
        humanEscalations,
        openTickets,
        resolutionRate,
        totalTokens,
        estimatedCost,
        channelBreakdown,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Analytics fetch failed' } },
      { status: 500 }
    );
  }
}
