/**
 * Video orientation detection utilities
 */

export type VideoOrientation = 'landscape' | 'portrait' | 'square';

export interface VideoMetadata {
  width?: number;
  height?: number;
  resolution?: string;
  aspectRatio?: number;
  orientation?: VideoOrientation; // Explicit orientation if available
}

/**
 * Parse resolution string to get width and height
 */
export function parseResolution(resolution: string): { width: number; height: number } | null {
  // Handle common resolution formats
  const resolutionMap: Record<string, { width: number; height: number }> = {
    '4K': { width: 3840, height: 2160 },
    '2K': { width: 2560, height: 1440 },
    '1080p': { width: 1920, height: 1080 },
    '720p': { width: 1280, height: 720 },
    '480p': { width: 854, height: 480 },
    '360p': { width: 640, height: 360 },
    '240p': { width: 426, height: 240 },
    // Portrait versions (common for shorts)
    '1080p-portrait': { width: 1080, height: 1920 },
    '720p-portrait': { width: 720, height: 1280 },
    '480p-portrait': { width: 480, height: 854 },
    // Square versions
    '1080p-square': { width: 1080, height: 1080 },
    '720p-square': { width: 720, height: 720 },
  };

  // Check if it's a known resolution format
  if (resolutionMap[resolution]) {
    return resolutionMap[resolution];
  }

  // Try to parse formats like "1920x1080", "1080x1920", etc.
  const dimensionMatch = resolution.match(/(\d+)x(\d+)/);
  if (dimensionMatch) {
    return {
      width: parseInt(dimensionMatch[1]),
      height: parseInt(dimensionMatch[2])
    };
  }

  // Try to parse formats like "1920*1080", "1080*1920", etc.
  const asteriskMatch = resolution.match(/(\d+)\*(\d+)/);
  if (asteriskMatch) {
    return {
      width: parseInt(asteriskMatch[1]),
      height: parseInt(asteriskMatch[2])
    };
  }

  // Try to parse just the height (e.g., "1080", "720")
  const heightMatch = resolution.match(/(\d+)p?$/);
  if (heightMatch) {
    const height = parseInt(heightMatch[1]);
    // Assume standard aspect ratios
    if (height >= 1080) {
      return { width: 1920, height: 1080 };
    } else if (height >= 720) {
      return { width: 1280, height: 720 };
    } else if (height >= 480) {
      return { width: 854, height: 480 };
    } else {
      return { width: 640, height: 360 };
    }
  }

  return null;
}

/**
 * Calculate aspect ratio from width and height
 */
export function calculateAspectRatio(width: number, height: number): number {
  return width / height;
}

/**
 * Determine video orientation based on aspect ratio
 */
export function getOrientationFromAspectRatio(aspectRatio: number): VideoOrientation {
  const tolerance = 0.1; // Allow for slight variations
  
  if (Math.abs(aspectRatio - 1) < tolerance) {
    return 'square'; // 1:1 ratio
  } else if (aspectRatio > 1) {
    return 'landscape'; // Wider than tall
  } else {
    return 'portrait'; // Taller than wide
  }
}

/**
 * Detect video orientation from various metadata sources
 */
export function detectVideoOrientation(metadata: VideoMetadata): VideoOrientation {
  console.log('🔍 Detecting video orientation from metadata:', metadata);

  // Method 1: Use explicit orientation if provided (highest priority)
  if (metadata.orientation) {
    console.log(`📐 From explicit orientation: ${metadata.orientation}`);
    return metadata.orientation;
  }

  // Method 2: Use explicit width and height if available
  if (metadata.width && metadata.height) {
    const aspectRatio = calculateAspectRatio(metadata.width, metadata.height);
    const orientation = getOrientationFromAspectRatio(aspectRatio);
    console.log(`📐 From dimensions ${metadata.width}x${metadata.height}: ${orientation} (ratio: ${aspectRatio.toFixed(2)})`);
    return orientation;
  }

  // Method 3: Use explicit aspect ratio if available
  if (metadata.aspectRatio) {
    const orientation = getOrientationFromAspectRatio(metadata.aspectRatio);
    console.log(`📐 From aspect ratio ${metadata.aspectRatio}: ${orientation}`);
    return orientation;
  }

  // Method 4: Parse resolution string
  if (metadata.resolution) {
    const dimensions = parseResolution(metadata.resolution);
    if (dimensions) {
      const aspectRatio = calculateAspectRatio(dimensions.width, dimensions.height);
      const orientation = getOrientationFromAspectRatio(aspectRatio);
      console.log(`📐 From resolution "${metadata.resolution}" (${dimensions.width}x${dimensions.height}): ${orientation} (ratio: ${aspectRatio.toFixed(2)})`);
      return orientation;
    }
  }

  // Method 5: Check for orientation hints in resolution string
  if (metadata.resolution) {
    const resolutionLower = metadata.resolution.toLowerCase();
    if (resolutionLower.includes('portrait') || resolutionLower.includes('vertical') || resolutionLower.includes('9:16')) {
      console.log(`📐 From resolution hint "${metadata.resolution}": portrait`);
      return 'portrait';
    }
    if (resolutionLower.includes('square') || resolutionLower.includes('1:1')) {
      console.log(`📐 From resolution hint "${metadata.resolution}": square`);
      return 'square';
    }
    if (resolutionLower.includes('landscape') || resolutionLower.includes('horizontal') || resolutionLower.includes('16:9')) {
      console.log(`📐 From resolution hint "${metadata.resolution}": landscape`);
      return 'landscape';
    }
  }

  // Default fallback - assume landscape for traditional videos
  console.log('⚠️ Could not determine orientation, defaulting to landscape');
  return 'landscape';
}

/**
 * Get orientation-specific metadata for video generation
 */
export function getOrientationMetadata(orientation: VideoOrientation) {
  switch (orientation) {
    case 'portrait':
      return {
        width: 1080,
        height: 1920,
        aspectRatio: 9/16,
        description: 'Portrait (9:16) - Optimized for mobile and YouTube Shorts',
        thumbnailDimensions: { width: 720, height: 1280 }
      };
    case 'square':
      return {
        width: 1080,
        height: 1080,
        aspectRatio: 1,
        description: 'Square (1:1) - Optimized for social media',
        thumbnailDimensions: { width: 1080, height: 1080 }
      };
    case 'landscape':
    default:
      return {
        width: 1920,
        height: 1080,
        aspectRatio: 16/9,
        description: 'Landscape (16:9) - Traditional YouTube format',
        thumbnailDimensions: { width: 1280, height: 720 }
      };
  }
}

/**
 * Validate if orientation matches expected dimensions
 */
export function validateOrientation(
  expectedOrientation: VideoOrientation, 
  actualWidth: number, 
  actualHeight: number
): boolean {
  const actualAspectRatio = calculateAspectRatio(actualWidth, actualHeight);
  const actualOrientation = getOrientationFromAspectRatio(actualAspectRatio);
  
  return expectedOrientation === actualOrientation;
}
