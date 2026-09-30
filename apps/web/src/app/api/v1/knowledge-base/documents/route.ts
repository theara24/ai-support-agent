import { NextRequest, NextResponse } from 'next/server';
import { kbDocumentsStore, DocumentItem } from '@/lib/app-data';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: kbDocumentsStore,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { title, content } = await req.json();

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: { message: 'Title and content are required' } },
        { status: 400 }
      );
    }

    const newDoc: DocumentItem = {
      id: `doc-${Date.now().toString(36)}`,
      title,
      status: 'READY',
      createdAt: new Date().toISOString(),
      chunkCount: Math.max(1, Math.ceil(content.length / 500)),
      fileSize: content.length,
      content,
    };

    kbDocumentsStore.unshift(newDoc);

    return NextResponse.json({
      success: true,
      data: newDoc,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Failed to create document' } },
      { status: 500 }
    );
  }
}
