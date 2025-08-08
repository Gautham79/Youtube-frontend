import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/utils/openai/client';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { userCreditsTable, creditTransactionsTable, plansTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, voice = 'alloy', speed = 1.0, format = 'mp3' } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Validate voice parameter
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    if (!validVoices.includes(voice)) {
      return NextResponse.json({ error: 'Invalid voice selection' }, { status: 400 });
    }

    // Validate speed parameter
    if (speed < 0.25 || speed > 4.0) {
      return NextResponse.json({ error: 'Speed must be between 0.25 and 4.0' }, { status: 400 });
    }

    // Validate format parameter
    const validFormats = ['mp3', 'opus', 'aac', 'flac', 'wav'];
    if (!validFormats.includes(format)) {
      return NextResponse.json({ error: 'Invalid audio format' }, { status: 400 });
    }

    // Get user's current credits and plan
    const userCredits = await db
      .select({
        id: userCreditsTable.id,
        currentBalance: userCreditsTable.current_balance,
        planId: userCreditsTable.plan_id,
        audioCost: plansTable.audio_cost,
        planName: plansTable.name,
      })
      .from(userCreditsTable)
      .leftJoin(plansTable, eq(userCreditsTable.plan_id, plansTable.id))
      .where(eq(userCreditsTable.user_id, user.id))
      .limit(1);

    if (userCredits.length === 0) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    const creditData = userCredits[0];
    const requiredCredits = creditData.audioCost || 3; // Default to 3 credits if not set

    if (creditData.currentBalance < requiredCredits) {
      return NextResponse.json({
        error: 'Insufficient credits',
        required: requiredCredits,
        available: creditData.currentBalance
      }, { status: 402 });
    }

    // Generate audio using OpenAI TTS
    const openai = getOpenAIClient();
    
    console.log('🎵 Generating audio with OpenAI TTS:', {
      textLength: text.length,
      voice,
      speed,
      format,
      userId: user.id,
      requiredCredits
    });

    const audioResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as any,
      input: text,
      speed: speed,
      response_format: format as any,
    });

    // Convert the response to a buffer
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

    // Calculate audio duration (rough estimate: ~150 words per minute)
    const wordCount = text.split(/\s+/).length;
    const estimatedDurationSeconds = Math.ceil((wordCount / 150) * 60 / speed);

    const newBalance = creditData.currentBalance - requiredCredits;

    // Update user's credit balance
    await db
      .update(userCreditsTable)
      .set({
        current_balance: newBalance,
        updated_at: new Date(),
      })
      .where(eq(userCreditsTable.user_id, user.id));

    // Log the transaction
    await db
      .insert(creditTransactionsTable)
      .values({
        user_id: user.id,
        type: 'usage',
        amount: -requiredCredits, // Negative for spending
        action_type: 'audio',
        description: `Audio generation using ${voice} voice`,
        balance_before: creditData.currentBalance,
        balance_after: newBalance,
      });

    console.log('✅ Audio generated successfully:', {
      audioSize: audioBuffer.length,
      estimatedDuration: estimatedDurationSeconds,
      remainingCredits: newBalance,
      voice,
      speed
    });

    // Return the audio file as a response
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': format === 'mp3' ? 'audio/mpeg' : `audio/${format}`,
        'Content-Disposition': `attachment; filename="scene_audio.${format}"`,
        'X-Audio-Duration': estimatedDurationSeconds.toString(),
        'X-Remaining-Credits': newBalance.toString(),
        'X-Generated-At': new Date().toISOString(),
        'X-Voice-Used': voice,
        'X-Speed-Used': speed.toString(),
      },
    });

  } catch (error) {
    console.error('Audio generation error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('OpenAI API key not configured')) {
        return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
      }
      
      if (error.message.includes('insufficient_quota')) {
        return NextResponse.json({ error: 'OpenAI API quota exceeded' }, { status: 429 });
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to generate audio. Please try again.' },
      { status: 500 }
    );
  }
}
