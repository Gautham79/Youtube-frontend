import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  downloadImage, 
  optimizeImageForYouTube, 
  getOptimalThumbnailSize,
  validateYouTubeThumbnail,
  getImageMetadata
} from '@/utils/thumbnail-optimizer';

interface OptimizeRequest {
  imageUrl: string;
  orientation: 'landscape' | 'portrait' | 'square';
  options?: {
    maxSizeBytes?: number;
    initialQuality?: number;
    minQuality?: number;
    format?: 'jpeg' | 'png' | 'webp';
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: OptimizeRequest = await request.json();
    const { imageUrl, orientation, options = {} } = body;

    if (!imageUrl || !orientation) {
      return NextResponse.json({ 
        error: 'Image URL and orientation are required' 
      }, { status: 400 });
    }

    console.log(`🎨 Starting thumbnail optimization for ${orientation} orientation...`);

    // Download the original image
    const originalBuffer = await downloadImage(imageUrl);
    const originalMetadata = await getImageMetadata(originalBuffer);
    
    console.log(`📥 Downloaded image: ${originalMetadata.width}x${originalMetadata.height} (${(originalMetadata.size / 1024 / 1024).toFixed(2)}MB)`);

    // Get target dimensions for the orientation
    const targetDimensions = getOptimalThumbnailSize(orientation);

    // Optimize the image
    const optimizationResult = await optimizeImageForYouTube(
      originalBuffer,
      targetDimensions,
      {
        maxSizeBytes: 2 * 1024 * 1024, // 2MB YouTube limit
        initialQuality: 90,
        minQuality: 60,
        format: 'jpeg',
        ...options
      }
    );

    // Validate the optimized image
    const validation = validateYouTubeThumbnail(optimizationResult.buffer);

    if (!validation.isValid) {
      console.error('❌ Optimization failed validation:', validation.issues);
      return NextResponse.json({
        error: 'Failed to optimize image to meet YouTube requirements',
        issues: validation.issues
      }, { status: 400 });
    }

    // Convert buffer to base64 for response
    const optimizedImageBase64 = optimizationResult.buffer.toString('base64');
    const optimizedImageDataUrl = `data:image/jpeg;base64,${optimizedImageBase64}`;

    console.log(`✅ Optimization successful: ${(optimizationResult.optimizedSize / 1024 / 1024).toFixed(2)}MB (${optimizationResult.compressionRatio.toFixed(1)}% reduction)`);

    return NextResponse.json({
      success: true,
      optimizedImage: {
        dataUrl: optimizedImageDataUrl,
        size: optimizationResult.optimizedSize,
        dimensions: optimizationResult.dimensions,
        quality: optimizationResult.quality
      },
      optimization: {
        originalSize: optimizationResult.originalSize,
        optimizedSize: optimizationResult.optimizedSize,
        compressionRatio: optimizationResult.compressionRatio,
        qualityUsed: optimizationResult.quality
      },
      validation: {
        isValid: validation.isValid,
        youTubeCompliant: validation.isValid,
        sizeInMB: (validation.size / 1024 / 1024).toFixed(2)
      },
      metadata: {
        orientation,
        targetDimensions,
        originalDimensions: {
          width: originalMetadata.width,
          height: originalMetadata.height
        }
      }
    });

  } catch (error) {
    console.error('Thumbnail optimization error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to optimize thumbnail'
    }, { status: 500 });
  }
}
