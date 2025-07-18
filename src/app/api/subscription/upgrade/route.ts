import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userCreditsTable, creditTransactionsTable, plansTable, subscriptionsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

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
    const { newPlanId, subscriptionId } = body;

    if (!newPlanId) {
      return NextResponse.json(
        { success: false, error: 'Missing new plan ID' },
        { status: 400 }
      );
    }

    // Get the new plan details
    const newPlan = await db
      .select()
      .from(plansTable)
      .where(eq(plansTable.id, newPlanId))
      .limit(1);

    if (newPlan.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    const newPlanData = newPlan[0];

    // Get current user credits
    const currentCredits = await db
      .select()
      .from(userCreditsTable)
      .where(eq(userCreditsTable.user_id, user.id))
      .limit(1);

    let remainingCredits = 0;
    let currentPlanId = null;

    if (currentCredits.length > 0) {
      remainingCredits = currentCredits[0].current_balance;
      currentPlanId = currentCredits[0].plan_id;
    }

    // Calculate new credit allocation
    const newCreditsToAdd = newPlanData.monthly_credits;
    const totalCreditsAfterUpgrade = remainingCredits + newCreditsToAdd;

    // Calculate new billing dates
    const now = new Date();
    const nextRefreshDate = new Date(now);
    
    if (newPlanData.interval === 'month') {
      nextRefreshDate.setMonth(nextRefreshDate.getMonth() + 1);
    } else if (newPlanData.interval === 'year') {
      nextRefreshDate.setFullYear(nextRefreshDate.getFullYear() + 1);
    }

    // Update user credits with carryover
    const creditResult = await db
      .insert(userCreditsTable)
      .values({
        user_id: user.id,
        plan_id: newPlanId,
        current_balance: totalCreditsAfterUpgrade,
        total_allocated: (currentCredits[0]?.total_allocated || 0) + newCreditsToAdd,
        last_refresh_date: now,
        next_refresh_date: nextRefreshDate,
      })
      .onConflictDoUpdate({
        target: userCreditsTable.user_id,
        set: {
          plan_id: newPlanId,
          current_balance: totalCreditsAfterUpgrade,
          total_allocated: (currentCredits[0]?.total_allocated || 0) + newCreditsToAdd,
          last_refresh_date: now,
          next_refresh_date: nextRefreshDate,
          updated_at: now,
        },
      })
      .returning();

    // Log credit carryover transaction if there were remaining credits
    if (remainingCredits > 0) {
      await db.insert(creditTransactionsTable).values({
        user_id: user.id,
        type: 'carryover',
        amount: remainingCredits,
        description: `Credits carried over from plan upgrade to ${newPlanData.name}`,
        balance_before: 0,
        balance_after: remainingCredits,
      });
    }

    // Log new credit allocation transaction
    await db.insert(creditTransactionsTable).values({
      user_id: user.id,
      type: 'allocation',
      amount: newCreditsToAdd,
      description: `Credits allocated from ${newPlanData.name} plan upgrade`,
      balance_before: remainingCredits,
      balance_after: totalCreditsAfterUpgrade,
    });

    // Update subscription if subscriptionId is provided
    if (subscriptionId) {
      await db
        .update(subscriptionsTable)
        .set({
          plan_id: newPlanId,
          current_period_start: now,
          current_period_end: nextRefreshDate,
          updated_at: now,
        })
        .where(eq(subscriptionsTable.id, subscriptionId));
    }

    return NextResponse.json({
      success: true,
      upgrade: {
        newPlan: {
          id: newPlanData.id,
          name: newPlanData.name,
          monthlyCredits: newPlanData.monthly_credits,
          exportQuality: newPlanData.export_quality,
        },
        credits: {
          previousBalance: remainingCredits,
          newCreditsAdded: newCreditsToAdd,
          totalBalance: totalCreditsAfterUpgrade,
          nextRefreshDate: nextRefreshDate,
        },
        billing: {
          newBillingDate: now,
          nextBillingDate: nextRefreshDate,
        },
      },
      message: `Successfully upgraded to ${newPlanData.name}. ${remainingCredits > 0 ? `${remainingCredits} credits carried over + ` : ''}${newCreditsToAdd} new credits added.`,
    });

  } catch (error) {
    console.error('Error upgrading subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upgrade subscription' },
      { status: 500 }
    );
  }
}

// Get upgrade preview (shows what will happen during upgrade)
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
    const newPlanId = searchParams.get('planId');

    if (!newPlanId) {
      return NextResponse.json(
        { success: false, error: 'Missing plan ID' },
        { status: 400 }
      );
    }

    // Get the new plan details
    const newPlan = await db
      .select()
      .from(plansTable)
      .where(eq(plansTable.id, newPlanId))
      .limit(1);

    if (newPlan.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    const newPlanData = newPlan[0];

    // Get current user credits
    const currentCredits = await db
      .select({
        currentBalance: userCreditsTable.current_balance,
        planId: userCreditsTable.plan_id,
        planName: plansTable.name,
        currentMonthlyCredits: plansTable.monthly_credits,
      })
      .from(userCreditsTable)
      .leftJoin(plansTable, eq(userCreditsTable.plan_id, plansTable.id))
      .where(eq(userCreditsTable.user_id, user.id))
      .limit(1);

    let remainingCredits = 0;
    let currentPlan = null;

    if (currentCredits.length > 0) {
      remainingCredits = currentCredits[0].currentBalance;
      currentPlan = {
        id: currentCredits[0].planId,
        name: currentCredits[0].planName,
        monthlyCredits: currentCredits[0].currentMonthlyCredits,
      };
    }

    const newCreditsToAdd = newPlanData.monthly_credits;
    const totalCreditsAfterUpgrade = remainingCredits + newCreditsToAdd;

    return NextResponse.json({
      success: true,
      preview: {
        currentPlan,
        newPlan: {
          id: newPlanData.id,
          name: newPlanData.name,
          monthlyCredits: newPlanData.monthly_credits,
          exportQuality: newPlanData.export_quality,
          priceUSD: parseFloat(newPlanData.price_usd),
          priceINR: parseFloat(newPlanData.price_inr),
        },
        credits: {
          currentBalance: remainingCredits,
          newCreditsToAdd: newCreditsToAdd,
          totalAfterUpgrade: totalCreditsAfterUpgrade,
          carryOverAmount: remainingCredits,
        },
        billing: {
          newBillingDate: new Date(),
          billingCycleReset: true,
        },
      },
    });

  } catch (error) {
    console.error('Error getting upgrade preview:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get upgrade preview' },
      { status: 500 }
    );
  }
}
