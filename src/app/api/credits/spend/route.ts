import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userCreditsTable, creditTransactionsTable, plansTable } from '@/db/schema';
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
    const { action, description, metadata } = body;

    // Validate action type
    const validActions = ['idea', 'script', 'audio', 'image', 'video', 'thumbnail', 'metadata'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action type' },
        { status: 400 }
      );
    }

    // Get user's current credits and plan
    const userCredits = await db
      .select({
        id: userCreditsTable.id,
        currentBalance: userCreditsTable.current_balance,
        planId: userCreditsTable.plan_id,
        ideaCost: plansTable.idea_cost,
        scriptCost: plansTable.script_cost,
        audioCost: plansTable.audio_cost,
        imageCost: plansTable.image_cost,
        videoCost: plansTable.video_cost,
        thumbnailCost: plansTable.thumbnail_cost,
        metadataCost: plansTable.metadata_cost,
        planName: plansTable.name,
      })
      .from(userCreditsTable)
      .leftJoin(plansTable, eq(userCreditsTable.plan_id, plansTable.id))
      .where(eq(userCreditsTable.user_id, user.id))
      .limit(1);

    if (userCredits.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found' },
        { status: 404 }
      );
    }

    const creditData = userCredits[0];

    // Determine credit cost based on action and plan
    let creditCost = 0;
    switch (action) {
      case 'idea':
        creditCost = creditData.ideaCost || 1;
        break;
      case 'script':
        creditCost = creditData.scriptCost || 2;
        break;
      case 'audio':
        creditCost = creditData.audioCost || 2;
        break;
      case 'image':
        creditCost = creditData.imageCost || 5;
        break;
      case 'video':
        creditCost = creditData.videoCost || 5;
        break;
      case 'thumbnail':
        creditCost = creditData.thumbnailCost || 2;
        break;
      case 'metadata':
        creditCost = creditData.metadataCost || 2;
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action type' },
          { status: 400 }
        );
    }

    // Check if user has enough credits
    if (creditData.currentBalance < creditCost) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient credits',
          details: {
            required: creditCost,
            available: creditData.currentBalance,
            shortfall: creditCost - creditData.currentBalance,
          }
        },
        { status: 402 } // Payment Required
      );
    }

    const newBalance = creditData.currentBalance - creditCost;

    // Update user's credit balance
    await db
      .update(userCreditsTable)
      .set({
        current_balance: newBalance,
        updated_at: new Date(),
      })
      .where(eq(userCreditsTable.user_id, user.id));

    // Log the transaction
    const transaction = await db
      .insert(creditTransactionsTable)
      .values({
        user_id: user.id,
        type: 'usage',
        amount: -creditCost, // Negative for spending
        action_type: action,
        description: description || `Credits spent for ${action} generation`,
        balance_before: creditData.currentBalance,
        balance_after: newBalance,
      })
      .returning();

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction[0].id,
        action,
        creditCost,
        balanceBefore: creditData.currentBalance,
        balanceAfter: newBalance,
        description: transaction[0].description,
      },
      credits: {
        remaining: newBalance,
        spent: creditCost,
      },
      message: `Successfully spent ${creditCost} credits for ${action}`,
    });

  } catch (error) {
    console.error('Error spending credits:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to spend credits' },
      { status: 500 }
    );
  }
}

// Check if user can afford an action
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
    const action = searchParams.get('action');

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Missing action parameter' },
        { status: 400 }
      );
    }

    // Get user's current credits and plan
    const userCredits = await db
      .select({
        currentBalance: userCreditsTable.current_balance,
        planId: userCreditsTable.plan_id,
        ideaCost: plansTable.idea_cost,
        scriptCost: plansTable.script_cost,
        audioCost: plansTable.audio_cost,
        imageCost: plansTable.image_cost,
        videoCost: plansTable.video_cost,
        thumbnailCost: plansTable.thumbnail_cost,
        metadataCost: plansTable.metadata_cost,
        planName: plansTable.name,
      })
      .from(userCreditsTable)
      .leftJoin(plansTable, eq(userCreditsTable.plan_id, plansTable.id))
      .where(eq(userCreditsTable.user_id, user.id))
      .limit(1);

    if (userCredits.length === 0) {
      return NextResponse.json({
        success: true,
        canAfford: false,
        error: 'No active subscription found',
      });
    }

    const creditData = userCredits[0];

    // Get all credit costs for the response
    const creditCosts = {
      idea: creditData.ideaCost || 1,
      script: creditData.scriptCost || 2,
      audio: creditData.audioCost || 2,
      image: creditData.imageCost || 5,
      video: creditData.videoCost || 5,
      thumbnail: creditData.thumbnailCost || 2,
      metadata: creditData.metadataCost || 2,
    };

    // Determine cost for the specific action
    let actionCost = 0;
    if (action in creditCosts) {
      actionCost = creditCosts[action as keyof typeof creditCosts];
    }

    const canAfford = creditData.currentBalance >= actionCost;

    return NextResponse.json({
      success: true,
      canAfford,
      credits: {
        current: creditData.currentBalance,
        required: actionCost,
        remaining: canAfford ? creditData.currentBalance - actionCost : 0,
      },
      plan: {
        id: creditData.planId,
        name: creditData.planName,
        costs: creditCosts,
      },
    });

  } catch (error) {
    console.error('Error checking credit affordability:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check credits' },
      { status: 500 }
    );
  }
}
