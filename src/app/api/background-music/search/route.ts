import { NextRequest, NextResponse } from 'next/server';
import { getLocalMusicLibrary } from '@/utils/local-music-library';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mood, genre, instrument, duration, attribution, maxResults = 10 } = body;

    console.log('🔍 [API] Local music search request:', {
      mood,
      genre,
      instrument,
      duration,
      maxResults
    });

    const localMusicLibrary = getLocalMusicLibrary();

    // Search for background music using local library
    const results = await localMusicLibrary.searchMusic({
      mood,
      genre,
      instrument,
      duration,
      attribution,
      maxResults: Math.min(maxResults, 50) // Limit to 50 results max
    });

    console.log(`✅ [API] Found ${results.length} local music tracks`);

    return NextResponse.json({
      success: true,
      tracks: results,
      count: results.length
    });

  } catch (error) {
    console.error('❌ [API] Local music search failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to search local music library',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const localMusicLibrary = getLocalMusicLibrary();
    
    // Return available moods, genres, and instruments for the frontend
    const categories = await localMusicLibrary.getCategories();

    return NextResponse.json({
      success: true,
      moods: categories.moods,
      genres: categories.genres,
      instruments: categories.instruments
    });

  } catch (error) {
    console.error('❌ [API] Failed to get local music metadata:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get local music metadata',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
