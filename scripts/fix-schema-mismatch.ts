import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function fixSchemaMismatch() {
  try {
    console.log('🔧 Fixing schema mismatch...');
    
    // Add missing columns to plans table
    console.log('Adding price_usd column...');
    try {
      await db.execute(sql.raw(`ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "price_usd" numeric(10,2) NOT NULL DEFAULT 0;`));
    } catch (e) {
      console.log('price_usd column already exists or error:', (e as Error).message);
    }
    
    console.log('Adding price_inr column...');
    try {
      await db.execute(sql.raw(`ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "price_inr" numeric(10,2) NOT NULL DEFAULT 0;`));
    } catch (e) {
      console.log('price_inr column already exists or error:', (e as Error).message);
    }
    
    console.log('Adding razorpay_plan_id column...');
    try {
      await db.execute(sql.raw(`ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "razorpay_plan_id" varchar(255);`));
    } catch (e) {
      console.log('razorpay_plan_id column already exists or error:', (e as Error).message);
    }
    
    // Create payment_providers_config table
    console.log('Creating payment_providers_config table...');
    try {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS "payment_providers_config" (
          "id" varchar(50) PRIMARY KEY NOT NULL,
          "name" varchar(100) NOT NULL,
          "is_enabled" boolean DEFAULT false NOT NULL,
          "display_name" varchar(100) NOT NULL,
          "icon_url" varchar(255),
          "priority" integer DEFAULT 1 NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );
      `));
      
      console.log('Inserting default payment provider configurations...');
      await db.execute(sql.raw(`
        INSERT INTO "payment_providers_config" ("id", "name", "is_enabled", "display_name", "priority") VALUES
        ('stripe', 'Stripe', false, 'Credit Card (Stripe)', 1),
        ('lemonsqueezy', 'Lemon Squeezy', false, 'Lemon Squeezy', 2),
        ('razorpay', 'Razorpay', true, 'Razorpay', 3)
        ON CONFLICT (id) DO NOTHING;
      `));
    } catch (e) {
      console.log('Table creation or insert error:', (e as Error).message);
    }
    
    console.log('✅ Schema mismatch fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing schema:', error);
    process.exit(1);
  }
}

fixSchemaMismatch();
