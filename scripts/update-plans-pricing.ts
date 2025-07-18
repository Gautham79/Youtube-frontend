import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function updatePlansPricing() {
  try {
    console.log('💰 Updating plans with USD and INR pricing...');
    
    // Update existing plans with pricing
    const updates = [
      { id: 'free', priceUSD: 0, priceINR: 0 },
      { id: 'basic', priceUSD: 9.99, priceINR: 799 },
      { id: 'pro', priceUSD: 29.99, priceINR: 2499 },
      { id: 'enterprise', priceUSD: 99.99, priceINR: 8499 }
    ];
    
    for (const update of updates) {
      console.log(`Updating ${update.id} plan: $${update.priceUSD} / ₹${update.priceINR}`);
      
      await db.execute(sql.raw(`
        UPDATE plans 
        SET price_usd = ${update.priceUSD}, price_inr = ${update.priceINR}
        WHERE id = '${update.id}';
      `));
    }
    
    console.log('✅ Plans pricing updated successfully!');
    
    // Display current plans
    console.log('\n📋 Current plans:');
    const plans = await db.execute(sql.raw(`
      SELECT id, name, price_usd, price_inr, razorpay_plan_id 
      FROM plans 
      ORDER BY price_usd;
    `));
    
    console.table(plans);
    
  } catch (error) {
    console.error('❌ Error updating plans pricing:', error);
    process.exit(1);
  }
}

updatePlansPricing();
