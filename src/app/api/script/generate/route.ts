import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateScript, ScriptGenerationParams } from '@/utils/openai/index';
import { db } from '@/db';
import { userCreditsTable, creditTransactionsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

const SCRIPT_GENERATION_COST = 10; // Credits required for script generation

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { idea, videoLength, videoStyle, targetAudience, title, characterConsistency } = body;

    if (!idea || !idea.trim()) {
      return NextResponse.json({ error: 'Video idea is required' }, { status: 400 });
    }

    // Check user credits
    const userCredits = await db
      .select()
      .from(userCreditsTable)
      .where(eq(userCreditsTable.user_id, user.id))
      .limit(1);
    
    if (!userCredits.length) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    const currentCredits = userCredits[0].current_balance || 0;

    if (currentCredits < SCRIPT_GENERATION_COST) {
      return NextResponse.json({
        error: 'Insufficient credits',
        required: SCRIPT_GENERATION_COST,
        available: currentCredits
      }, { status: 402 });
    }

    // Prepare script generation parameters
    const scriptParams: ScriptGenerationParams = {
      idea,
      videoLength,
      videoStyle,
      targetAudience,
      title,
      characterConsistency
    };

    // Generate script using the new organized AI service
    const scriptData = await generateScript(scriptParams);

    // Deduct credits and log transaction
    const newCredits = currentCredits - SCRIPT_GENERATION_COST;
    
    // Update user credits
    await db
      .update(userCreditsTable)
      .set({ 
        current_balance: newCredits,
        updated_at: new Date()
      })
      .where(eq(userCreditsTable.user_id, user.id));

    // Log the credit transaction
    await db.insert(creditTransactionsTable).values({
      user_id: user.id,
      type: 'usage',
      amount: -SCRIPT_GENERATION_COST,
      action_type: 'script',
      description: `Script generation: ${scriptData.title}`,
      balance_before: currentCredits,
      balance_after: newCredits,
    });

    // Log the generation for analytics (optional)
    console.log(`Script generated for user ${user.id}: ${scriptData.title}`);

    return NextResponse.json({
      script: scriptData,
      remainingCredits: newCredits,
      creditsUsed: SCRIPT_GENERATION_COST
    });

  } catch (error) {
    console.error('Script generation error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('OpenAI API key not configured')) {
        return NextResponse.json(
          { error: 'AI service temporarily unavailable' },
          { status: 503 }
        );
      }
      
      if (error.message.includes('Invalid response format') || 
          error.message.includes('Invalid script structure')) {
        return NextResponse.json(
          { error: 'AI generation failed. Please try again.' },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to generate script. Please try again.' },
      { status: 500 }
    );
  }
}
