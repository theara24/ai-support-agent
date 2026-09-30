import { NextRequest, NextResponse } from 'next/server';
import { kbDocumentsStore } from '@/lib/app-data';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const index = kbDocumentsStore.findIndex((d) => d.id === id);

    if (index !== -1) {
      kbDocumentsStore.splice(index, 1);
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err?.message || 'Failed to delete document' } },
      { status: 500 }
    );
  }
}
