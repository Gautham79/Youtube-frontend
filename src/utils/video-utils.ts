/**
 * Video utility functions for checking availability and handling video operations
 */

import { VideoOrientation } from './video-orientation';
import { VideoMetadata } from './video-metadata';

export interface VideoAvailability {
  exists: boolean;
  url?: string;
  error?: string;
  size?: number;
  mimeType?: string;
}

export interface VideoInfo {
  availability: VideoAvailability;
  metadata?: VideoMetadata;
  error?: string;
}

/**
 * Check if a video file exists and is accessible
 */
export async function checkVideoAvailability(filename: string): Promise<VideoAvailability> {
  try {
    // Use HEAD request to check if video exists without downloading it
    const response = await fetch(`/api/video/serve/${filename}`, {
      method: 'HEAD',
    });

    if (response.ok) {
      const size = response.headers.get('content-length');
      const mimeType = response.headers.get('content-type');
      
      return {
        exists: true,
        url: `/api/video/serve/${filename}`,
        size: size ? parseInt(size, 10) : undefined,
        mimeType: mimeType || undefined,
      };
    } else if (response.status === 404) {
      return {
        exists: false,
        error: 'Video file not found',
      };
    } else if (response.status === 401) {
      return {
        exists: false,
        error: 'Unauthorized access to video',
      };
    } else {
      return {
        exists: false,
        error: `Failed to check video availability (${response.status})`,
      };
    }
  } catch (error) {
    console.error('Error checking video availability:', error);
    return {
      exists: false,
      error: 'Network error while checking video availability',
    };
  }
}

/**
 * Get comprehensive video information including metadata
 */
export async function getVideoInfo(filename: string): Promise<VideoInfo> {
  try {
    // First check if video exists
    const availability = await checkVideoAvailability(filename);
    
    if (!availability.exists) {
      return {
        availability,
        error: availability.error
      };
    }

    // Extract real metadata from the video file
    try {
      const metadataResponse = await fetch(`/api/video/metadata/${filename}`);
      
      if (metadataResponse.ok) {
        const metadataData = await metadataResponse.json();
        
        if (metadataData.success) {
          return {
            availability,
            metadata: metadataData.metadata.raw
          };
        } else {
          console.warn('Failed to extract metadata:', metadataData.error);
          // Video exists but metadata extraction failed - still return as available
          return {
            availability,
            metadata: undefined // No metadata but video is still available
          };
        }
      } else {
        console.warn('Metadata API request failed:', metadataResponse.status);
        // Video exists but metadata API failed - still return as available
        return {
          availability,
          metadata: undefined
        };
      }
    } catch (metadataError) {
      console.warn('Error fetching metadata:', metadataError);
      // Video exists but metadata extraction failed - still return as available
      return {
        availability,
        metadata: undefined
      };
    }
  } catch (error) {
    console.error('Error getting video info:', error);
    return {
      availability: {
        exists: false,
        error: 'Failed to get video information'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get video orientation from real metadata
 */
export async function getVideoOrientation(filename: string): Promise<VideoOrientation> {
  try {
    const videoInfo = await getVideoInfo(filename);
    
    if (videoInfo.metadata) {
      return videoInfo.metadata.orientation;
    }
    
    // Fallback to filename-based detection if metadata extraction fails
    console.warn('Using fallback orientation detection for:', filename);
    return 'landscape'; // Default fallback
  } catch (error) {
    console.error('Error getting video orientation:', error);
    return 'landscape'; // Default fallback
  }
}

/**
 * Extract filename from video parameter or URL
 */
export function extractVideoFilename(videoParam: string): string {
  // If it's already a filename, return as is
  if (videoParam.includes('.')) {
    return videoParam;
  }
  
  // If it's a UUID or ID, assume it's an MP4
  return `${videoParam}.mp4`;
}

/**
 * Get video URL for serving through the API
 */
export function getVideoServeUrl(filename: string): string {
  return `/api/video/serve/${filename}`;
}

/**
 * Get video download URL with proper filename
 */
export function getVideoDownloadUrl(filename: string, title?: string): string {
  const baseUrl = `/api/video/serve/${filename}`;
  
  if (title) {
    // Add title as query parameter for better download filename
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_');
    return `${baseUrl}?download=true&title=${encodeURIComponent(sanitizedTitle)}`;
  }
  
  return `${baseUrl}?download=true`;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format duration from seconds to MM:SS format
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Validate video filename
 */
export function isValidVideoFilename(filename: string): boolean {
  if (!filename) return false;
  
  // Check for directory traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  
  // Check for valid video extensions
  const validExtensions = ['.mp4', '.webm', '.mov', '.avi'];
  return validExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

/**
 * Create a download link for a video file
 */
export function downloadVideo(filename: string, title?: string): void {
  const url = getVideoDownloadUrl(filename, title);
  const a = document.createElement('a');
  a.href = url;
  a.download = title ? `${title.replace(/[^a-z0-9]/gi, '_')}.mp4` : filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Open video in new tab for preview
 */
export function previewVideo(filename: string): void {
  const url = getVideoServeUrl(filename);
  window.open(url, '_blank');
}

/**
 * Get video metadata with caching
 */
export async function getVideoMetadata(filename: string): Promise<VideoMetadata | null> {
  try {
    const response = await fetch(`/api/video/metadata/${filename}`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success) {
        return data.metadata.raw;
      } else {
        console.error('Failed to get video metadata:', data.error);
        return null;
      }
    } else {
      console.error('Metadata API request failed:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    return null;
  }
}

/**
 * Check if video is portrait orientation
 */
export async function isPortraitVideo(filename: string): Promise<boolean> {
  const orientation = await getVideoOrientation(filename);
  return orientation === 'portrait';
}

/**
 * Check if video is landscape orientation
 */
export async function isLandscapeVideo(filename: string): Promise<boolean> {
  const orientation = await getVideoOrientation(filename);
  return orientation === 'landscape';
}

/**
 * Get video dimensions from metadata
 */
export async function getVideoDimensions(filename: string): Promise<{ width: number; height: number } | null> {
  try {
    const metadata = await getVideoMetadata(filename);
    
    if (metadata) {
      return {
        width: metadata.width,
        height: metadata.height
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting video dimensions:', error);
    return null;
  }
}

/**
 * Get video duration from metadata
 */
export async function getVideoDuration(filename: string): Promise<number | null> {
  try {
    const metadata = await getVideoMetadata(filename);
    return metadata ? metadata.duration : null;
  } catch (error) {
    console.error('Error getting video duration:', error);
    return null;
  }
}

/**
 * Format video metadata for display
 */
export function formatVideoMetadataForDisplay(metadata: VideoMetadata): {
  resolution: string;
  orientation: string;
  duration: string;
  frameRate: string;
  size: string;
  aspectRatio: string;
  codec: string;
} {
  return {
    resolution: `${metadata.width}x${metadata.height}`,
    orientation: metadata.orientation,
    duration: formatDuration(metadata.duration),
    frameRate: `${metadata.frameRate} fps`,
    size: formatFileSize(metadata.size),
    aspectRatio: metadata.aspectRatio.toFixed(2),
    codec: metadata.codec.toUpperCase()
  };
}
