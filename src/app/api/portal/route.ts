import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserSubscription, createStripeBillingPortalSession } from '@/lib/subscriptions';

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const subscription = await getUserSubscription(user.id);

    if (!subscription || !subscription.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    const session = await createStripeBillingPortalSession(subscription.stripeCustomerId);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Portal error:', error);
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}
