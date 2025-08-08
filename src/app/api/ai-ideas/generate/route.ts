import { NextRequest, NextResponse } from 'next/server';
import { generateAIContentIdeas, VideoAnalysis } from '@/utils/openai/index';
import { db } from '@/db';
import { userCreditsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

// Cost per AI idea generation (in credits)
const AI_GENERATION_COST = 5;

async function getUserCredits(userId: string): Promise<number> {
  const credits = await db
    .select()
    .from(userCreditsTable)
    .where(eq(userCreditsTable.user_id, userId))
    .limit(1);
  
  return credits[0]?.current_balance || 0;
}

async function deductCredits(userId: string, amount: number): Promise<void> {
  const currentCredits = await getUserCredits(userId);
  await db
    .update(userCreditsTable)
    .set({
      current_balance: currentCredits - amount,
      updated_at: new Date()
    })
    .where(eq(userCreditsTable.user_id, userId));
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check user credits
    const userCredits = await getUserCredits(user.id);
    if (userCredits < AI_GENERATION_COST) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits',
          required: AI_GENERATION_COST,
          available: userCredits
        },
        { status: 402 }
      );
    }

    const body = await request.json();
    const { videos, userNiche, maxIdeas = 5 } = body;

    // Validate input
    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json(
        { error: 'Videos array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (maxIdeas < 1 || maxIdeas > 10) {
      return NextResponse.json(
        { error: 'maxIdeas must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Transform videos to VideoAnalysis format
    const videoAnalyses: VideoAnalysis[] = videos.map((video: any) => ({
      title: video.title || '',
      description: video.description || '',
      category: video.category || 'General',
      viewCount: parseInt(video.viewCount) || 0,
      likeCount: parseInt(video.likeCount) || 0,
      commentCount: parseInt(video.commentCount) || 0,
      tags: video.tags || []
    }));

    // Generate AI ideas
    const aiIdeas = await generateAIContentIdeas(
      videoAnalyses,
      userNiche,
      maxIdeas
    );

    // Deduct credits after successful generation
    await deductCredits(user.id, AI_GENERATION_COST);

    // Get updated credit balance
    const updatedCredits = await getUserCredits(user.id);

    return NextResponse.json({
      ideas: aiIdeas,
      creditsUsed: AI_GENERATION_COST,
      remainingCredits: updatedCredits,
      generatedAt: new Date().toISOString(),
      totalIdeas: aiIdeas.length
    });

  } catch (error) {
    console.error('AI idea generation error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('OpenAI API key not configured')) {
        return NextResponse.json(
          { error: 'AI service temporarily unavailable' },
          { status: 503 }
        );
      }
      
      if (error.message.includes('Failed to generate AI content ideas')) {
        return NextResponse.json(
          { error: 'AI generation failed. Please try again.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/ai-ideas/generate',
    method: 'POST',
    description: 'Generate AI-powered content ideas from trending videos',
    cost: `${AI_GENERATION_COST} credits per generation`,
    parameters: {
      videos: 'Array of video objects with title, description, viewCount, etc.',
      userNiche: 'Optional: User\'s content niche for personalized ideas',
      maxIdeas: 'Optional: Number of ideas to generate (1-10, default: 5)'
    }
  });
}
