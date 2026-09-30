import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://theara-ai-support-api.onrender.com';

async function forward(req: NextRequest) {
  const targetUrl = `${API_BASE_URL}/api/v1/users${req.nextUrl.search}`;
  const headers = new Headers();
  const authHeader = req.headers.get('authorization');
  if (authHeader) headers.set('authorization', authHeader);
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
    init.body = await req.text();
  }

  try {
    const res = await fetch(targetUrl, init);
    const data = await res.json().catch(() => null);
    return NextResponse.json(data || {}, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Failed to connect to API backend' } },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest) {
  return forward(req);
}

export async function POST(req: NextRequest) {
  return forward(req);
}
