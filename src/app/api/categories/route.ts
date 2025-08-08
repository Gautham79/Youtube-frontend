import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { youtubeCategoriesTable } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';

// YouTube Data API configuration
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Category metadata for UI enhancement
const CATEGORY_METADATA: Record<string, { icon: string; color: string; description: string }> = {
  'Music': { icon: '🎵', color: 'bg-purple-500', description: 'Songs, Albums, Music Videos' },
  'Sports': { icon: '⚽', color: 'bg-green-500', description: 'Cricket, Football, Olympics' },
  'Gaming': { icon: '🎮', color: 'bg-indigo-500', description: 'Game Reviews, Esports, Streaming' },
  'Film & Animation': { icon: '🎬', color: 'bg-red-500', description: 'Movies, Trailers, Animation' },
  'Science & Technology': { icon: '💻', color: 'bg-blue-500', description: 'Tech Reviews, Tutorials' },
  'Education': { icon: '📚', color: 'bg-yellow-500', description: 'Tutorials, Courses, Learning' },
  'Entertainment': { icon: '🎭', color: 'bg-pink-500', description: 'Comedy, Shows, Entertainment' },
  'News & Politics': { icon: '📰', color: 'bg-gray-500', description: 'Current Events, Politics' },
  'Howto & Style': { icon: '✨', color: 'bg-teal-500', description: 'DIY, Fashion, Lifestyle' },
  'Travel & Events': { icon: '✈️', color: 'bg-orange-500', description: 'Travel Vlogs, Events' },
  'People & Blogs': { icon: '👥', color: 'bg-cyan-500', description: 'Personal Vlogs, Blogs' },
  'Comedy': { icon: '😂', color: 'bg-amber-500', description: 'Stand-up, Sketches, Funny Videos' },
  'Pets & Animals': { icon: '🐾', color: 'bg-emerald-500', description: 'Pet Care, Animal Videos' },
  'Autos & Vehicles': { icon: '🚗', color: 'bg-slate-500', description: 'Car Reviews, Auto News' }
};

async function fetchYouTubeCategories(regionCode: string) {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key not configured');
  }

  const url = `${YOUTUBE_API_BASE_URL}/videoCategories?part=snippet&regionCode=${regionCode}&key=${YOUTUBE_API_KEY}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.items || [];
}

async function getCachedCategories(regionCode: string) {
  const cached = await db
    .select()
    .from(youtubeCategoriesTable)
    .where(
      and(
        eq(youtubeCategoriesTable.region_code, regionCode),
        gt(youtubeCategoriesTable.expires_at, new Date())
      )
    );
  
  return cached;
}

async function cacheCategories(regionCode: string, categories: any[]) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // Cache for 24 hours
  
  // Clear existing cache for this region first
  await db
    .delete(youtubeCategoriesTable)
    .where(eq(youtubeCategoriesTable.region_code, regionCode));
  
  // Insert new categories
  for (const category of categories) {
    await db
      .insert(youtubeCategoriesTable)
      .values({
        id: parseInt(category.id),
        region_code: regionCode,
        title: category.snippet.title,
        assignable: category.snippet.assignable,
        expires_at: expiresAt
      });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionCode = searchParams.get('region') || 'US';
    
    // Validate region code
    if (!/^[A-Z]{2}$/.test(regionCode)) {
      return NextResponse.json(
        { error: 'Invalid region code. Must be 2-letter country code (e.g., US, IN, GB)' },
        { status: 400 }
      );
    }
    
    // Check cache first
    let categories = await getCachedCategories(regionCode);
    
    if (categories.length === 0) {
      // Fetch from YouTube API if not cached
      try {
        const youtubeCategories = await fetchYouTubeCategories(regionCode);
        
        // Filter only assignable categories
        const assignableCategories = youtubeCategories.filter(
          (cat: any) => cat.snippet.assignable
        );
        
        // Cache the results
        await cacheCategories(regionCode, assignableCategories);
        
        // Get the cached data
        categories = await getCachedCategories(regionCode);
      } catch (error) {
        console.error('YouTube API error:', error);
        
        // Fallback to default categories if API fails
        const defaultCategories = [
          { id: 10, title: 'Music' },
          { id: 17, title: 'Sports' },
          { id: 20, title: 'Gaming' },
          { id: 24, title: 'Entertainment' },
          { id: 28, title: 'Science & Technology' },
          { id: 27, title: 'Education' }
        ];
        
        return NextResponse.json({
          categories: defaultCategories.map(cat => ({
            id: cat.id,
            title: cat.title,
            ...CATEGORY_METADATA[cat.title] || {
              icon: '📺',
              color: 'bg-gray-500',
              description: 'Video content'
            }
          })),
          source: 'fallback',
          region: regionCode
        });
      }
    }
    
    // Enhance categories with metadata
    const enhancedCategories = categories.map(category => ({
      id: category.id,
      title: category.title,
      assignable: category.assignable,
      ...CATEGORY_METADATA[category.title] || {
        icon: '📺',
        color: 'bg-gray-500',
        description: 'Video content'
      }
    }));
    
    return NextResponse.json({
      categories: enhancedCategories,
      source: 'youtube_api',
      region: regionCode,
      cached_at: categories[0]?.cached_at
    });
    
  } catch (error) {
    console.error('Categories API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
