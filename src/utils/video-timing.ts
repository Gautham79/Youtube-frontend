/**
 * Unified Video Timing System
 * 
 * This module provides centralized timing calculations for both audio and subtitle systems
 * to ensure perfect synchronization and prevent cumulative drift across scenes.
 */

export interface TimingSettings {
  hasTransitions: boolean;
  transitionDuration: number;
  subtitleDelay: number;
  subtitleEarlyStart?: number; // How early subtitles appear before audio
}

export interface SceneTimingInfo {
  sceneIndex: number;
  sceneDuration: number;
  
  // Global timeline positions (cumulative across all scenes)
  globalVideoStart: number;    // When this scene starts in the final video
  globalVideoEnd: number;      // When this scene ends in the final video
  
  // Audio timing within this scene
  audioStartTime: number;      // When audio starts within this scene
  audioEndTime: number;        // When audio ends within this scene
  
  // Subtitle timing within this scene  
  subtitleStartTime: number;   // When subtitle appears within this scene
  subtitleEndTime: number;     // When subtitle disappears within this scene
  
  // Global audio timing (for debugging)
  globalAudioStart: number;    // When audio starts in the final video
  globalAudioEnd: number;      // When audio ends in the final video
  
  // Global subtitle timing (for debugging)
  globalSubtitleStart: number; // When subtitle appears in the final video
  globalSubtitleEnd: number;   // When subtitle disappears in the final video
}

/**
 * Calculate unified timing for all scenes in a video
 * This ensures audio and subtitles are perfectly synchronized
 */
export function calculateVideoTiming(
  sceneDurations: number[],
  settings: TimingSettings
): SceneTimingInfo[] {
  const {
    hasTransitions,
    transitionDuration,
    subtitleDelay,
    subtitleEarlyStart = 0.5 // Default: subtitles appear 0.5s before audio
  } = settings;

  console.log(`⏰ [VideoTiming] Calculating unified timing for ${sceneDurations.length} scenes:`, {
    hasTransitions,
    transitionDuration,
    subtitleDelay,
    subtitleEarlyStart,
    sceneDurations
  });

  const sceneTimings: SceneTimingInfo[] = [];
  let globalVideoPosition = 0; // Tracks position in the final concatenated video

  for (let i = 0; i < sceneDurations.length; i++) {
    const sceneDuration = sceneDurations[i];
    const isFirstScene = i === 0;
    
    // Calculate extended scene duration for transitions
    let extendedSceneDuration = sceneDuration;
    if (hasTransitions) {
      // All scenes get extended duration for transition padding
      extendedSceneDuration = sceneDuration + (transitionDuration * 2);
    }

    // Calculate when audio starts within this scene
    let audioStartTime: number;
    if (hasTransitions) {
      if (isFirstScene) {
        // FIRST SCENE: Audio starts after transition + subtitle delay
        audioStartTime = transitionDuration + subtitleDelay;
      } else {
        // SUBSEQUENT SCENES: Audio starts after double transition + subtitle delay
        audioStartTime = (transitionDuration * 2) + subtitleDelay;
      }
    } else {
      // No transitions: audio starts after subtitle delay
      audioStartTime = subtitleDelay;
    }

    const audioEndTime = audioStartTime + sceneDuration;

    // Calculate subtitle timing (appears before audio for reading time)
    const subtitleStartTime = Math.max(0, audioStartTime - subtitleEarlyStart);
    const subtitleEndTime = audioEndTime; // Subtitle ends when audio ends

    // Calculate global positions
    const globalVideoStart = globalVideoPosition;
    const globalVideoEnd = globalVideoPosition + extendedSceneDuration;
    
    const globalAudioStart = globalVideoStart + audioStartTime;
    const globalAudioEnd = globalVideoStart + audioEndTime;
    
    const globalSubtitleStart = globalVideoStart + subtitleStartTime;
    const globalSubtitleEnd = globalVideoStart + subtitleEndTime;

    const timing: SceneTimingInfo = {
      sceneIndex: i,
      sceneDuration,
      globalVideoStart,
      globalVideoEnd,
      audioStartTime,
      audioEndTime,
      subtitleStartTime,
      subtitleEndTime,
      globalAudioStart,
      globalAudioEnd,
      globalSubtitleStart,
      globalSubtitleEnd
    };

    sceneTimings.push(timing);

    console.log(`⏰ [VideoTiming] Scene ${i + 1}/${sceneDurations.length}:`, {
      sceneDuration: `${sceneDuration}s`,
      extendedDuration: `${extendedSceneDuration}s`,
      audioWindow: `${audioStartTime}s - ${audioEndTime}s (within scene)`,
      subtitleWindow: `${subtitleStartTime}s - ${subtitleEndTime}s (within scene)`,
      globalAudio: `${globalAudioStart}s - ${globalAudioEnd}s (global timeline)`,
      globalSubtitle: `${globalSubtitleStart}s - ${globalSubtitleEnd}s (global timeline)`,
      videoPosition: `${globalVideoStart}s - ${globalVideoEnd}s`
    });

    // Move to next scene position
    globalVideoPosition = globalVideoEnd;
  }

  // Validation: Check for timing consistency
  console.log(`✅ [VideoTiming] Timing validation:`);
  for (let i = 0; i < sceneTimings.length; i++) {
    const timing = sceneTimings[i];
    const audioDuration = timing.audioEndTime - timing.audioStartTime;
    const expectedDuration = sceneDurations[i];
    
    if (Math.abs(audioDuration - expectedDuration) > 0.1) {
      console.warn(`⚠️ [VideoTiming] Scene ${i + 1} audio duration mismatch: expected ${expectedDuration}s, got ${audioDuration}s`);
    }
    
    // Check subtitle timing
    if (timing.subtitleStartTime > timing.audioStartTime) {
      console.warn(`⚠️ [VideoTiming] Scene ${i + 1} subtitle starts after audio (should start before)`);
    }
  }

  console.log(`🎯 [VideoTiming] Total video duration: ${globalVideoPosition}s`);
  console.log(`🎯 [VideoTiming] Audio-subtitle synchronization: UNIFIED`);

  return sceneTimings;
}

/**
 * Get timing for a specific scene
 */
export function getSceneTiming(
  sceneIndex: number,
  sceneDurations: number[],
  settings: TimingSettings
): SceneTimingInfo {
  const allTimings = calculateVideoTiming(sceneDurations, settings);
  const timing = allTimings[sceneIndex];
  
  if (!timing) {
    throw new Error(`Scene ${sceneIndex} not found in timing calculations`);
  }
  
  return timing;
}

/**
 * Convert timing info to FFmpeg audio delay format
 */
export function getAudioDelayForScene(timing: SceneTimingInfo): number {
  // Return delay in seconds for FFmpeg adelay filter
  return timing.audioStartTime;
}

/**
 * Convert timing info to subtitle timing format (for drawtext filter)
 */
export function getSubtitleTimingForScene(timing: SceneTimingInfo): {
  startTime: number;
  endTime: number;
  duration: number;
} {
  return {
    startTime: timing.subtitleStartTime,
    endTime: timing.subtitleEndTime,
    duration: timing.subtitleEndTime - timing.subtitleStartTime
  };
}

/**
 * Generate SRT timestamp from seconds
 */
export function secondsToSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Generate subtitle entries with unified timing
 */
export function generateSubtitleEntriesWithUnifiedTiming(
  sceneTexts: string[],
  sceneDurations: number[],
  settings: TimingSettings
): Array<{
  index: number;
  startTime: string;
  endTime: string;
  text: string;
  globalStart: number;
  globalEnd: number;
}> {
  const timings = calculateVideoTiming(sceneDurations, settings);
  
  return timings.map((timing, index) => ({
    index: index + 1,
    startTime: secondsToSRTTime(timing.globalSubtitleStart),
    endTime: secondsToSRTTime(timing.globalSubtitleEnd),
    text: sceneTexts[index] || '',
    globalStart: timing.globalSubtitleStart,
    globalEnd: timing.globalSubtitleEnd
  }));
}

/**
 * Debug function to log timing comparison
 */
export function debugTimingComparison(
  sceneDurations: number[],
  settings: TimingSettings
): void {
  console.log(`🔍 [VideoTiming] DEBUG: Timing Analysis`);
  console.log(`📊 [VideoTiming] Settings:`, settings);
  
  const timings = calculateVideoTiming(sceneDurations, settings);
  
  console.table(timings.map(t => ({
    Scene: t.sceneIndex + 1,
    Duration: `${t.sceneDuration}s`,
    'Audio Start': `${t.audioStartTime}s`,
    'Audio End': `${t.audioEndTime}s`,
    'Subtitle Start': `${t.subtitleStartTime}s`,
    'Subtitle End': `${t.subtitleEndTime}s`,
    'Global Audio': `${t.globalAudioStart}s-${t.globalAudioEnd}s`,
    'Global Subtitle': `${t.globalSubtitleStart}s-${t.globalSubtitleEnd}s`,
    'Sync Offset': `${(t.globalAudioStart - t.globalSubtitleStart).toFixed(2)}s`
  })));
}
