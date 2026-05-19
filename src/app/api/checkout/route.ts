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

    // Parse URL-encoded body reliably
    const body = await req.text();
    const params = new URLSearchParams(body);
    const plan = params.get('plan');

    // Validate with Zod schema
    const validation = checkoutSchema.safeParse({ plan });
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = getPlanPriceId(validation.data.plan);

    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan configuration' }, { status: 400 });
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
