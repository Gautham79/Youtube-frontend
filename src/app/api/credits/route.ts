import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userCreditsTable, creditTransactionsTable, plansTable } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

// Get user's current credit balance and transaction history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('history') === 'true';

    // Get user's current credit balance
    const userCredits = await db
      .select({
        id: userCreditsTable.id,
        userId: userCreditsTable.user_id,
        planId: userCreditsTable.plan_id,
        currentBalance: userCreditsTable.current_balance,
        totalAllocated: userCreditsTable.total_allocated,
        lastRefreshDate: userCreditsTable.last_refresh_date,
        nextRefreshDate: userCreditsTable.next_refresh_date,
        planName: plansTable.name,
        monthlyCredits: plansTable.monthly_credits,
        exportQuality: plansTable.export_quality,
      })
      .from(userCreditsTable)
      .leftJoin(plansTable, eq(userCreditsTable.plan_id, plansTable.id))
      .where(eq(userCreditsTable.user_id, user.id))
      .limit(1);

    if (userCredits.length === 0) {
      return NextResponse.json({
        success: true,
        credits: null,
        message: 'No active subscription found',
      });
    }

    const creditData = userCredits[0];
    let transactions: any[] = [];

    // Get transaction history if requested
    if (includeHistory) {
      transactions = await db
        .select()
        .from(creditTransactionsTable)
        .where(eq(creditTransactionsTable.user_id, user.id))
        .orderBy(desc(creditTransactionsTable.created_at))
        .limit(50);
    }

    return NextResponse.json({
      success: true,
      credits: {
        currentBalance: creditData.currentBalance,
        totalAllocated: creditData.totalAllocated,
        lastRefreshDate: creditData.lastRefreshDate,
        nextRefreshDate: creditData.nextRefreshDate,
        plan: {
          id: creditData.planId,
          name: creditData.planName,
          monthlyCredits: creditData.monthlyCredits,
          exportQuality: creditData.exportQuality,
        },
      },
      transactions: includeHistory ? transactions : undefined,
    });

  } catch (error) {
    console.error('Error fetching user credits:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch credits' },
      { status: 500 }
    );
  }
}

// Allocate credits to user (called when subscription is created/upgraded)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { planId, creditsToAdd, description, carryOver = false } = body;

    if (!planId || !creditsToAdd) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get plan details
    const plan = await db
      .select()
      .from(plansTable)
      .where(eq(plansTable.id, planId))
      .limit(1);

    if (plan.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    const planData = plan[0];

    // Calculate next refresh date based on plan interval
    const now = new Date();
    const nextRefreshDate = new Date(now);
    if (planData.interval === 'month') {
      nextRefreshDate.setMonth(nextRefreshDate.getMonth() + 1);
    } else if (planData.interval === 'year') {
      nextRefreshDate.setFullYear(nextRefreshDate.getFullYear() + 1);
    }

    // Get current credit balance
    const existingCredits = await db
      .select()
      .from(userCreditsTable)
      .where(eq(userCreditsTable.user_id, user.id))
      .limit(1);

    let currentBalance = 0;
    let totalAllocated = creditsToAdd;

    if (existingCredits.length > 0) {
      currentBalance = carryOver ? existingCredits[0].current_balance : 0;
      totalAllocated = existingCredits[0].total_allocated + creditsToAdd;
    }

    const newBalance = currentBalance + creditsToAdd;

    // Update or insert user credits
    const creditResult = await db
      .insert(userCreditsTable)
      .values({
        user_id: user.id,
        plan_id: planId,
        current_balance: newBalance,
        total_allocated: totalAllocated,
        last_refresh_date: now,
        next_refresh_date: nextRefreshDate,
      })
      .onConflictDoUpdate({
        target: userCreditsTable.user_id,
        set: {
          plan_id: planId,
          current_balance: newBalance,
          total_allocated: totalAllocated,
          last_refresh_date: now,
          next_refresh_date: nextRefreshDate,
          updated_at: now,
        },
      })
      .returning();

    // Log the transaction
    await db.insert(creditTransactionsTable).values({
      user_id: user.id,
      type: carryOver ? 'carryover' : 'allocation',
      amount: creditsToAdd,
      description: description || `Credits allocated from ${planData.name} plan`,
      balance_before: currentBalance,
      balance_after: newBalance,
    });

    return NextResponse.json({
      success: true,
      credits: creditResult[0],
      message: `Successfully allocated ${creditsToAdd} credits`,
    });

  } catch (error) {
    console.error('Error allocating credits:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to allocate credits' },
      { status: 500 }
    );
  }
}
