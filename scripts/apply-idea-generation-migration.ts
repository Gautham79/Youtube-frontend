import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function applyMigration() {
  try {
    console.log('🚀 Applying idea generation migration...');
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'drizzle', '0004_add_idea_generation_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the entire migration as one block to handle DO blocks properly
    console.log('Executing migration...');
    await db.execute(sql.raw(migrationSQL));
    
    console.log('✅ Idea generation migration applied successfully!');
    console.log('📊 New tables created:');
    console.log('   - youtube_categories');
    console.log('   - trending_topics');
    console.log('   - user_preferences');
    console.log('   - generated_ideas');
    console.log('   - idea_generation_sessions');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
