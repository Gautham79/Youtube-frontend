/**
 * Client-safe subtitle types and utilities
 * This file contains only types and functions that can be used on both client and server
 */

export interface SubtitleSettings {
  enabled: boolean;
  position: 'bottom' | 'top' | 'center';
  delay?: number; // Delay in seconds before subtitle appears (default: 1)
  fadeIn?: boolean; // Whether to fade in the subtitle (default: true)
  style?: {
    fontSize: number;
    fontColor: string;
    outlineColor: string;
    outlineWidth: number;
  };
}

export interface SubtitleEntry {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

/**
 * Get default subtitle settings - client-safe version
 */
export function getDefaultSubtitleSettings(): SubtitleSettings {
  return {
    enabled: true,
    position: 'bottom',
    delay: 1, // 1 second delay by default
    fadeIn: true, // Fade-in enabled by default
    style: {
      fontSize: 32, // Increased from 24px to 32px for better readability
      fontColor: 'ffffff',
      outlineColor: '000000',
      outlineWidth: 2
    }
  };
}

/**
 * Validate subtitle settings - client-safe version
 */
export function validateSubtitleSettings(settings: SubtitleSettings): boolean {
  if (!settings.enabled) return true;
  
  const validPositions = ['bottom', 'top', 'center'];
  if (!validPositions.includes(settings.position)) {
    console.error(`❌ [Subtitles] Invalid position: ${settings.position}`);
    return false;
  }
  
  if (settings.style) {
    if (settings.style.fontSize < 12 || settings.style.fontSize > 72) {
      console.error(`❌ [Subtitles] Invalid font size: ${settings.style.fontSize}`);
      return false;
    }
  }
  
  return true;
}
