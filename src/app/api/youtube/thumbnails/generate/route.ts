import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { openai } from '@/utils/openai/client';
import { 
  getOptimalThumbnailSize, 
  generateOrientationSpecificPrompts,
  downloadImage,
  optimizeImageForYouTube,
  validateYouTubeThumbnail
} from '@/utils/thumbnail-optimizer';

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

interface ThumbnailOption {
  id: number;
  url: string;
  concept: string;
  style: string;
}

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
      title,
      thumbnailDimensions
    }: {
      script: GeneratedScript;
      videoDetails: VideoDetails;
      title: string;
      thumbnailDimensions?: string;
    } = body;

    if (!script || !title) {
      return NextResponse.json({ 
        error: 'Script and title are required' 
      }, { status: 400 });
    }

    // Check user credits
    const { data: userCredits } = await supabase
      .from('user_credits')
      .select('current_balance')
      .eq('user_id', user.id)
      .single();

    const thumbnailCost = 3; // Cost for generating 3 thumbnails
    if (!userCredits || userCredits.current_balance < thumbnailCost) {
      return NextResponse.json({
        error: 'Insufficient credits',
        required: thumbnailCost,
        available: userCredits?.current_balance || 0
      }, { status: 402 });
    }

    // Parse manually selected dimensions or fallback to video orientation
    let targetDimensions;
    let orientation: 'landscape' | 'portrait' | 'square';
    
    if (thumbnailDimensions) {
      // Parse manual dimensions (e.g., "1280x720", "720x1280")
      const [width, height] = thumbnailDimensions.split('x').map(Number);
      
      // Determine orientation from dimensions
      if (width > height) {
        orientation = 'landscape';
      } else if (height > width) {
        orientation = 'portrait';
      } else {
        orientation = 'square';
      }
      
      // Create dimension object for manual selection
      // Map to appropriate DALL-E 3 sizes based on orientation
      let dalleSize: "1024x1024" | "1792x1024" | "1024x1792";
      if (width > height) {
        dalleSize = "1792x1024"; // Landscape
      } else if (height > width) {
        dalleSize = "1024x1792"; // Portrait
      } else {
        dalleSize = "1024x1024"; // Square
      }
      
      targetDimensions = {
        width,
        height,
        aspectRatio: width > height ? '16:9' : height > width ? '9:16' : '1:1',
        dalleSize
      };
      
      console.log(`🎨 Generating AI thumbnails for manually selected dimensions: ${thumbnailDimensions} (${orientation})...`);
    } else {
      // Fallback to video orientation
      orientation = videoDetails?.orientation || 'landscape';
      targetDimensions = getOptimalThumbnailSize(orientation);
      console.log(`🎨 Generating AI thumbnails for ${orientation} orientation (auto-detected)...`);
    }
    
    console.log(`📐 Target dimensions: ${targetDimensions.width}x${targetDimensions.height} (${targetDimensions.aspectRatio})`);

    // Generate orientation-specific prompts
    const thumbnailPrompts = generateOrientationSpecificPrompts(orientation, title, script);

    const thumbnails: (ThumbnailOption & { 
      originalUrl: string; 
      optimizedUrl?: string; 
      optimization?: any;
      youTubeCompliant?: boolean;
    })[] = [];

    // Generate each thumbnail
    for (let i = 0; i < thumbnailPrompts.length; i++) {
      try {
        console.log(`🎨 Generating thumbnail ${i + 1}/3 for ${orientation} orientation...`);
        
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: thumbnailPrompts[i],
          size: targetDimensions.dalleSize as "1024x1024" | "1792x1024" | "1024x1792",
          quality: "hd",
          n: 1,
        });

        if (response.data && response.data[0]?.url) {
          const originalUrl = response.data[0].url;
          
          try {
            // Download and optimize the thumbnail automatically
            console.log(`🔧 Optimizing thumbnail ${i + 1} for YouTube compliance...`);
            
            const originalBuffer = await downloadImage(originalUrl);
            const optimizationResult = await optimizeImageForYouTube(
              originalBuffer,
              targetDimensions,
              {
                maxSizeBytes: 2 * 1024 * 1024, // 2MB YouTube limit
                initialQuality: 90,
                minQuality: 60,
                format: 'jpeg'
              }
            );

            // Validate the optimized image
            const validation = validateYouTubeThumbnail(optimizationResult.buffer);
            
            // Convert optimized buffer to data URL
            const optimizedImageBase64 = optimizationResult.buffer.toString('base64');
            const optimizedDataUrl = `data:image/jpeg;base64,${optimizedImageBase64}`;

            thumbnails.push({
              id: i + 1,
              url: optimizedDataUrl, // Use optimized version as main URL
              originalUrl: originalUrl, // Keep original for reference
              optimizedUrl: optimizedDataUrl,
              concept: i === 0 ? 'Character-focused' : i === 1 ? 'Action/Scene-focused' : 'Concept-focused',
              style: orientation === 'portrait' ? 'Mobile-optimized' : 
                     orientation === 'square' ? 'Social-optimized' : 'Desktop-optimized',
              optimization: {
                originalSize: optimizationResult.originalSize,
                optimizedSize: optimizationResult.optimizedSize,
                compressionRatio: optimizationResult.compressionRatio,
                quality: optimizationResult.quality,
                sizeInMB: (optimizationResult.optimizedSize / 1024 / 1024).toFixed(2)
              },
              youTubeCompliant: validation.isValid
            });

            console.log(`✅ Thumbnail ${i + 1} optimized: ${(optimizationResult.optimizedSize / 1024 / 1024).toFixed(2)}MB (${optimizationResult.compressionRatio.toFixed(1)}% reduction)`);
            
          } catch (optimizationError) {
            console.error(`Failed to optimize thumbnail ${i + 1}:`, optimizationError);
            
            // Fallback to original if optimization fails
            thumbnails.push({
              id: i + 1,
              url: originalUrl,
              originalUrl: originalUrl,
              concept: i === 0 ? 'Character-focused' : i === 1 ? 'Action/Scene-focused' : 'Concept-focused',
              style: orientation === 'portrait' ? 'Mobile-optimized' : 
                     orientation === 'square' ? 'Social-optimized' : 'Desktop-optimized',
              youTubeCompliant: false // Mark as non-compliant if optimization failed
            });
          }
        }
      } catch (error) {
        console.error(`Failed to generate thumbnail ${i + 1}:`, error);
        // Continue with other thumbnails even if one fails
      }
    }

    if (thumbnails.length === 0) {
      throw new Error('Failed to generate any thumbnails');
    }

    // Deduct credits
    await supabase
      .from('user_credits')
      .update({ 
        current_balance: userCredits.current_balance - thumbnailCost,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    console.log(`✅ Generated ${thumbnails.length} thumbnails successfully`);

    // Calculate optimization statistics
    const optimizedThumbnails = thumbnails.filter(t => t.youTubeCompliant);
    const totalOriginalSize = thumbnails.reduce((sum, t) => sum + (t.optimization?.originalSize || 0), 0);
    const totalOptimizedSize = thumbnails.reduce((sum, t) => sum + (t.optimization?.optimizedSize || 0), 0);
    const averageCompression = thumbnails.length > 0 ? 
      thumbnails.reduce((sum, t) => sum + (t.optimization?.compressionRatio || 0), 0) / thumbnails.length : 0;

    return NextResponse.json({
      success: true,
      thumbnails,
      remainingCredits: userCredits.current_balance - thumbnailCost,
      cost: thumbnailCost,
      metadata: {
        orientation: orientation,
        targetDimensions: targetDimensions,
        youTubeCompliant: optimizedThumbnails.length,
        totalGenerated: thumbnails.length,
        optimization: {
          totalOriginalSizeMB: (totalOriginalSize / 1024 / 1024).toFixed(2),
          totalOptimizedSizeMB: (totalOptimizedSize / 1024 / 1024).toFixed(2),
          averageCompressionRatio: averageCompression.toFixed(1),
          allCompliant: optimizedThumbnails.length === thumbnails.length
        }
      }
    });

  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to generate thumbnails'
    }, { status: 500 });
  }
}
