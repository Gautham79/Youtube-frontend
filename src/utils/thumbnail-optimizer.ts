import sharp from 'sharp';

export interface ThumbnailDimensions {
  width: number;
  height: number;
  dalleSize: "1024x1024" | "1024x1792" | "1792x1024";
  aspectRatio: string;
}

export interface OptimizationResult {
  buffer: Buffer;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  quality: number;
  dimensions: { width: number; height: number };
}

export interface OptimizationOptions {
  maxSizeBytes?: number;
  initialQuality?: number;
  minQuality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Get optimal thumbnail dimensions based on video orientation
 */
export function getOptimalThumbnailSize(orientation: 'landscape' | 'portrait' | 'square'): ThumbnailDimensions {
  switch (orientation) {
    case 'portrait':
      return {
        width: 720,
        height: 1280,
        dalleSize: "1024x1792",
        aspectRatio: "9:16"
      };
    case 'square':
      return {
        width: 1080,
        height: 1080,
        dalleSize: "1024x1024",
        aspectRatio: "1:1"
      };
    case 'landscape':
    default:
      return {
        width: 1280,
        height: 720,
        dalleSize: "1792x1024",
        aspectRatio: "16:9"
      };
  }
}

/**
 * Download image from URL and return buffer
 */
export async function downloadImage(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error downloading image:', error);
    throw new Error('Failed to download image from URL');
  }
}

/**
 * Get image metadata
 */
export async function getImageMetadata(buffer: Buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: buffer.length,
      hasAlpha: metadata.hasAlpha || false
    };
  } catch (error) {
    console.error('Error getting image metadata:', error);
    throw new Error('Failed to analyze image metadata');
  }
}

/**
 * Optimize image with progressive quality reduction until target size is met
 */
export async function optimizeImageForYouTube(
  imageBuffer: Buffer,
  targetDimensions: ThumbnailDimensions,
  options: OptimizationOptions = {}
): Promise<OptimizationResult> {
  const {
    maxSizeBytes = 2 * 1024 * 1024, // 2MB default
    initialQuality = 90,
    minQuality = 60,
    format = 'jpeg'
  } = options;

  const originalMetadata = await getImageMetadata(imageBuffer);
  const originalSize = imageBuffer.length;

  let quality = initialQuality;
  let optimizedBuffer: Buffer;
  let finalQuality = quality;

  console.log(`🎨 Optimizing thumbnail: ${originalMetadata.width}x${originalMetadata.height} (${(originalSize / 1024 / 1024).toFixed(2)}MB) -> ${targetDimensions.width}x${targetDimensions.height}`);

  // Progressive optimization loop
  while (quality >= minQuality) {
    try {
      let sharpInstance = sharp(imageBuffer)
        .resize(targetDimensions.width, targetDimensions.height, {
          fit: 'cover',
          position: 'center'
        });

      // Apply format-specific optimization
      if (format === 'jpeg') {
        sharpInstance = sharpInstance.jpeg({
          quality,
          progressive: true,
          mozjpeg: true, // Better compression
          optimizeScans: true
        });
      } else if (format === 'webp') {
        sharpInstance = sharpInstance.webp({
          quality,
          effort: 6 // Higher effort for better compression
        });
      } else if (format === 'png') {
        sharpInstance = sharpInstance.png({
          compressionLevel: 9,
          adaptiveFiltering: true,
          palette: quality < 80 // Use palette for lower quality
        });
      }

      optimizedBuffer = await sharpInstance.toBuffer();
      finalQuality = quality;

      console.log(`📊 Quality ${quality}%: ${(optimizedBuffer.length / 1024 / 1024).toFixed(2)}MB`);

      // Check if we've met the size requirement
      if (optimizedBuffer.length <= maxSizeBytes) {
        break;
      }

      // Reduce quality for next iteration
      quality -= 5;
    } catch (error) {
      console.error(`Error optimizing at quality ${quality}:`, error);
      quality -= 10; // Skip more aggressively on error
    }
  }

  // If we still haven't met the size requirement, try more aggressive optimization
  if (optimizedBuffer!.length > maxSizeBytes && quality < minQuality) {
    console.log('🔧 Applying aggressive optimization...');
    
    // Try with even lower quality and smaller dimensions if needed
    const aggressiveDimensions = {
      width: Math.floor(targetDimensions.width * 0.9),
      height: Math.floor(targetDimensions.height * 0.9)
    };

    optimizedBuffer = await sharp(imageBuffer)
      .resize(aggressiveDimensions.width, aggressiveDimensions.height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: minQuality,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer();

    finalQuality = minQuality;
  }

  const optimizedSize = optimizedBuffer!.length;
  const compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100;

  console.log(`✅ Optimization complete: ${(optimizedSize / 1024 / 1024).toFixed(2)}MB (${compressionRatio.toFixed(1)}% reduction)`);

  return {
    buffer: optimizedBuffer!,
    originalSize,
    optimizedSize,
    compressionRatio,
    quality: finalQuality,
    dimensions: {
      width: targetDimensions.width,
      height: targetDimensions.height
    }
  };
}

/**
 * Generate orientation-specific DALL-E prompts
 */
export function generateOrientationSpecificPrompts(
  orientation: 'landscape' | 'portrait' | 'square',
  title: string,
  script: any
): string[] {
  const mainCharacters = script.characters?.slice(0, 2) || [];
  const keyScenes = script.scenes?.filter((scene: any) => 
    scene.sceneType === 'intro' || scene.sceneType === 'explanation'
  ).slice(0, 2) || [];
  
  const isChildrensContent = script.targetAudience?.toLowerCase().includes('child') || 
                            script.targetAudience?.toLowerCase().includes('kid') ||
                            script.videoStyle?.toLowerCase().includes('cartoon');

  const baseStyle = isChildrensContent ? 'Vibrant cartoon/animated style with bright colors' : 'Professional and engaging with high contrast';
  const dimensions = getOptimalThumbnailSize(orientation);

  if (orientation === 'portrait') {
    return [
      // Portrait Thumbnail 1: Character-focused for Shorts
      `Create a YouTube Shorts thumbnail (${dimensions.aspectRatio}) for "${title}". 
      VERTICAL COMPOSITION optimized for mobile viewing. 
      ${mainCharacters.length > 0 ? `Main character: ${mainCharacters[0].name} - ${mainCharacters[0].appearance}, ${mainCharacters[0].clothing}. ` : ''}
      Style: ${baseStyle}. 
      Character positioned in center of vertical frame. Large, bold text at top or bottom that's readable on small screens. 
      High contrast colors that pop on mobile. Emotional facial expression for engagement. 
      Background should be simple but eye-catching. Designed specifically for YouTube Shorts feed.`,

      // Portrait Thumbnail 2: Action/Scene-focused for Shorts
      `Create a YouTube Shorts thumbnail (${dimensions.aspectRatio}) for "${title}". 
      VERTICAL LAYOUT with dynamic action or key scene. 
      ${keyScenes.length > 0 ? `Key scene: ${keyScenes[0]?.narration?.substring(0, 100)}. ` : ''}
      Style: ${baseStyle}. 
      Vertical composition with main action in center. Bold text overlay optimized for mobile viewing. 
      Bright, saturated colors that stand out in vertical feed. 
      Mobile-first design with clear visual hierarchy. Perfect for YouTube Shorts discovery.`,

      // Portrait Thumbnail 3: Concept-focused for Shorts
      `Create a YouTube Shorts thumbnail (${dimensions.aspectRatio}) for "${title}". 
      PORTRAIT orientation concept-driven design. 
      Content theme: ${script.scenes?.[0]?.keyPoints?.join(', ') || 'Educational content'}. 
      Style: ${baseStyle}. 
      Vertical layout with concept visualization. Large, mobile-readable text. 
      Use psychological triggers like arrows or highlighting. 
      Optimized for YouTube Shorts mobile experience with high engagement design.`
    ];
  } else if (orientation === 'square') {
    return [
      // Square thumbnails for social media optimization
      `Create a square YouTube thumbnail (${dimensions.aspectRatio}) for "${title}". 
      CENTERED COMPOSITION for social media sharing. 
      ${mainCharacters.length > 0 ? `Main character: ${mainCharacters[0].name} - ${mainCharacters[0].appearance}. ` : ''}
      Style: ${baseStyle}. 
      Balanced square layout with subject in center. Text positioned for maximum readability. 
      Cross-platform optimized design. Clean, professional appearance.`,

      `Create a square YouTube thumbnail (${dimensions.aspectRatio}) for "${title}". 
      SQUARE FORMAT with dynamic visual elements. 
      ${keyScenes.length > 0 ? `Scene: ${keyScenes[0]?.narration?.substring(0, 100)}. ` : ''}
      Style: ${baseStyle}. 
      Symmetrical composition perfect for square format. Bold, centered text. 
      Engaging design that works across all platforms.`,

      `Create a square YouTube thumbnail (${dimensions.aspectRatio}) for "${title}". 
      CONCEPT-FOCUSED square design. 
      Theme: ${script.scenes?.[0]?.keyPoints?.join(', ') || 'Educational content'}. 
      Style: ${baseStyle}. 
      Balanced square composition with clear visual hierarchy. 
      Universal design optimized for multiple platforms.`
    ];
  } else {
    // Landscape thumbnails (existing logic)
    return [
      `Create a YouTube thumbnail (${dimensions.aspectRatio}) for "${title}". 
      ${mainCharacters.length > 0 ? `Main character: ${mainCharacters[0].name} - ${mainCharacters[0].appearance}, ${mainCharacters[0].clothing}. ` : ''}
      Style: ${baseStyle}. 
      Include bold, readable text overlay with the main keyword from the title. 
      Use YouTube-optimized composition with the character prominently featured. 
      Background should be eye-catching and relevant to the content. 
      Ensure high contrast and emotional expression to maximize click-through rate.`,

      `Create a YouTube thumbnail (${dimensions.aspectRatio}) for "${title}". 
      ${keyScenes.length > 0 ? `Key scene: ${keyScenes[0]?.narration?.substring(0, 100)}. ` : ''}
      Style: ${baseStyle}. 
      Focus on the main action or concept from the video. 
      Include compelling text overlay that creates curiosity. 
      Use bright, contrasting colors that stand out in YouTube's interface. 
      Composition should be visually striking and immediately convey the video's value.`,

      `Create a YouTube thumbnail (${dimensions.aspectRatio}) for "${title}". 
      Content theme: ${script.scenes?.[0]?.keyPoints?.join(', ') || 'Educational content'}. 
      Style: ${baseStyle}. 
      Create a concept-driven design that represents the main idea of the video. 
      Include large, bold text that's easily readable on mobile devices. 
      Use psychological triggers like arrows, circles, or highlighting to draw attention. 
      Ensure the design follows YouTube thumbnail best practices for maximum engagement.`
    ];
  }
}

/**
 * Validate if image meets YouTube requirements
 */
export function validateYouTubeThumbnail(buffer: Buffer, maxSize: number = 2 * 1024 * 1024): {
  isValid: boolean;
  issues: string[];
  size: number;
} {
  const issues: string[] = [];
  const size = buffer.length;

  if (size > maxSize) {
    issues.push(`File size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds YouTube's ${(maxSize / 1024 / 1024)}MB limit`);
  }

  if (size < 1024) {
    issues.push('File size is too small (minimum 1KB recommended)');
  }

  return {
    isValid: issues.length === 0,
    issues,
    size
  };
}
