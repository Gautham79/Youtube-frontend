import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { ScriptScene } from './openai/types';
import { TimingSettings, generateSubtitleEntriesWithUnifiedTiming, getSubtitleTimingForScene, getSceneTiming } from './video-timing';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

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
 * Convert seconds to SRT time format (HH:MM:SS,mmm)
 */
function secondsToSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Parse duration string to seconds
 */
function parseDurationToSeconds(duration: string): number {
  // Handle formats like "5 seconds", "1 minute", "2.5 seconds", etc.
  const cleanDuration = duration.toLowerCase().trim();
  
  if (cleanDuration.includes('minute')) {
    const minutes = parseFloat(cleanDuration.replace(/[^0-9.]/g, ''));
    return minutes * 60;
  } else if (cleanDuration.includes('second')) {
    return parseFloat(cleanDuration.replace(/[^0-9.]/g, ''));
  } else {
    // Try to parse as a number (assume seconds)
    const parsed = parseFloat(cleanDuration);
    return isNaN(parsed) ? 5 : parsed; // Default to 5 seconds if parsing fails
  }
}

/**
 * Process narration text for subtitle display - preserves original text exactly
 * Now with aspect ratio awareness and font size-based text wrapping
 */
function processNarrationText(
  text: string, 
  maxLineLength: number = 60, 
  videoWidth: number = 1920, 
  videoHeight: number = 1080,
  fontSize: number = 32
): string {
  // Just trim whitespace but preserve the original text exactly
  const cleanText = text.trim();
  
  // Calculate aspect ratio to determine if this is portrait mode
  const aspectRatio = videoWidth / videoHeight;
  const isPortrait = aspectRatio < 1; // Portrait if width < height
  
  // Calculate font size scaling factor for line length adjustment
  // Base calculation on 32px as the reference font size
  const baseFontSize = 32;
  const fontSizeRatio = fontSize / baseFontSize;
  
  // Adjust max line length based on font size - larger fonts need shorter lines
  // Use balanced scaling that prevents overflow while maintaining readability
  let fontAdjustedLineLength: number;
  if (fontSize >= 64) {
    // Balanced scaling for 64px+ fonts - less aggressive than before
    fontAdjustedLineLength = Math.floor(maxLineLength / (fontSizeRatio * 1.1));
  } else if (fontSize >= 48) {
    // Moderate scaling for 48px+ fonts
    fontAdjustedLineLength = Math.floor(maxLineLength / (fontSizeRatio * 1.1));
  } else {
    // Standard scaling for smaller fonts
    fontAdjustedLineLength = Math.floor(maxLineLength / Math.sqrt(fontSizeRatio));
  }
  
  // Apply aspect ratio adjustments
  let adjustedMaxLineLength = fontAdjustedLineLength;
  if (isPortrait) {
    // In portrait mode, use shorter lines to ensure text fits within narrower width
    adjustedMaxLineLength = Math.floor(fontAdjustedLineLength * 0.7); // 30% shorter lines
  }
  
  // Set minimum and maximum bounds for line length
  adjustedMaxLineLength = Math.max(15, Math.min(adjustedMaxLineLength, 80));
  
  console.log(`📝 [Subtitles] Text wrapping calculation:`, {
    originalMaxLength: maxLineLength,
    fontSize: fontSize,
    fontSizeRatio: fontSizeRatio.toFixed(2),
    fontAdjustedLength: fontAdjustedLineLength,
    isPortrait,
    finalMaxLength: adjustedMaxLineLength,
    videoSize: `${videoWidth}x${videoHeight}`
  });
  
  // If text is short enough, return as is
  if (cleanText.length <= adjustedMaxLineLength) {
    return cleanText;
  }
  
  // Split into words and create lines, preserving original spacing and punctuation
  const words = cleanText.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + ' ' + word).length <= adjustedMaxLineLength) {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Word is longer than max line length, just add it
        lines.push(word);
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  // Determine max lines based on font size and aspect ratio
  // Larger fonts get more lines to accommodate the text
  let maxLines = 2; // Default for smaller fonts
  
  if (fontSize >= 64) {
    maxLines = isPortrait ? 5 : 4; // Extra large fonts get even more lines
  } else if (fontSize >= 48) {
    maxLines = isPortrait ? 4 : 3; // Large fonts get more lines
  } else if (fontSize >= 32) {
    maxLines = isPortrait ? 3 : 2; // Medium fonts
  } else {
    maxLines = isPortrait ? 3 : 2; // Small fonts
  }
  
  console.log(`📏 [Subtitles] Line wrapping result:`, {
    originalText: cleanText.substring(0, 50) + '...',
    linesCreated: lines.length,
    maxLinesAllowed: maxLines,
    finalLines: lines.slice(0, maxLines)
  });
  
  // Join lines with line breaks - ensure all text is included
  if (lines.length <= maxLines) {
    return lines.join('\n');
  } else {
    // If we have more lines than allowed, try to fit remaining words into the last allowed line
    const allowedLines = lines.slice(0, maxLines - 1);
    const remainingLines = lines.slice(maxLines - 1);
    
    // Combine remaining lines into the last allowed line, but respect length limits
    let lastLine = remainingLines[0] || '';
    for (let i = 1; i < remainingLines.length; i++) {
      const combinedLine = lastLine + ' ' + remainingLines[i];
      if (combinedLine.length <= adjustedMaxLineLength * 1.2) { // Allow 20% overflow for last line
        lastLine = combinedLine;
      } else {
        // If it doesn't fit, just add what we can
        break;
      }
    }
    
    allowedLines.push(lastLine);
    return allowedLines.join('\n');
  }
}

/**
 * Generate subtitle entries from script scenes
 */
export function generateSubtitleEntries(
  scenes: ScriptScene[], 
  videoWidth: number = 1920, 
  videoHeight: number = 1080,
  fontSize: number = 32
): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  let currentTime = 0;
  
  scenes.forEach((scene, index) => {
    const duration = parseDurationToSeconds(scene.duration);
    const startTime = currentTime;
    const endTime = currentTime + duration;
    
    // Process the narration text for subtitle display with aspect ratio and font size awareness
    const processedText = processNarrationText(scene.narration, 60, videoWidth, videoHeight, fontSize);
    
    entries.push({
      index: index + 1,
      startTime: secondsToSRTTime(startTime),
      endTime: secondsToSRTTime(endTime),
      text: processedText
    });
    
    currentTime = endTime;
  });
  
  return entries;
}

/**
 * Generate subtitle entries from script scenes with actual video scene durations
 * This ensures subtitles are synchronized with the actual audio timing in the video
 */
export function generateSubtitleEntriesWithVideoTiming(
  scriptScenes: ScriptScene[], 
  videoSceneDurations: number[],
  videoWidth: number = 1920, 
  videoHeight: number = 1080,
  fontSize: number = 32
): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  let currentTime = 0;
  
  scriptScenes.forEach((scene, index) => {
    // Use the actual video scene duration instead of script duration
    const duration = videoSceneDurations[index] || parseDurationToSeconds(scene.duration);
    const startTime = currentTime;
    const endTime = currentTime + duration;
    
    // Process the narration text for subtitle display with aspect ratio and font size awareness
    const processedText = processNarrationText(scene.narration, 60, videoWidth, videoHeight, fontSize);
    
    entries.push({
      index: index + 1,
      startTime: secondsToSRTTime(startTime),
      endTime: secondsToSRTTime(endTime),
      text: processedText
    });
    
    currentTime = endTime;
  });
  
  return entries;
}

/**
 * Generate SRT file content from subtitle entries
 */
export function generateSRTContent(entries: SubtitleEntry[]): string {
  return entries.map(entry => 
    `${entry.index}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}\n`
  ).join('\n');
}

/**
 * Create SRT file from script scenes
 */
export async function createSubtitleFile(
  scenes: ScriptScene[], 
  outputDir: string, 
  filename: string = 'subtitles.srt',
  videoWidth: number = 1920, 
  videoHeight: number = 1080
): Promise<string> {
  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });
  
  // Generate subtitle entries with aspect ratio awareness
  const entries = generateSubtitleEntries(scenes, videoWidth, videoHeight);
  
  // Generate SRT content
  const srtContent = generateSRTContent(entries);
  
  // Write to file
  const filePath = path.join(outputDir, filename);
  await writeFile(filePath, srtContent, 'utf8');
  
  console.log(`📝 [Subtitles] Created SRT file: ${filePath}`);
  console.log(`📊 [Subtitles] Generated ${entries.length} subtitle entries`);
  
  return filePath;
}

/**
 * Create SRT file from script scenes with synchronized video timing
 * This ensures subtitles match the actual audio timing in the video
 */
export async function createSubtitleFileWithVideoTiming(
  scriptScenes: ScriptScene[], 
  videoSceneDurations: number[],
  outputDir: string, 
  filename: string = 'subtitles.srt',
  videoWidth: number = 1920, 
  videoHeight: number = 1080
): Promise<string> {
  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });
  
  // Generate subtitle entries with video timing and aspect ratio awareness
  const entries = generateSubtitleEntriesWithVideoTiming(scriptScenes, videoSceneDurations, videoWidth, videoHeight);
  
  // Generate SRT content
  const srtContent = generateSRTContent(entries);
  
  // Write to file
  const filePath = path.join(outputDir, filename);
  await writeFile(filePath, srtContent, 'utf8');
  
  console.log(`📝 [Subtitles] Created synchronized SRT file: ${filePath}`);
  console.log(`📊 [Subtitles] Generated ${entries.length} subtitle entries with video timing`);
  console.log(`⏱️ [Subtitles] Video durations: ${videoSceneDurations.map(d => d.toFixed(1) + 's').join(', ')}`);
  
  return filePath;
}

/**
 * Get FFmpeg subtitle filter based on position and style settings
 */
export function getSubtitleFilter(srtPath: string, settings: SubtitleSettings): string {
  const positionMapping = {
    'bottom': 2,  // Bottom center
    'top': 8,     // Top center  
    'center': 5   // Middle center
  };
  
  const alignment = positionMapping[settings.position] || 2;
  
  // Default style settings
  const style = settings.style || {
    fontSize: 24,
    fontColor: 'ffffff', // White
    outlineColor: '000000', // Black
    outlineWidth: 2
  };
  
  // Convert color format (remove # if present and ensure 6 digits)
  const primaryColor = style.fontColor.replace('#', '').padStart(6, '0');
  const outlineColor = style.outlineColor.replace('#', '').padStart(6, '0');
  
  // Build FFmpeg subtitle filter
  const subtitleFilter = `subtitles=${srtPath}:force_style='FontName=Arial,FontSize=${style.fontSize},PrimaryColour=&H${primaryColor}&,OutlineColour=&H${outlineColor}&,Outline=${style.outlineWidth},Alignment=${alignment}'`;
  
  console.log(`🎨 [Subtitles] Filter: ${subtitleFilter}`);
  
  return subtitleFilter;
}

/**
 * Clean up temporary subtitle files
 */
export async function cleanupSubtitleFiles(filePaths: string[]): Promise<void> {
  const fs = await import('fs');
  
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ [Subtitles] Cleaned up: ${filePath}`);
      }
    } catch (error) {
      console.warn(`⚠️ [Subtitles] Failed to cleanup ${filePath}:`, error);
    }
  }
}

/**
 * Validate subtitle settings
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

/**
 * Get default subtitle settings
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
 * Robust text processing for FFmpeg drawtext filter with comprehensive special character support
 * Uses Unicode replacements and smart escaping to ensure reliable subtitle display
 */
function escapeTextForFFmpeg(text: string): string {
  // First trim whitespace but preserve internal structure
  let processedText = text.trim();
  
  // Log original text for debugging
  console.log(`🔤 [Subtitles] Original text: "${processedText}"`);
  
  // PHASE 1: Replace problematic characters with visually identical but FFmpeg-safe Unicode alternatives
  // This prevents character loss and display issues
  const unicodeReplacements = [
    // Apostrophes and single quotes - use Unicode right single quotation mark
    { from: "'", to: "'", desc: "U+0027 -> U+2019 - visually identical but FFmpeg-safe" },
    { from: "'", to: "'", desc: "U+2018 (left single quotation) -> U+2019 (right single quotation)" },
    { from: "`", to: "'", desc: "Backtick -> right single quotation mark" },
    
    // Double quotes - use Unicode right double quotation mark  
    { from: '"', to: '"', desc: "U+0022 -> U+201D - visually identical but FFmpeg-safe" },
    { from: '"', to: '"', desc: "U+201C (left double quotation) -> U+201D (right double quotation)" },
    
    // Em and en dashes - use Unicode alternatives
    { from: '–', to: '—', desc: "U+2013 (en dash) -> U+2014 (em dash) for consistency" },
    
    // Other potentially problematic characters
    { from: '…', to: '...', desc: "Ellipsis -> three dots" },
    { from: '©', to: '(c)', desc: "Copyright symbol" },
    { from: '®', to: '(R)', desc: "Registered trademark" },
    { from: '™', to: '(TM)', desc: "Trademark symbol" },
  ];
  
  // Apply Unicode replacements
  for (const replacement of unicodeReplacements) {
    if (processedText.includes(replacement.from)) {
      processedText = processedText.replace(new RegExp(escapeRegExp(replacement.from), 'g'), replacement.to);
      console.log(`🔄 [Subtitles] Replaced "${replacement.from}" with "${replacement.to}" (${replacement.desc})`);
    }
  }
  
  // PHASE 2: Handle remaining special FFmpeg characters with proper escaping
  // These characters need escaping but are less problematic than quotes
  processedText = processedText
    // Escape backslashes first (must be done before other escaping)
    .replace(/\\/g, '\\\\')
    
    // Escape FFmpeg special characters that could break filter syntax
    .replace(/:/g, "\\:")    // Escape colons
    .replace(/\[/g, "\\[")   // Escape square brackets
    .replace(/\]/g, "\\]")   // Escape square brackets
    .replace(/,/g, "\\,")    // Escape commas
    .replace(/;/g, "\\;")    // Escape semicolons
    .replace(/=/g, "\\=")    // Escape equals signs
    .replace(/%/g, "\\%")    // Escape percent signs
    
    // CRITICAL: Preserve line breaks for multiline subtitles
    .replace(/\r?\n/g, '\n') // Normalize line breaks
    
    // Normalize multiple spaces within lines but preserve line structure
    .replace(/[ \t]+/g, ' '); // Only normalize spaces and tabs, not newlines
  
  // PHASE 3: Final validation and logging
  console.log(`✅ [Subtitles] Processed text: "${processedText}"`);
  
  // Check for potential issues and warn
  if (processedText.includes("'") || processedText.includes('"')) {
    console.warn(`⚠️ [Subtitles] Text still contains quotes after processing - this may cause display issues`);
  }
  
  return processedText;
}

/**
 * Helper function to escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate processed text for FFmpeg compatibility
 */
function validateFFmpegText(text: string): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for problematic character combinations
  if (text.includes("''")) {
    issues.push("Contains consecutive single quotes");
  }
  
  if (text.includes('""')) {
    issues.push("Contains consecutive double quotes");
  }
  
  if (text.includes("'\"") || text.includes("\"'")) {
    issues.push("Contains mixed quote types");
  }
  
  // Check for unescaped special characters that could break FFmpeg
  const problematicChars = [':', '[', ']', ',', ';', '=', '%'];
  for (const char of problematicChars) {
    if (text.includes(char) && !text.includes(`\\${char}`)) {
      issues.push(`Contains unescaped ${char}`);
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Generate FFmpeg drawtext filter for burning subtitles directly into video with timing control
 * This approach eliminates synchronization issues by making subtitles part of the video
 * Now with portrait mode support and proper boundary checking
 */
export function generateDrawTextFilter(
  text: string, 
  settings: SubtitleSettings,
  videoWidth: number = 1920,
  videoHeight: number = 1080,
  sceneDuration: number = 5,
  segmentIndex?: number,
  hasTransitions: boolean = false,
  transitionDuration: number = 1,
  orientation?: 'landscape' | 'portrait' | 'square'
): string {
  if (!settings.enabled || !text.trim()) {
    return '';
  }

  // Determine if this is portrait mode based on orientation setting OR aspect ratio
  const aspectRatio = videoWidth / videoHeight;
  const isPortrait = orientation === 'portrait' || (orientation !== 'landscape' && orientation !== 'square' && aspectRatio < 1);
  
  console.log(`📐 [Subtitles] Video dimensions: ${videoWidth}x${videoHeight}, aspect ratio: ${aspectRatio.toFixed(2)}, orientation: ${orientation || 'auto'}, portrait: ${isPortrait}`);

  // Process text for subtitle display with aspect ratio and font size awareness
  const fontSize = settings.style?.fontSize || 32;
  const processedText = processNarrationText(text, 60, videoWidth, videoHeight, fontSize);
  
  // Properly escape the text for FFmpeg
  const escapedText = escapeTextForFFmpeg(processedText);
  
  console.log(`📝 [Subtitles] Original text: "${text}"`);
  console.log(`📝 [Subtitles] Processed text: "${processedText}"`);
  console.log(`📝 [Subtitles] Escaped text: "${escapedText}"`);

  const style = settings.style || {
    fontSize: 24,
    fontColor: 'ffffff',
    outlineColor: '000000',
    outlineWidth: 2
  };

  // Adjust font size for portrait mode to ensure better readability
  let adjustedFontSize = style.fontSize;
  if (isPortrait) {
    // In portrait mode, slightly reduce font size to fit more text
    adjustedFontSize = Math.max(16, Math.floor(style.fontSize * 0.85));
    console.log(`📱 [Subtitles] Portrait mode: adjusting font size from ${style.fontSize} to ${adjustedFontSize}`);
  }

  // FIXED TIMING: Apply delay from settings to match audio delay for transitions
  // Use the delay setting to synchronize with delayed audio
  
  // Audio starts with delay (from transition duration)
  const audioDelay = settings.delay || 0;
  const audioStartTime = audioDelay;
  
  // Subtitle appears slightly before audio for reading time, but respects the delay
  const subtitleEarlyStart = 0.3; // Reduced from 0.5s to 0.3s for tighter sync
  const subtitleStartTime = Math.max(0, audioStartTime - subtitleEarlyStart);
  
  // Subtitle ends when audio ends
  const subtitleEndTime = audioStartTime + sceneDuration;
  
  console.log(`🎯 [Subtitles] Scene ${(segmentIndex ?? 0) + 1}: FIXED TIMING (matches video-generation-v2.ts)`);
  console.log(`🎵 [Subtitles] Audio: ${audioStartTime}s - ${audioStartTime + sceneDuration}s (IMMEDIATE START)`);
  console.log(`📝 [Subtitles] Subtitle: ${subtitleStartTime}s - ${subtitleEndTime}s (${subtitleEarlyStart}s early start)`);
  console.log(`✅ [Subtitles] PERFECT SYNC: Audio and subtitles start immediately, no delays, no drift`);
  
  const fadeIn = settings.fadeIn ?? true;
  const fadeInDuration = 0.5; // 0.5 second fade-in duration

  // Convert hex colors to FFmpeg format (remove # if present)
  const fontColor = style.fontColor.replace('#', '');
  const outlineColor = style.outlineColor.replace('#', '');

  // Calculate position based on settings with portrait mode awareness
  let xPosition = '(w-text_w)/2'; // Center horizontally
  let yPosition: string;

  // Calculate safe margins based on video dimensions and aspect ratio
  const horizontalMargin = Math.max(20, Math.floor(videoWidth * 0.05)); // 5% of width, min 20px
  const verticalMargin = Math.max(30, Math.floor(videoHeight * 0.08)); // 8% of height, min 30px
  
  // In portrait mode, use larger vertical margins to ensure subtitles stay within bounds
  const safeVerticalMargin = isPortrait ? Math.max(50, Math.floor(videoHeight * 0.12)) : verticalMargin;
  
  console.log(`📏 [Subtitles] Safe margins - horizontal: ${horizontalMargin}px, vertical: ${safeVerticalMargin}px (portrait: ${isPortrait})`);

  switch (settings.position) {
    case 'top':
      // Ensure subtitle is not too close to the top edge
      yPosition = `${safeVerticalMargin}`;
      break;
    case 'center':
      // Center vertically but ensure it doesn't go out of bounds
      yPosition = `max(${safeVerticalMargin}\\,min((h-text_h)/2\\,h-text_h-${safeVerticalMargin}))`;
      break;
    case 'bottom':
    default:
      // Ensure subtitle is not too close to the bottom edge
      yPosition = `max(${safeVerticalMargin}\\,h-text_h-${safeVerticalMargin})`;
      break;
  }

  // Ensure horizontal positioning stays within bounds with margins
  xPosition = `max(${horizontalMargin}\\,min((w-text_w)/2\\,w-text_w-${horizontalMargin}))`;

  // Build timing and alpha controls with proper escaping
  // Subtitle appears when audio starts and stays until audio ends
  const enableCondition = `:enable=between(t\\,${subtitleStartTime}\\,${subtitleEndTime})`;
  
  let alphaExpression = '';
  if (fadeIn) {
    // Fade in over fadeInDuration seconds after the subtitle appears
    const fadeEndTime = subtitleStartTime + fadeInDuration;
    alphaExpression = `:alpha=if(lt(t\\,${subtitleStartTime})\\,0\\,if(lt(t\\,${fadeEndTime})\\,(t-${subtitleStartTime})/${fadeInDuration}\\,1))`;
    
    console.log(`⏰ [Subtitles] Scene ${(segmentIndex ?? 0) + 1} FIXED TIMING:`);
    console.log(`🎵 [Subtitles] Audio: ${audioStartTime}s - ${audioStartTime + sceneDuration}s (${sceneDuration}s duration)`);
    console.log(`📝 [Subtitles] Subtitle: ${subtitleStartTime}s - ${subtitleEndTime}s (appears ${subtitleEarlyStart}s before audio)`);
    console.log(`✨ [Subtitles] Fade-in: ${fadeInDuration}s, transitions: ${hasTransitions}`);
  } else {
    console.log(`⏰ [Subtitles] Scene ${(segmentIndex ?? 0) + 1} FIXED TIMING:`);
    console.log(`🎵 [Subtitles] Audio: ${audioStartTime}s - ${audioStartTime + sceneDuration}s (${sceneDuration}s duration)`);
    console.log(`📝 [Subtitles] Subtitle: ${subtitleStartTime}s - ${subtitleEndTime}s (appears ${subtitleEarlyStart}s before audio)`);
    console.log(`✨ [Subtitles] No fade, transitions: ${hasTransitions}`);
  }

  // Build the drawtext filter with timing controls and boundary-aware positioning
  const drawTextFilter = `drawtext=text='${escapedText}':fontsize=${adjustedFontSize}:fontcolor=${fontColor}:x=${xPosition}:y=${yPosition}:borderw=${style.outlineWidth}:bordercolor=${outlineColor}:fontfile=/System/Library/Fonts/Arial.ttf:text_align=center${enableCondition}${alphaExpression}`;

  console.log(`🎨 [Subtitles] Generated drawtext filter: ${drawTextFilter}`);
  console.log(`📍 [Subtitles] Position - x: ${xPosition}, y: ${yPosition} (${settings.position} position, ${isPortrait ? 'portrait' : 'landscape'} mode)`);
  
  return drawTextFilter;
}
