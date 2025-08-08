import { NextRequest, NextResponse } from 'next/server';
import { getLocalMusicLibrary } from '@/utils/local-music-library';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, duration, mood } = body;

    console.log('🤖 [API] Music suggestion request:', {
      title,
      description,
      duration,
      mood
    });

    // Validate required fields
    if (!duration || typeof duration !== 'number') {
      return NextResponse.json(
        { error: 'Duration is required and must be a number' },
        { status: 400 }
      );
    }

    const localMusicLibrary = getLocalMusicLibrary();

    // Get music suggestions based on content
    const suggestions = await localMusicLibrary.suggestMusic({
      title,
      description,
      duration,
      mood
    });

    console.log(`✅ [API] Generated ${suggestions.length} music suggestions`);

    return NextResponse.json({
      success: true,
      suggestions,
      count: suggestions.length
    });

  } catch (error) {
    console.error('❌ [API] Music suggestion failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to suggest music',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
