import { db } from '../src/db';
import { usersTable, userCreditsTable, plansTable, creditTransactionsTable } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function addUserCredits() {
  const email = 'gautham.mallik@gmail.com';
  const creditsToAdd = 100;
  
  try {
    console.log(`🔍 Looking for user with email: ${email}`);
    
    // Find the user by email
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    
    if (user.length === 0) {
      console.log(`❌ User with email ${email} not found.`);
      console.log('📝 Creating user record...');
      
      // Create user record
      const newUser = await db
        .insert(usersTable)
        .values({
          id: crypto.randomUUID(),
          email: email,
          name: 'Gautham Mallik',
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();
      
      console.log(`✅ Created user: ${newUser[0].id}`);
      
      // Get a default plan (basic plan)
      const plans = await db.select().from(plansTable).limit(1);
      const defaultPlan = plans[0];
      
      if (!defaultPlan) {
        console.log('❌ No plans found in database. Please seed plans first.');
        return;
      }
      
      // Create user credits record
      const nextRefreshDate = new Date();
      nextRefreshDate.setMonth(nextRefreshDate.getMonth() + 1);
      
      await db
        .insert(userCreditsTable)
        .values({
          user_id: newUser[0].id,
          plan_id: defaultPlan.id,
          current_balance: creditsToAdd,
          total_allocated: creditsToAdd,
          last_refresh_date: new Date(),
          next_refresh_date: nextRefreshDate,
          created_at: new Date(),
          updated_at: new Date(),
        });
      
      // Create credit transaction record
      await db
        .insert(creditTransactionsTable)
        .values({
          user_id: newUser[0].id,
          type: 'allocation',
          amount: creditsToAdd,
          description: 'Initial credit allocation',
          balance_before: 0,
          balance_after: creditsToAdd,
          created_at: new Date(),
        });
      
      console.log(`✅ Added ${creditsToAdd} credits to new user ${email}`);
      return;
    }
    
    const userId = user[0].id;
    console.log(`✅ Found user: ${userId}`);
    
    // Check if user credits record exists
    const userCredits = await db
      .select()
      .from(userCreditsTable)
      .where(eq(userCreditsTable.user_id, userId))
      .limit(1);
    
    if (userCredits.length === 0) {
      console.log('📝 Creating user credits record...');
      
      // Get a default plan
      const plans = await db.select().from(plansTable).limit(1);
      const defaultPlan = plans[0];
      
      if (!defaultPlan) {
        console.log('❌ No plans found in database. Please seed plans first.');
        return;
      }
      
      const nextRefreshDate = new Date();
      nextRefreshDate.setMonth(nextRefreshDate.getMonth() + 1);
      
      await db
        .insert(userCreditsTable)
        .values({
          user_id: userId,
          plan_id: defaultPlan.id,
          current_balance: creditsToAdd,
          total_allocated: creditsToAdd,
          last_refresh_date: new Date(),
          next_refresh_date: nextRefreshDate,
          created_at: new Date(),
          updated_at: new Date(),
        });
      
      // Create credit transaction record
      await db
        .insert(creditTransactionsTable)
        .values({
          user_id: userId,
          type: 'allocation',
          amount: creditsToAdd,
          description: 'Initial credit allocation',
          balance_before: 0,
          balance_after: creditsToAdd,
          created_at: new Date(),
        });
      
      console.log(`✅ Added ${creditsToAdd} credits to user ${email}`);
    } else {
      // Update existing credits
      const currentBalance = userCredits[0].current_balance;
      const newBalance = currentBalance + creditsToAdd;
      
      console.log(`💰 Current balance: ${currentBalance} credits`);
      console.log(`➕ Adding: ${creditsToAdd} credits`);
      console.log(`💰 New balance: ${newBalance} credits`);
      
      // Update user credits
      await db
        .update(userCreditsTable)
        .set({
          current_balance: newBalance,
          total_allocated: userCredits[0].total_allocated + creditsToAdd,
          updated_at: new Date(),
        })
        .where(eq(userCreditsTable.user_id, userId));
      
      // Create credit transaction record
      await db
        .insert(creditTransactionsTable)
        .values({
          user_id: userId,
          type: 'bonus',
          amount: creditsToAdd,
          description: 'Manual credit addition',
          balance_before: currentBalance,
          balance_after: newBalance,
          created_at: new Date(),
        });
      
      console.log(`✅ Successfully added ${creditsToAdd} credits to user ${email}`);
      console.log(`💰 New total balance: ${newBalance} credits`);
    }
    
    // Verify the update
    const updatedCredits = await db
      .select()
      .from(userCreditsTable)
      .where(eq(userCreditsTable.user_id, userId))
      .limit(1);
    
    if (updatedCredits.length > 0) {
      console.log(`🔍 Verification - Current balance: ${updatedCredits[0].current_balance} credits`);
    }
    
  } catch (error) {
    console.error('❌ Error adding user credits:', error);
  }
}

// Run the script
addUserCredits()
  .then(() => {
    console.log('🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
