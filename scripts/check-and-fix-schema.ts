import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function checkAndFixSchema() {
  try {
    console.log('🔍 Checking current database schema...');
    
    // Check if price_usd column exists
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'plans' AND column_name = 'price_usd'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ price_usd column does not exist. Applying migration...');
      
      // Apply the migration step by step
      const migrationSteps = [
        `ALTER TABLE "plans" ADD COLUMN "price_usd" numeric(10, 2)`,
        `ALTER TABLE "plans" ADD COLUMN "price_inr" numeric(10, 2)`,
        `ALTER TABLE "plans" ADD COLUMN "monthly_credits" integer`,
        `ALTER TABLE "plans" ADD COLUMN "idea_cost" integer`,
        `ALTER TABLE "plans" ADD COLUMN "script_cost" integer`,
        `ALTER TABLE "plans" ADD COLUMN "audio_cost" integer`,
        `ALTER TABLE "plans" ADD COLUMN "image_cost" integer`,
        `ALTER TABLE "plans" ADD COLUMN "video_cost" integer`,
        `ALTER TABLE "plans" ADD COLUMN "thumbnail_cost" integer`,
        `ALTER TABLE "plans" ADD COLUMN "metadata_cost" integer`,
        `ALTER TABLE "plans" ADD COLUMN "export_quality" varchar(10)`,
        
        // Update existing data
        `UPDATE "plans" SET 
          "price_usd" = "price",
          "price_inr" = "price" * 80,
          "monthly_credits" = 1000,
          "idea_cost" = 1,
          "script_cost" = 2,
          "audio_cost" = 2,
          "image_cost" = 5,
          "video_cost" = 5,
          "thumbnail_cost" = 2,
          "metadata_cost" = 2,
          "export_quality" = '720P'
        WHERE "price_usd" IS NULL`,
        
        // Make columns NOT NULL
        `ALTER TABLE "plans" ALTER COLUMN "price_usd" SET NOT NULL`,
        `ALTER TABLE "plans" ALTER COLUMN "price_inr" SET NOT NULL`,
        `ALTER TABLE "plans" ALTER COLUMN "monthly_credits" SET NOT NULL`,
        `ALTER TABLE "plans" ALTER COLUMN "idea_cost" SET NOT NULL`,
        `ALTER TABLE "plans" ALTER COLUMN "script_cost" SET NOT NULL`,
        `ALTER TABLE "plans" ALTER COLUMN "audio_cost" SET NOT NULL`,
        `ALTER TABLE "plans" ALTER COLUMN "image_cost" SET NOT NULL`,
        `ALTER TABLE "plans" ALTER COLUMN "video_cost" SET NOT NULL`,
        `ALTER TABLE "plans" ALTER COLUMN "thumbnail_cost" SET NOT NULL`,
        `ALTER TABLE "plans" ALTER COLUMN "metadata_cost" SET NOT NULL`,
        `ALTER TABLE "plans" ALTER COLUMN "export_quality" SET NOT NULL`,
      ];
      
      for (const step of migrationSteps) {
        try {
          console.log('Executing:', step.substring(0, 50) + '...');
          await db.execute(sql.raw(step));
        } catch (error: any) {
          if (error.message.includes('already exists') || error.message.includes('column already exists')) {
            console.log('⚠️ Column already exists, skipping...');
            continue;
          }
          throw error;
        }
      }
      
      console.log('✅ Migration applied successfully!');
    } else {
      console.log('✅ Schema is already up to date!');
    }
    
    // Check if credit tables exist
    const creditTableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'user_credits'
    `);
    
    if (creditTableCheck.rows.length === 0) {
      console.log('📋 Creating credit system tables...');
      
      // Create auth method enum if it doesn't exist
      try {
        await db.execute(sql`CREATE TYPE "public"."auth_method" AS ENUM('email', 'google', 'github', 'facebook', 'twitter', 'discord')`);
      } catch (error: any) {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
      
      // Create user credits table
      await db.execute(sql`
        CREATE TABLE "user_credits" (
          "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
          "user_id" uuid NOT NULL,
          "plan_id" varchar(50) NOT NULL,
          "current_balance" integer DEFAULT 0 NOT NULL,
          "total_allocated" integer DEFAULT 0 NOT NULL,
          "last_refresh_date" timestamp DEFAULT now() NOT NULL,
          "next_refresh_date" timestamp NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL,
          CONSTRAINT "user_credits_user_id_unique" UNIQUE("user_id")
        )
      `);
      
      // Create credit transactions table
      await db.execute(sql`
        CREATE TABLE "credit_transactions" (
          "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
          "user_id" uuid NOT NULL,
          "type" varchar(20) NOT NULL,
          "amount" integer NOT NULL,
          "action_type" varchar(50),
          "description" text,
          "balance_before" integer NOT NULL,
          "balance_after" integer NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL
        )
      `);
      
      // Create user auth methods table
      await db.execute(sql`
        CREATE TABLE "user_auth_methods" (
          "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
          "user_id" uuid NOT NULL,
          "email" varchar(255) NOT NULL,
          "auth_method" "auth_method" NOT NULL,
          "is_primary" boolean DEFAULT false NOT NULL,
          "provider_id" varchar(255),
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        )
      `);
      
      // Add foreign key constraints
      await db.execute(sql`ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade`);
      await db.execute(sql`ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id")`);
      await db.execute(sql`ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade`);
      await db.execute(sql`ALTER TABLE "user_auth_methods" ADD CONSTRAINT "user_auth_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade`);
      
      console.log('✅ Credit system tables created successfully!');
    } else {
      console.log('✅ Credit system tables already exist!');
    }
    
  } catch (error) {
    console.error('❌ Schema check/fix failed:', error);
    process.exit(1);
  }
}

checkAndFixSchema();
