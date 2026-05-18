import { db } from '@/db';
import { subscriptions, users, PLAN_LIMITS, Plan } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const STRIPE_PRICE_IDS = {
  pro: 'price_1TYZyXDoeQ7F9INP67tnubcZ',
  power: 'price_1TYZyXDoeQ7F9INPOa0Qazar',
} as const;

export async function getUserSubscription(userId: string) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  return subscription;
}

export async function getUserFreeCredits(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.freeCredits ?? 0;
}

export async function ensureSubscription(userId: string) {
  let subscription = await getUserSubscription(userId);

  if (!subscription) {
    // Create default starter subscription
    const [newSubscription] = await db
      .insert(subscriptions)
      .values({
        userId,
        plan: 'starter',
        status: 'active',
        sessionsUsed: 0,
        sessionsLimit: PLAN_LIMITS.starter.sessionsLimit!,
        maxDepth: PLAN_LIMITS.starter.maxDepth,
        maxBreadth: PLAN_LIMITS.starter.maxBreadth,
      })
      .returning();
    subscription = newSubscription;
  }

  return subscription;
}

export async function canStartResearch(userId: string) {
  const subscription = await getUserSubscription(userId);
  const freeCredits = await getUserFreeCredits(userId);

  // If user has a paid subscription, check their plan limits
  if (subscription && subscription.status === 'active') {
    if (subscription.plan === 'power') {
      return { allowed: true, subscription, freeCredits: 0 };
    }

    if (subscription.sessionsUsed >= subscription.sessionsLimit) {
      return { allowed: false, subscription, freeCredits, reason: 'Session limit reached' };
    }

    return { allowed: true, subscription, freeCredits };
  }

  // If no subscription, check free credits
  if (freeCredits <= 0) {
    return { allowed: false, subscription, freeCredits, reason: 'No free credits remaining. Please upgrade to continue.' };
  }

  return { allowed: true, subscription, freeCredits };
}

export async function incrementSessionUsage(userId: string) {
  const subscription = await getUserSubscription(userId);
  
  // If user has no active subscription, decrement free credits
  if (!subscription || subscription.status !== 'active') {
    const [updatedUser] = await db
      .update(users)
      .set({
        freeCredits: sql`${users.freeCredits} - 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  // If user has a paid subscription, increment their session usage
  if (subscription.plan === 'power') {
    return subscription; // Unlimited
  }

  const [updated] = await db
    .update(subscriptions)
    .set({
      sessionsUsed: subscription.sessionsUsed + 1,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id))
    .returning();

  return updated;
}

export async function resetMonthlyUsage() {
  // This should be called by a cron job or webhook when subscription renews
  const updated = await db
    .update(subscriptions)
    .set({
      sessionsUsed: 0,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.status, 'active'))
    .returning();

  return updated;
}

export async function createStripeCheckoutSession(
  userId: string,
  priceId: string,
  userEmail: string
) {
  // Create or get Stripe customer
  const subscription = await getUserSubscription(userId);
  
  let customerId = subscription?.stripeCustomerId;
  
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { userId },
    });
    customerId = customer.id;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/dashboard?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=canceled`,
    metadata: { userId },
  });

  return session;
}

export async function createStripeBillingPortalSession(customerId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/dashboard`,
  });

  return session;
}

export async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      
      if (!userId) {
        throw new Error('No userId in session metadata');
      }

      const subscriptionId = session.subscription as string;
      const customerId = session.customer as string;
      
      // Get subscription details from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
      const priceId = stripeSubscription.items.data[0].price.id;
      
      // Determine plan based on price
      let plan: Plan = 'starter';
      if (priceId === STRIPE_PRICE_IDS.pro) plan = 'pro';
      if (priceId === STRIPE_PRICE_IDS.power) plan = 'power';

      const limits = PLAN_LIMITS[plan];

      // Update or create subscription in database
      const existing = await getUserSubscription(userId);
      
      if (existing) {
        await db
          .update(subscriptions)
          .set({
            plan,
            status: 'active',
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            sessionsUsed: 0, // Reset usage on new subscription
            sessionsLimit: limits.sessionsLimit!,
            maxDepth: limits.maxDepth,
            maxBreadth: limits.maxBreadth,
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, existing.id));
      } else {
        await db.insert(subscriptions).values({
          userId,
          plan,
          status: 'active',
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          stripePriceId: priceId,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          sessionsUsed: 0,
          sessionsLimit: limits.sessionsLimit!,
          maxDepth: limits.maxDepth,
          maxBreadth: limits.maxBreadth,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        });
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription };
      
      // subscription can be a string (ID) or a Subscription object or null
      const subscriptionId = typeof invoice.subscription === 'string' 
        ? invoice.subscription 
        : invoice.subscription?.id;

      if (!subscriptionId) {
        break; // Skip if no subscription associated
      }
      
      // Reset usage when payment succeeds
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
        .limit(1);

      if (subscription) {
        await db
          .update(subscriptions)
          .set({
            sessionsUsed: 0,
            status: 'active',
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, subscription.id));
      }
      break;
    }

    case 'customer.subscription.updated': {
      const stripeSubscription = event.data.object as any;
      const subscriptionId = stripeSubscription.id;
      
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
        .limit(1);

      if (subscription) {
        await db
          .update(subscriptions)
          .set({
            status: stripeSubscription.status,
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, subscription.id));
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const stripeSubscription = event.data.object as any;
      const subscriptionId = stripeSubscription.id;
      
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
        .limit(1);

      if (subscription) {
        // Downgrade to starter
        await db
          .update(subscriptions)
          .set({
            plan: 'starter',
            status: 'canceled',
            stripeSubscriptionId: null,
            stripePriceId: null,
            sessionsLimit: PLAN_LIMITS.starter.sessionsLimit!,
            maxDepth: PLAN_LIMITS.starter.maxDepth,
            maxBreadth: PLAN_LIMITS.starter.maxBreadth,
            sessionsUsed: 0,
            cancelAtPeriodEnd: false,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, subscription.id));
      }
      break;
    }
  }
}

export function getPlanPriceId(plan: Plan): string {
  return STRIPE_PRICE_IDS[plan] || '';
}
