import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function applyMigration() {
  try {
    console.log('🚀 Applying Razorpay migration...');
    
    const migrationPath = path.join(process.cwd(), 'drizzle', '0003_add_razorpay_support.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        await db.execute(sql.raw(statement));
      }
    }
    
    console.log('✅ Razorpay migration applied successfully!');
    console.log('📋 Summary of changes:');
    console.log('  - Added razorpay_plan_id column to plans table');
    console.log('  - Created payment_providers_config table');
    console.log('  - Inserted default payment provider configurations');
    console.log('  - Enabled Razorpay as the default payment provider');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
