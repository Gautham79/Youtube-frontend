import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { trendingTopicsTable } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';

// YouTube Data API configuration
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

async function fetchYouTubeTrending(categoryId: number, regionCode: string, maxResults: number = 20) {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key not configured. Please add YOUTUBE_API_KEY to your environment variables.');
  }

  const url = `${YOUTUBE_API_BASE_URL}/videos?part=snippet,statistics&chart=mostPopular&videoCategoryId=${categoryId}&regionCode=${regionCode}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`YouTube API error: ${response.status} ${response.statusText}. ${errorText}`);
  }
  
  const data = await response.json();
  return data.items || [];
}

async function getCachedTrendingTopics(categoryId: number, regionCode: string) {
  const cached = await db
    .select()
    .from(trendingTopicsTable)
    .where(
      and(
        eq(trendingTopicsTable.category_id, categoryId),
        eq(trendingTopicsTable.region_code, regionCode),
        gt(trendingTopicsTable.expires_at, new Date())
      )
    )
    .orderBy(trendingTopicsTable.cached_at);
  
  return cached;
}

async function cacheTrendingTopics(categoryId: number, regionCode: string, videos: any[]) {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 30); // Cache for 30 minutes
  
  // Clear old cache for this category and region
  await db
    .delete(trendingTopicsTable)
    .where(
      and(
        eq(trendingTopicsTable.category_id, categoryId),
        eq(trendingTopicsTable.region_code, regionCode)
      )
    );
  
  // Insert new data
  for (const video of videos) {
    await db
      .insert(trendingTopicsTable)
      .values({
        category_id: categoryId,
        region_code: regionCode,
        video_id: video.id,
        title: video.snippet.title,
        description: video.snippet.description || '',
        channel_title: video.snippet.channelTitle,
        view_count: video.statistics?.viewCount || '0',
        like_count: video.statistics?.likeCount || '0',
        comment_count: video.statistics?.commentCount || '0',
        published_at: new Date(video.snippet.publishedAt),
        thumbnail_url: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
        tags: JSON.stringify(video.snippet.tags || []),
        expires_at: expiresAt
      });
  }
}

function calculateEngagementScore(engagement: { views: number; likes: number; comments: number }): number {
  const { views, likes, comments } = engagement;
  
  // Avoid division by zero
  if (views === 0) return 0;
  
  // Calculate engagement rate (likes + comments) / views
  const engagementRate = (likes + comments) / views;
  
  // Weight the score by total views (log scale to prevent huge videos from dominating)
  const viewScore = Math.log10(views + 1);
  
  // Combine engagement rate with view score
  return engagementRate * 1000 + viewScore;
}

function generateContentIdeas(video: any): string[] {
  const title = video.title.toLowerCase();
  const ideas = [];
  
  // Generate variations based on the original title
  ideas.push(`How to ${title.replace(/how to /gi, '')}`);
  ideas.push(`${title} - Beginner's Guide`);
  ideas.push(`Top 10 Tips for ${title.replace(/top \d+ /gi, '')}`);
  ideas.push(`${title} Explained in 5 Minutes`);
  ideas.push(`My Take on ${title}`);
  
  // Add category-specific ideas
  if (title.includes('review')) {
    ideas.push(title.replace('review', 'vs Comparison'));
    ideas.push(title.replace('review', 'Unboxing'));
  }
  
  if (title.includes('tutorial')) {
    ideas.push(title.replace('tutorial', 'Mistakes to Avoid'));
    ideas.push(title.replace('tutorial', 'Advanced Tips'));
  }
  
  // Add more creative variations
  ideas.push(`${video.title} - What They Don't Tell You`);
  ideas.push(`The Truth About ${video.title}`);
  ideas.push(`${video.title} - Complete Breakdown`);
  
  return ideas.slice(0, 5); // Return top 5 ideas
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category');
    const regionCode = searchParams.get('region') || 'US';
    const maxResults = parseInt(searchParams.get('maxResults') || '20');
    
    // Validate parameters
    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }
    
    const categoryIdNum = parseInt(categoryId);
    if (isNaN(categoryIdNum)) {
      return NextResponse.json(
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }
    
    if (!/^[A-Z]{2}$/.test(regionCode)) {
      return NextResponse.json(
        { error: 'Invalid region code' },
        { status: 400 }
      );
    }
    
    if (maxResults < 1 || maxResults > 50) {
      return NextResponse.json(
        { error: 'maxResults must be between 1 and 50' },
        { status: 400 }
      );
    }
    
    // Check cache first
    let trendingTopics = await getCachedTrendingTopics(categoryIdNum, regionCode);
    
    if (trendingTopics.length === 0) {
      // Fetch from YouTube API if not cached
      try {
        const youtubeVideos = await fetchYouTubeTrending(categoryIdNum, regionCode, maxResults);
        
        if (youtubeVideos.length === 0) {
          return NextResponse.json({
            topics: [],
            source: 'youtube_api',
            region: regionCode,
            category: categoryIdNum,
            message: 'No trending videos found for this category and region'
          });
        }
        
        // Cache the results
        await cacheTrendingTopics(categoryIdNum, regionCode, youtubeVideos);
        
        // Get the cached data
        trendingTopics = await getCachedTrendingTopics(categoryIdNum, regionCode);
      } catch (error) {
        console.error('YouTube API error:', error);
        
        // Return error if API fails
        return NextResponse.json(
          { 
            error: 'Failed to fetch trending topics from YouTube API',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 503 }
        );
      }
    }
    
    // Transform data for frontend
    const transformedTopics = trendingTopics.map(topic => ({
      id: topic.video_id,
      title: topic.title,
      description: topic.description,
      channel: topic.channel_title,
      viewCount: topic.view_count,
      likeCount: topic.like_count,
      commentCount: topic.comment_count,
      publishedAt: topic.published_at,
      thumbnailUrl: topic.thumbnail_url,
      tags: topic.tags ? JSON.parse(topic.tags) : [],
      youtubeUrl: `https://www.youtube.com/watch?v=${topic.video_id}`,
      contentIdeas: generateContentIdeas(topic),
      engagement: {
        views: parseInt(topic.view_count || '0'),
        likes: parseInt(topic.like_count || '0'),
        comments: parseInt(topic.comment_count || '0')
      },
      // Add engagement score for sorting
      engagementScore: calculateEngagementScore({
        views: parseInt(topic.view_count || '0'),
        likes: parseInt(topic.like_count || '0'),
        comments: parseInt(topic.comment_count || '0')
      })
    }));

    // Sort by engagement score (highest first)
    transformedTopics.sort((a, b) => b.engagementScore - a.engagementScore);
    
    return NextResponse.json({
      topics: transformedTopics,
      source: 'youtube_api',
      region: regionCode,
      category: categoryIdNum,
      cached_at: trendingTopics[0]?.cached_at,
      total: transformedTopics.length,
      aiEnhancementAvailable: !!process.env.OPENAI_API_KEY,
      message: transformedTopics.length > 0 
        ? `Found ${transformedTopics.length} trending videos. Use AI enhancement for better content ideas!`
        : 'No trending videos found for this category and region'
    });
    
  } catch (error) {
    console.error('Trending topics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending topics' },
      { status: 500 }
    );
  }
}
