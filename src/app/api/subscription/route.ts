import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserSubscription } from '@/lib/subscriptions';

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const subscription = await getUserSubscription(user.id);

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('Subscription fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
