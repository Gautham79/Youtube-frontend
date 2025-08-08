import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { openai } from '@/utils/openai/client';

interface ScriptScene {
  id: number;
  narration: string;
  duration: string;
  imagePrompt: string;
  sceneType: 'intro' | 'explanation' | 'demo' | 'transition' | 'conclusion';
  keyPoints: string[];
  wordCount?: number;
  charactersInScene?: string[];
}

interface GeneratedScript {
  title: string;
  totalDuration: string;
  scenes: ScriptScene[];
  estimatedWords: number;
  targetAudience: string;
  videoStyle: string;
  characters?: Array<{
    name: string;
    age: string;
    appearance: string;
    clothing: string;
    personality?: string;
  }>;
  characterConsistency?: boolean;
}

interface VideoDetails {
  duration: number;
  resolution: string;
  format: string;
  orientation: 'landscape' | 'portrait' | 'square';
  fileSize?: number;
}

interface YouTubeStrategy {
  optimizeFor: 'search' | 'viral' | 'engagement' | 'educational';
  targetAudience: string;
  competitorChannels?: string[];
  trendingTopics?: string[];
}

interface YouTubeMetadata {
  title: string;
  description: string;
  tags: string[] | string;
  category: string;
  thumbnailSuggestions: {
    concept: string;
    elements: string[];
    textOverlay: string;
    colorScheme: string;
  }[];
  youtubeShorts?: {
    hashtags: string[];
    hookTitle: string;
    trendingElements: string[];
  };
  seoAnalysis: {
    primaryKeywords: string[];
    searchVolume: string;
    competition: string;
    optimizationScore: number;
  };
  engagementOptimization: {
    callToAction: string;
    endScreenSuggestions: string[];
    communityPostIdeas: string[];
  };
}

const YOUTUBE_CATEGORIES = {
  'Film & Animation': '1',
  'Autos & Vehicles': '2',
  'Music': '10',
  'Pets & Animals': '15',
  'Sports': '17',
  'Short Movies': '18',
  'Travel & Events': '19',
  'Gaming': '20',
  'Videoblogging': '21',
  'People & Blogs': '22',
  'Comedy': '23',
  'Entertainment': '24',
  'News & Politics': '25',
  'Howto & Style': '26',
  'Education': '27',
  'Science & Technology': '28',
  'Nonprofits & Activism': '29'
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      script, 
      videoDetails, 
      youtubeStrategy = { optimizeFor: 'search', targetAudience: 'general' }
    }: {
      script: GeneratedScript;
      videoDetails: VideoDetails;
      youtubeStrategy?: YouTubeStrategy;
    } = body;

    if (!script || !videoDetails) {
      return NextResponse.json({ 
        error: 'Script and video details are required' 
      }, { status: 400 });
    }

    // Check user credits
    const { data: userCredits } = await supabase
      .from('user_credits')
      .select('current_balance')
      .eq('user_id', user.id)
      .single();

    const metadataCost = 2; // Cost for metadata generation
    if (!userCredits || userCredits.current_balance < metadataCost) {
      return NextResponse.json({
        error: 'Insufficient credits',
        required: metadataCost,
        available: userCredits?.current_balance || 0
      }, { status: 402 });
    }

    // Create comprehensive prompt for YouTube metadata generation
    const youtubeMetadataPrompt = `
You are a YouTube SEO expert generating optimized metadata for a video upload.

PLATFORM: YouTube
PURPOSE: Maximize discoverability, engagement, and algorithm performance on YouTube
VIDEO CONTENT ANALYSIS: Analyze the complete script below to generate YouTube-optimized metadata.

SCRIPT DETAILS:
Title: ${script.title}
Duration: ${script.totalDuration}
Target Audience: ${script.targetAudience}
Video Style: ${script.videoStyle}
Estimated Words: ${script.estimatedWords}
${script.characters ? `Characters: ${script.characters.map(c => c.name).join(', ')}` : ''}

VIDEO TECHNICAL DETAILS:
Duration: ${Math.floor(videoDetails.duration / 60)}:${(videoDetails.duration % 60).toString().padStart(2, '0')}
Resolution: ${videoDetails.resolution}
Orientation: ${videoDetails.orientation}
Format: ${videoDetails.format}

SCENES BREAKDOWN:
${script.scenes.map(scene => `
Scene ${scene.id} (${scene.sceneType}):
Narration: ${scene.narration}
Key Points: ${scene.keyPoints.join(', ')}
Duration: ${scene.duration}
`).join('\n')}

OPTIMIZATION STRATEGY: ${youtubeStrategy.optimizeFor}
TARGET AUDIENCE: ${youtubeStrategy.targetAudience}

Generate YouTube-optimized metadata following these requirements:

1. TITLE (max 60 characters):
   - Clickable and compelling for YouTube audience
   - Include primary keyword from script content
   - Create curiosity/urgency appropriate for YouTube
   - Follow YouTube title best practices
   - Consider ${videoDetails.orientation === 'portrait' ? 'YouTube Shorts' : 'regular YouTube'} format

2. DESCRIPTION (max 5000 characters):
   - First 125 characters are crucial for YouTube search
   - Include timestamps for chapters based on scenes
   - Add relevant keywords naturally from script content
   - Include compelling call-to-action for YouTube engagement
   - Add social links placeholder and related video suggestions
   - Use YouTube description formatting best practices

3. TAGS (comma-separated, max 500 characters total):
   - Mix of broad and specific keywords from script
   - Include variations and synonyms
   - Target both YouTube search and suggested videos
   - Use YouTube-specific tag strategies
   - Include trending topics if relevant

4. CATEGORY:
   - Select the most appropriate from: ${Object.keys(YOUTUBE_CATEGORIES).join(', ')}
   - Base selection on script content and video style

5. THUMBNAIL SUGGESTIONS (3 variations):
   - YouTube-optimized concepts (1280x720 for regular, 1080x1920 for Shorts)
   - High contrast, readable text suggestions
   - Emotional expressions or compelling visual elements
   - A/B testing variations based on script content

${videoDetails.orientation === 'portrait' ? `
6. YOUTUBE SHORTS OPTIMIZATION:
   - Hashtag strategy specifically for Shorts
   - Hook-focused title variations
   - Trending elements for Shorts discovery
` : ''}

7. SEO ANALYSIS:
   - Primary keywords extracted from script
   - Estimated search volume category (High/Medium/Low)
   - Competition level assessment
   - Optimization score (1-100)

8. ENGAGEMENT OPTIMIZATION:
   - Specific call-to-action based on content
   - End screen suggestions relevant to script topic
   - Community post ideas for channel growth

Consider YouTube algorithm factors:
- Search optimization for YouTube's search engine
- Suggested video placement strategies
- Click-through rate optimization techniques
- Watch time expectation setting
- Engagement signal optimization

Respond with a JSON object containing all the metadata fields.
`;

    console.log('🎯 Generating YouTube metadata with OpenAI...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a YouTube SEO expert. Generate comprehensive, platform-optimized metadata for YouTube videos. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: youtubeMetadataPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    console.log('🤖 OpenAI Response:', response);

    // Parse the JSON response
    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      throw new Error('Invalid response format from AI');
    }

    // Extract metadata from the response (handle nested structure)
    let metadata: YouTubeMetadata;
    if (parsedResponse.metadata) {
      // If metadata is nested under a 'metadata' key
      metadata = parsedResponse.metadata;
    } else {
      // If metadata is at the top level
      metadata = parsedResponse;
    }

    // Validate and enhance the metadata
    if (!metadata.title || !metadata.description || !metadata.tags) {
      console.error('Incomplete metadata structure:', {
        hasTitle: !!metadata.title,
        hasDescription: !!metadata.description,
        hasTags: !!metadata.tags,
        metadata: metadata
      });
      throw new Error('Incomplete metadata generated');
    }

    // Ensure title is within YouTube limits
    if (metadata.title.length > 60) {
      metadata.title = metadata.title.substring(0, 57) + '...';
    }

    // Ensure description is within YouTube limits
    if (metadata.description.length > 5000) {
      metadata.description = metadata.description.substring(0, 4997) + '...';
    }

    // Handle tags - OpenAI might return string or array
    if (typeof metadata.tags === 'string') {
      // Convert comma-separated string to array
      metadata.tags = metadata.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    
    // Ensure tags are within limits
    const tagsString = metadata.tags.join(', ');
    if (tagsString.length > 500) {
      // Trim tags to fit within limit
      let trimmedTags = [];
      let currentLength = 0;
      for (const tag of metadata.tags) {
        if (currentLength + tag.length + 2 <= 500) { // +2 for ", "
          trimmedTags.push(tag);
          currentLength += tag.length + 2;
        } else {
          break;
        }
      }
      metadata.tags = trimmedTags;
    }

    // Handle endScreenSuggestions - ensure it's always an array
    if (metadata.engagementOptimization?.endScreenSuggestions) {
      if (typeof metadata.engagementOptimization.endScreenSuggestions === 'string') {
        // Convert string to array by splitting on common delimiters
        const stringValue = metadata.engagementOptimization.endScreenSuggestions as string;
        metadata.engagementOptimization.endScreenSuggestions = 
          stringValue
            .split(/[,;.\n]/)
            .map((item: string) => item.trim())
            .filter((item: string) => item.length > 0);
      } else if (!Array.isArray(metadata.engagementOptimization.endScreenSuggestions)) {
        // If it's neither string nor array, convert to array
        metadata.engagementOptimization.endScreenSuggestions = [
          String(metadata.engagementOptimization.endScreenSuggestions)
        ];
      }
    }

    // Handle communityPostIdeas - ensure it's always an array
    if (metadata.engagementOptimization?.communityPostIdeas) {
      if (typeof metadata.engagementOptimization.communityPostIdeas === 'string') {
        const stringValue = metadata.engagementOptimization.communityPostIdeas as string;
        metadata.engagementOptimization.communityPostIdeas = 
          stringValue
            .split(/[,;.\n]/)
            .map((item: string) => item.trim())
            .filter((item: string) => item.length > 0);
      } else if (!Array.isArray(metadata.engagementOptimization.communityPostIdeas)) {
        metadata.engagementOptimization.communityPostIdeas = [
          String(metadata.engagementOptimization.communityPostIdeas)
        ];
      }
    }

    // Handle primaryKeywords - ensure it's always an array
    if (metadata.seoAnalysis?.primaryKeywords) {
      if (typeof metadata.seoAnalysis.primaryKeywords === 'string') {
        const stringValue = metadata.seoAnalysis.primaryKeywords as string;
        metadata.seoAnalysis.primaryKeywords = 
          stringValue
            .split(/[,;.\n]/)
            .map((item: string) => item.trim())
            .filter((item: string) => item.length > 0);
      } else if (!Array.isArray(metadata.seoAnalysis.primaryKeywords)) {
        metadata.seoAnalysis.primaryKeywords = [
          String(metadata.seoAnalysis.primaryKeywords)
        ];
      }
    }

    // Validate category
    if (!Object.keys(YOUTUBE_CATEGORIES).includes(metadata.category)) {
      metadata.category = 'Education'; // Default fallback
    }

    // Deduct credits
    await supabase
      .from('user_credits')
      .update({ 
        current_balance: userCredits.current_balance - metadataCost,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    console.log('✅ YouTube metadata generated successfully');

    return NextResponse.json({
      success: true,
      metadata,
      remainingCredits: userCredits.current_balance - metadataCost,
      cost: metadataCost
    });

  } catch (error) {
    console.error('YouTube metadata generation error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to generate YouTube metadata'
    }, { status: 500 });
  }
}
