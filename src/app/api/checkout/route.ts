import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createStripeCheckoutSession, getPlanPriceId } from '@/lib/subscriptions';
import { z } from 'zod';

const checkoutSchema = z.object({
  plan: z.enum(['pro', 'power']),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const formData = await req.formData();
    const plan = formData.get('plan') as string;

    if (!plan || (plan !== 'pro' && plan !== 'power')) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = getPlanPriceId(plan as 'pro' | 'power');

    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const session = await createStripeCheckoutSession(user.id, priceId, user.email);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
