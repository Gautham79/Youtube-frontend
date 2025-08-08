import { db } from '../src/db';
import { usersTable, userCreditsTable, creditTransactionsTable } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function verifyUserCredits() {
  const email = 'gautham.mallik@gmail.com';
  
  try {
    console.log(`🔍 Verifying credits for user: ${email}`);
    
    // Find the user by email
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    
    if (user.length === 0) {
      console.log(`❌ User with email ${email} not found.`);
      return;
    }
    
    const userId = user[0].id;
    console.log(`✅ Found user: ${userId}`);
    console.log(`📧 Email: ${user[0].email}`);
    console.log(`👤 Name: ${user[0].name}`);
    
    // Get user credits
    const userCredits = await db
      .select()
      .from(userCreditsTable)
      .where(eq(userCreditsTable.user_id, userId))
      .limit(1);
    
    if (userCredits.length === 0) {
      console.log('❌ No credits record found for this user.');
      return;
    }
    
    console.log('\n💰 CREDIT INFORMATION:');
    console.log(`Current Balance: ${userCredits[0].current_balance} credits`);
    console.log(`Total Allocated: ${userCredits[0].total_allocated} credits`);
    console.log(`Plan ID: ${userCredits[0].plan_id}`);
    console.log(`Last Refresh: ${userCredits[0].last_refresh_date}`);
    console.log(`Next Refresh: ${userCredits[0].next_refresh_date}`);
    
    // Get recent credit transactions
    const transactions = await db
      .select()
      .from(creditTransactionsTable)
      .where(eq(creditTransactionsTable.user_id, userId))
      .orderBy(creditTransactionsTable.created_at)
      .limit(10);
    
    console.log('\n📊 RECENT TRANSACTIONS:');
    if (transactions.length === 0) {
      console.log('No transactions found.');
    } else {
      transactions.forEach((transaction, index) => {
        console.log(`${index + 1}. ${transaction.type.toUpperCase()}: ${transaction.amount > 0 ? '+' : ''}${transaction.amount} credits`);
        console.log(`   Description: ${transaction.description}`);
        console.log(`   Balance: ${transaction.balance_before} → ${transaction.balance_after}`);
        console.log(`   Date: ${transaction.created_at}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error verifying user credits:', error);
  }
}

// Run the script
verifyUserCredits()
  .then(() => {
    console.log('🎉 Verification completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  });
