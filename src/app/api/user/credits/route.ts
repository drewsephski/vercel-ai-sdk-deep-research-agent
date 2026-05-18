import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserFreeCredits } from '@/lib/subscriptions';

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const freeCredits = await getUserFreeCredits(user.id);

    return NextResponse.json({ freeCredits });
  } catch (error) {
    console.error('Credits fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    );
  }
}
