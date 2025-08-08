import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { VideoOrientation } from './video-orientation';

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  frameRate: number;
  bitrate: number;
  codec: string;
  format: string;
  size: number;
  orientation: VideoOrientation;
  aspectRatio: number;
  rotation?: number;
  createdAt?: Date;
  modifiedAt?: Date;
}

export interface VideoMetadataCache {
  [filename: string]: {
    metadata: VideoMetadata;
    lastModified: number;
    extractedAt: number;
  };
}

// In-memory cache for video metadata
const metadataCache: VideoMetadataCache = {};

/**
 * Extract comprehensive metadata from a video file
 */
export async function extractVideoMetadata(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      reject(new Error(`Video file not found: ${filePath}`));
      return;
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const filename = path.basename(filePath);

    // Check cache first
    const cached = metadataCache[filename];
    if (cached && cached.lastModified === stats.mtimeMs) {
      console.log(`📋 Using cached metadata for ${filename}`);
      resolve(cached.metadata);
      return;
    }

    console.log(`🔍 Extracting metadata from video file: ${filename}`);

    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('❌ FFprobe error:', err);
        reject(new Error(`Failed to extract video metadata: ${err.message}`));
        return;
      }

      try {
        // Find video stream
        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No video stream found in file'));
          return;
        }

        // Extract basic properties
        const width = videoStream.width || 0;
        const height = videoStream.height || 0;
        const duration = parseFloat(metadata.format.duration?.toString() || '0');
        const bitrate = parseInt(metadata.format.bit_rate?.toString() || '0');
        const size = parseInt(metadata.format.size?.toString() || stats.size.toString());
        
        // Extract frame rate
        let frameRate = 30; // default
        if (videoStream.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
          if (den && den !== 0) {
            frameRate = Math.round(num / den);
          }
        } else if (videoStream.avg_frame_rate) {
          const [num, den] = videoStream.avg_frame_rate.split('/').map(Number);
          if (den && den !== 0) {
            frameRate = Math.round(num / den);
          }
        }

        // Extract codec and format
        const codec = videoStream.codec_name || 'unknown';
        const format = metadata.format.format_name || path.extname(filePath).slice(1);

        // Calculate aspect ratio
        const aspectRatio = width && height ? width / height : 16/9;

        // Determine orientation based on actual dimensions
        let orientation: VideoOrientation;
        if (width > height) {
          orientation = 'landscape';
        } else if (height > width) {
          orientation = 'portrait';
        } else {
          orientation = 'square';
        }

        // Check for rotation metadata (some videos have rotation tags)
        let rotation = 0;
        if (videoStream.tags && videoStream.tags.rotate) {
          rotation = parseInt(videoStream.tags.rotate);
          // If rotated 90 or 270 degrees, swap orientation
          if (rotation === 90 || rotation === 270) {
            orientation = orientation === 'landscape' ? 'portrait' : 
                         orientation === 'portrait' ? 'landscape' : 'square';
          }
        }

        const extractedMetadata: VideoMetadata = {
          width,
          height,
          duration,
          frameRate,
          bitrate,
          codec,
          format,
          size,
          orientation,
          aspectRatio,
          rotation: rotation !== 0 ? rotation : undefined,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        };

        // Cache the result
        metadataCache[filename] = {
          metadata: extractedMetadata,
          lastModified: stats.mtimeMs,
          extractedAt: Date.now()
        };

        console.log(`✅ Extracted metadata for ${filename}:`, {
          dimensions: `${width}x${height}`,
          orientation,
          duration: `${duration}s`,
          frameRate: `${frameRate}fps`,
          codec,
          format,
          size: `${(size / 1024 / 1024).toFixed(2)}MB`
        });

        resolve(extractedMetadata);
      } catch (parseError) {
        console.error('❌ Error parsing metadata:', parseError);
        reject(new Error(`Failed to parse video metadata: ${parseError}`));
      }
    });
  });
}

/**
 * Extract metadata from video file by filename (searches in generated-videos directory)
 */
export async function extractVideoMetadataByFilename(filename: string): Promise<VideoMetadata> {
  const possiblePaths = [
    path.join(process.cwd(), 'public', 'generated-videos', filename),
    path.join(process.cwd(), 'public', 'generated-videos', `${filename}.mp4`),
    path.join(process.cwd(), 'public', 'generated-videos', filename.replace(/\.[^/.]+$/, '.mp4'))
  ];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return await extractVideoMetadata(filePath);
    }
  }

  throw new Error(`Video file not found: ${filename}`);
}

/**
 * Get cached metadata if available, otherwise extract fresh
 */
export async function getVideoMetadata(filename: string): Promise<VideoMetadata> {
  try {
    // Try to get from cache first
    const cached = metadataCache[filename];
    if (cached) {
      // Check if cache is still valid (less than 1 hour old)
      const cacheAge = Date.now() - cached.extractedAt;
      if (cacheAge < 60 * 60 * 1000) { // 1 hour
        return cached.metadata;
      }
    }

    // Extract fresh metadata
    return await extractVideoMetadataByFilename(filename);
  } catch (error) {
    console.error(`Failed to get metadata for ${filename}:`, error);
    throw error;
  }
}

/**
 * Clear metadata cache for a specific file or all files
 */
export function clearMetadataCache(filename?: string): void {
  if (filename) {
    delete metadataCache[filename];
    console.log(`🗑️ Cleared metadata cache for ${filename}`);
  } else {
    Object.keys(metadataCache).forEach(key => delete metadataCache[key]);
    console.log('🗑️ Cleared all metadata cache');
  }
}

/**
 * Get cache statistics
 */
export function getMetadataCacheStats(): {
  totalEntries: number;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
} {
  const entries = Object.values(metadataCache);
  const extractedTimes = entries.map(e => e.extractedAt);
  
  return {
    totalEntries: entries.length,
    totalSize: JSON.stringify(metadataCache).length,
    oldestEntry: Math.min(...extractedTimes) || 0,
    newestEntry: Math.max(...extractedTimes) || 0
  };
}

/**
 * Validate video file and extract basic info quickly
 */
export async function validateVideoFile(filePath: string): Promise<{
  isValid: boolean;
  hasVideoStream: boolean;
  duration: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) {
      resolve({
        isValid: false,
        hasVideoStream: false,
        duration: 0,
        error: 'File not found'
      });
      return;
    }

    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        resolve({
          isValid: false,
          hasVideoStream: false,
          duration: 0,
          error: err.message
        });
        return;
      }

      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      const duration = parseFloat(metadata.format.duration?.toString() || '0');

      resolve({
        isValid: true,
        hasVideoStream: !!videoStream,
        duration,
      });
    });
  });
}

/**
 * Format metadata for display
 */
export function formatVideoMetadata(metadata: VideoMetadata): {
  resolution: string;
  orientation: string;
  duration: string;
  frameRate: string;
  size: string;
  aspectRatio: string;
  codec: string;
} {
  const minutes = Math.floor(metadata.duration / 60);
  const seconds = Math.floor(metadata.duration % 60);
  const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return {
    resolution: `${metadata.width}x${metadata.height}`,
    orientation: metadata.orientation,
    duration: durationStr,
    frameRate: `${metadata.frameRate} fps`,
    size: `${(metadata.size / 1024 / 1024).toFixed(2)} MB`,
    aspectRatio: metadata.aspectRatio.toFixed(2),
    codec: metadata.codec.toUpperCase()
  };
}
