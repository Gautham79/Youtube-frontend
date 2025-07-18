import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function seedPlans() {
  try {
    console.log('🌱 Seeding credit-based subscription plans...');
    
    // Insert plans using raw SQL to avoid TypeScript issues
    // Use ON CONFLICT DO UPDATE to handle existing plans
    await db.execute(sql`
      INSERT INTO plans (
        id, name, description, price_usd, price_inr, interval, 
        monthly_credits, idea_cost, script_cost, audio_cost, image_cost, 
        video_cost, thumbnail_cost, metadata_cost, export_quality, 
        features, max_users, max_projects, storage_limit_gb, api_calls_limit, 
        is_popular, is_active
      ) VALUES 
      -- Basic Plans
      (
        'basic_monthly', 'Basic Monthly', 
        'Perfect for individual creators getting started',
        24.99, 2400.00, 'month', 1000, 1, 2, 2, 5, 5, 2, 2, '720P',
        '["1000 credits per month","720P export quality","Basic AI voices","Standard support","All core features"]',
        1, 50, 10, 10000, false, true
      ),
      (
        'basic_yearly', 'Basic Yearly',
        'Best value for consistent creators - save 67%',
        99.00, 9999.00, 'year', 1200, 1, 2, 2, 3, 3, 2, 2, '4K',
        '["1200 credits per month","4K export quality","Premium AI voices","Priority support","All core features","Save 67% vs monthly"]',
        1, 100, 25, 25000, true, true
      ),
      -- Pro Plans
      (
        'pro_monthly', 'Pro Monthly',
        'For serious content creators and growing channels',
        49.99, 4999.00, 'month', 3000, 1, 1, 1, 3, 3, 1, 1, '4K',
        '["3000 credits per month","4K export quality","Premium AI voices","Advanced analytics","Priority support","Team collaboration","Custom thumbnails"]',
        3, 200, 50, 50000, false, true
      ),
      (
        'pro_yearly', 'Pro Yearly',
        'Professional creators annual plan - save 60%',
        199.00, 19999.00, 'year', 3600, 1, 1, 1, 2, 2, 1, 1, '8K',
        '["3600 credits per month","8K export quality","Premium AI voices","Advanced analytics","Priority support","Team collaboration","Custom thumbnails","Save 60% vs monthly"]',
        5, 500, 100, 100000, true, true
      ),
      -- Enterprise Plans
      (
        'enterprise_monthly', 'Enterprise Monthly',
        'For agencies and high-volume creators',
        149.99, 14999.00, 'month', 10000, 1, 1, 1, 2, 2, 1, 1, '8K',
        '["10000 credits per month","8K export quality","Custom AI voice cloning","White-label solution","API access","Bulk video generation","Dedicated account manager","24/7 priority support"]',
        25, NULL, 500, 500000, false, true
      ),
      (
        'enterprise_yearly', 'Enterprise Yearly',
        'Ultimate plan for large organizations - save 50%',
        599.00, 59999.00, 'year', 12000, 1, 1, 1, 1, 1, 1, 1, '8K',
        '["12000 credits per month","8K export quality","Custom AI voice cloning","White-label solution","API access","Bulk video generation","Dedicated account manager","24/7 priority support","Custom integrations","Save 50% vs monthly"]',
        NULL, NULL, 1000, 1000000, false, true
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price_usd = EXCLUDED.price_usd,
        price_inr = EXCLUDED.price_inr,
        interval = EXCLUDED.interval,
        monthly_credits = EXCLUDED.monthly_credits,
        idea_cost = EXCLUDED.idea_cost,
        script_cost = EXCLUDED.script_cost,
        audio_cost = EXCLUDED.audio_cost,
        image_cost = EXCLUDED.image_cost,
        video_cost = EXCLUDED.video_cost,
        thumbnail_cost = EXCLUDED.thumbnail_cost,
        metadata_cost = EXCLUDED.metadata_cost,
        export_quality = EXCLUDED.export_quality,
        features = EXCLUDED.features,
        max_users = EXCLUDED.max_users,
        max_projects = EXCLUDED.max_projects,
        storage_limit_gb = EXCLUDED.storage_limit_gb,
        api_calls_limit = EXCLUDED.api_calls_limit,
        is_popular = EXCLUDED.is_popular,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    `);
    
    console.log('✅ Database seeded successfully!');
    console.log('📋 Created credit-based subscription plans:');
    console.log('  Basic Plans:');
    console.log('    - Basic Monthly: $24.99/₹2400 (1000 credits)');
    console.log('    - Basic Yearly: $99/₹9999 (1200 credits/month)');
    console.log('  Pro Plans:');
    console.log('    - Pro Monthly: $49.99/₹4999 (3000 credits)');
    console.log('    - Pro Yearly: $199/₹19999 (3600 credits/month)');
    console.log('  Enterprise Plans:');
    console.log('    - Enterprise Monthly: $149.99/₹14999 (10000 credits)');
    console.log('    - Enterprise Yearly: $599/₹59999 (12000 credits/month)');
    
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    process.exit(1);
  }
}

seedPlans();
