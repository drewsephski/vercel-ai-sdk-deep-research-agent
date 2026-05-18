import { requireAuth } from '@/lib/auth';
import { deleteResearchSession } from '@/lib/research-sessions';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const sessionId = parseInt(id);

    if (isNaN(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }

    await deleteResearchSession(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting research session:', error);
    return NextResponse.json(
      { error: 'Failed to delete research session' },
      { status: 500 }
    );
  }
}
