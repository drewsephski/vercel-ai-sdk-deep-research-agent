import { pgTable, serial, text, timestamp, jsonb, integer, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: text('email').notNull().unique(),
  name: text('name'),
  freeCredits: integer('free_credits').notNull().default(3), // One-time free credits
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  plan: text('plan').notNull(), // 'starter', 'pro', 'power'
  status: text('status').notNull().default('active'), // 'active', 'canceled', 'past_due', 'incomplete'
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripePriceId: text('stripe_price_id'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  sessionsUsed: integer('sessions_used').notNull().default(0),
  sessionsLimit: integer('sessions_limit').notNull(),
  maxDepth: integer('max_depth').notNull(),
  maxBreadth: integer('max_breadth').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const researchSessions = pgTable('research_sessions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  prompt: text('prompt').notNull(),
  depth: text('depth').notNull(),
  breadth: text('breadth').notNull(),
  status: text('status').notNull().default('pending'),
  report: text('report'),
  pdfUrl: text('pdf_url'),
  researchData: jsonb('research_data'),
  clarifyingQuestions: jsonb('clarifying_questions'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type ResearchSession = typeof researchSessions.$inferSelect;
export type NewResearchSession = typeof researchSessions.$inferInsert;

export const PLAN_LIMITS = {
  starter: { maxDepth: 1, maxBreadth: 2, sessionsLimit: 3 },
  pro: { maxDepth: 3, maxBreadth: 5, sessionsLimit: 20 },
  power: { maxDepth: 5, maxBreadth: 10, sessionsLimit: null }, // unlimited
} as const;

export type Plan = keyof typeof PLAN_LIMITS;
