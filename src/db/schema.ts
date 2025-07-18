import { 
  integer, 
  pgTable, 
  varchar, 
  text, 
  timestamp, 
  boolean, 
  decimal,
  pgEnum,
  uuid
} from "drizzle-orm/pg-core";

// Enums for better type safety
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'canceled',
  'past_due',
  'unpaid',
  'trialing',
  'incomplete',
  'incomplete_expired'
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'succeeded',
  'failed',
  'canceled',
  'refunded'
]);

export const paymentProviderEnum = pgEnum('payment_provider', [
  'stripe',
  'lemonsqueezy',
  'razorpay'
]);

export const planIntervalEnum = pgEnum('plan_interval', [
  'month',
  'year',
  'lifetime'
]);

export const authMethodEnum = pgEnum('auth_method', [
  'email',
  'google',
  'github',
  'facebook',
  'twitter',
  'discord'
]);

// Users table - synced with Supabase Auth
export const usersTable = pgTable("users", {
  id: uuid('id').primaryKey(), // This will match Supabase Auth user ID
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  avatar_url: text('avatar_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  last_sign_in: timestamp('last_sign_in'),
  is_active: boolean('is_active').default(true).notNull(),
  metadata: text('metadata'), // JSON field for additional user data
});

// Plans table - Define your subscription tiers with credit-based system
export const plansTable = pgTable("plans", {
  id: varchar('id', { length: 50 }).primaryKey(), // e.g., 'basic_monthly', 'pro_yearly', 'enterprise_monthly'
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  price_usd: decimal('price_usd', { precision: 10, scale: 2 }).notNull(),
  price_inr: decimal('price_inr', { precision: 10, scale: 2 }).notNull(),
  interval: planIntervalEnum('interval').notNull(),
  monthly_credits: integer('monthly_credits').notNull(),
  
  // Credit costs per action
  idea_cost: integer('idea_cost').notNull(),
  script_cost: integer('script_cost').notNull(),
  audio_cost: integer('audio_cost').notNull(),
  image_cost: integer('image_cost').notNull(),
  video_cost: integer('video_cost').notNull(),
  thumbnail_cost: integer('thumbnail_cost').notNull(),
  metadata_cost: integer('metadata_cost').notNull(),
  
  // Plan features
  export_quality: varchar('export_quality', { length: 10 }).notNull(), // '720P', '4K', '8K'
  features: text('features'), // JSON array of additional features
  
  // Legacy fields for compatibility
  max_users: integer('max_users'),
  max_projects: integer('max_projects'),
  storage_limit_gb: integer('storage_limit_gb'),
  api_calls_limit: integer('api_calls_limit'),
  
  // Plan metadata
  is_popular: boolean('is_popular').default(false),
  is_active: boolean('is_active').default(true).notNull(),
  stripe_price_id: varchar('stripe_price_id', { length: 255 }),
  lemonsqueezy_variant_id: varchar('lemonsqueezy_variant_id', { length: 255 }),
  razorpay_plan_id: varchar('razorpay_plan_id', { length: 255 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Payment providers configuration table - Control which providers are enabled
export const paymentProvidersConfigTable = pgTable("payment_providers_config", {
  id: varchar('id', { length: 50 }).primaryKey(), // 'stripe', 'lemonsqueezy', 'razorpay'
  name: varchar('name', { length: 100 }).notNull(), // 'Stripe', 'Lemon Squeezy', 'Razorpay'
  is_enabled: boolean('is_enabled').default(false).notNull(),
  display_name: varchar('display_name', { length: 100 }).notNull(), // What users see
  icon_url: varchar('icon_url', { length: 255 }), // Optional: provider logo/icon
  priority: integer('priority').default(1).notNull(), // Display order when multiple enabled
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Subscriptions table - Track user subscriptions
export const subscriptionsTable = pgTable("subscriptions", {
  id: varchar('id', { length: 255 }).primaryKey(), // Provider subscription ID
  user_id: uuid('user_id').references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  plan_id: varchar('plan_id', { length: 50 }).references(() => plansTable.id).notNull(),
  status: subscriptionStatusEnum('status').notNull(),
  provider: paymentProviderEnum('provider').notNull(),
  provider_subscription_id: varchar('provider_subscription_id', { length: 255 }).notNull(),
  provider_customer_id: varchar('provider_customer_id', { length: 255 }),
  current_period_start: timestamp('current_period_start').notNull(),
  current_period_end: timestamp('current_period_end').notNull(),
  trial_start: timestamp('trial_start'),
  trial_end: timestamp('trial_end'),
  canceled_at: timestamp('canceled_at'),
  cancel_at_period_end: boolean('cancel_at_period_end').default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Payments table - Track all payment transactions
export const paymentsTable = pgTable("payments", {
  id: varchar('id', { length: 255 }).primaryKey(), // Provider payment ID
  user_id: uuid('user_id').references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  subscription_id: varchar('subscription_id', { length: 255 }).references(() => subscriptionsTable.id),
  provider: paymentProviderEnum('provider').notNull(),
  provider_payment_id: varchar('provider_payment_id', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  status: paymentStatusEnum('status').notNull(),
  description: text('description'),
  invoice_url: text('invoice_url'),
  receipt_url: text('receipt_url'),
  failure_reason: text('failure_reason'),
  refunded_amount: decimal('refunded_amount', { precision: 10, scale: 2 }).default('0'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// User credits table - Track user credit balances
export const userCreditsTable = pgTable("user_credits", {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  user_id: uuid('user_id').references(() => usersTable.id, { onDelete: 'cascade' }).notNull().unique(),
  plan_id: varchar('plan_id', { length: 50 }).references(() => plansTable.id).notNull(),
  current_balance: integer('current_balance').default(0).notNull(),
  total_allocated: integer('total_allocated').default(0).notNull(),
  last_refresh_date: timestamp('last_refresh_date').defaultNow().notNull(),
  next_refresh_date: timestamp('next_refresh_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Credit transactions table - Track all credit additions and usage
export const creditTransactionsTable = pgTable("credit_transactions", {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  user_id: uuid('user_id').references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'allocation', 'usage', 'carryover', 'bonus'
  amount: integer('amount').notNull(), // positive for additions, negative for usage
  action_type: varchar('action_type', { length: 50 }), // 'idea', 'script', 'audio', etc. (null for allocations)
  description: text('description'),
  balance_before: integer('balance_before').notNull(),
  balance_after: integer('balance_after').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// User features table - Track feature access per user
export const userFeaturesTable = pgTable("user_features", {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  user_id: uuid('user_id').references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  feature_key: varchar('feature_key', { length: 100 }).notNull(),
  is_enabled: boolean('is_enabled').default(true).notNull(),
  usage_count: integer('usage_count').default(0),
  usage_limit: integer('usage_limit'),
  reset_date: timestamp('reset_date'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// User authentication methods table - Track how users signed up
export const userAuthMethodsTable = pgTable("user_auth_methods", {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  user_id: uuid('user_id').references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  auth_method: authMethodEnum('auth_method').notNull(),
  is_primary: boolean('is_primary').default(false).notNull(),
  provider_id: varchar('provider_id', { length: 255 }), // Provider-specific user ID
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Webhooks table - Track webhook events for debugging
export const webhooksTable = pgTable("webhooks", {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  provider: paymentProviderEnum('provider').notNull(),
  event_type: varchar('event_type', { length: 100 }).notNull(),
  event_id: varchar('event_id', { length: 255 }).notNull().unique(),
  data: text('data').notNull(), // JSON payload
  processed: boolean('processed').default(false),
  error_message: text('error_message'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  processed_at: timestamp('processed_at'),
});

// Export types for TypeScript
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Plan = typeof plansTable.$inferSelect;
export type NewPlan = typeof plansTable.$inferInsert;

export type Subscription = typeof subscriptionsTable.$inferSelect;
export type NewSubscription = typeof subscriptionsTable.$inferInsert;

export type Payment = typeof paymentsTable.$inferSelect;
export type NewPayment = typeof paymentsTable.$inferInsert;

export type UserCredits = typeof userCreditsTable.$inferSelect;
export type NewUserCredits = typeof userCreditsTable.$inferInsert;

export type CreditTransaction = typeof creditTransactionsTable.$inferSelect;
export type NewCreditTransaction = typeof creditTransactionsTable.$inferInsert;

export type UserFeature = typeof userFeaturesTable.$inferSelect;
export type NewUserFeature = typeof userFeaturesTable.$inferInsert;

export type UserAuthMethod = typeof userAuthMethodsTable.$inferSelect;
export type NewUserAuthMethod = typeof userAuthMethodsTable.$inferInsert;

export type Webhook = typeof webhooksTable.$inferSelect;
export type NewWebhook = typeof webhooksTable.$inferInsert;

export type PaymentProviderConfig = typeof paymentProvidersConfigTable.$inferSelect;
export type NewPaymentProviderConfig = typeof paymentProvidersConfigTable.$inferInsert;
