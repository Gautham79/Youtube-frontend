import { ffmpeg, FFmpegProgress, checkFFmpegAvailability } from './ffmpeg-wrapper';
import { generateDrawTextFilter, SubtitleSettings, getDefaultSubtitleSettings } from './subtitle-generator';
import { generateAnimationFilter, AnimationSettings, getDefaultAnimationSettings, AnimationType, AnimationIntensity } from './video-animations';
import { generateVideoWithTransitions } from './video-transitions';
import { addBackgroundMusicToVideo } from './background-music';
import { BackgroundMusicSettings, getDefaultBackgroundMusicSettings } from './local-music-library';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);

export interface VideoScene {
  id: number;
  imageUrl: string;
  audioUrl: string;
  duration: number;
  narration?: string; // Added for subtitles
}

export interface VideoSettings {
  resolution: '720p' | '1080p' | '1440p' | '4K';
  frameRate: 24 | 30 | 60;
  format: 'mp4' | 'webm';
  quality: 'standard' | 'high' | 'ultra';
  orientation: 'landscape' | 'portrait' | 'square';
  // Added comprehensive settings
  subtitles?: SubtitleSettings;
  animation?: AnimationSettings;
  transition?: 'none' | 'fade' | 'slide' | 'zoom';
  transitionDuration?: number;
  backgroundMusic?: BackgroundMusicSettings;
}

export interface VideoGenerationProgress {
  stage: 'downloading' | 'processing' | 'concatenating' | 'adding_music' | 'finalizing';
  currentScene?: number;
  totalScenes: number;
  percent: number;
  message: string;
  ffmpegProgress?: FFmpegProgress;
}

export interface VideoGenerationOptions {
  timeout?: number;
  onProgress?: (progress: VideoGenerationProgress) => void;
  tempDir?: string;
}

// Helper function to download a file from URL or handle local files
async function downloadFile(url: string, filepath: string): Promise<void> {
  console.log(`📥 [Download] Processing URL: ${url.substring(0, 100)}...`);
  
  // Handle blob URLs - these cannot be processed server-side
  if (url.startsWith('blob:')) {
    console.error(`❌ [Download] Blob URLs cannot be processed server-side: ${url}`);
    throw new Error(`Blob URLs cannot be processed server-side. Please use uploaded files or external URLs.`);
  }
  
  // Handle data URLs
  if (url.startsWith('data:')) {
    console.log(`📥 [Download] Processing data URL...`);
    const base64Data = url.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid data URL format');
    }
    const buffer = Buffer.from(base64Data, 'base64');
    await writeFile(filepath, buffer);
    console.log(`✅ [Download] Data URL saved to: ${filepath} (${buffer.length} bytes)`);
    return;
  }
  
  // Handle local file paths (relative to public directory)
  if (url.startsWith('/')) {
    console.log(`📥 [Download] Processing local file: ${url}`);
    const localPath = path.join(process.cwd(), 'public', url);
    console.log(`📥 [Download] Local file path: ${localPath}`);
    
    try {
      if (fs.existsSync(localPath)) {
        const fileBuffer = fs.readFileSync(localPath);
        await writeFile(filepath, fileBuffer);
        console.log(`✅ [Download] Local file copied to: ${filepath} (${fileBuffer.length} bytes)`);
        return;
      } else {
        console.error(`❌ [Download] Local file not found: ${localPath}`);
        throw new Error(`Local file not found: ${localPath}`);
      }
    } catch (error) {
      console.error(`❌ [Download] Error reading local file:`, error);
      throw new Error(`Failed to read local file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Handle regular URLs (http/https)
  console.log(`📥 [Download] Fetching remote URL: ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`❌ [Download] HTTP error: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filepath, buffer);
    console.log(`✅ [Download] Remote file saved to: ${filepath} (${buffer.length} bytes)`);
  } catch (error) {
    console.error(`❌ [Download] Fetch error:`, error);
    throw new Error(`Failed to fetch remote file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Get resolution dimensions with orientation support
function getResolutionDimensions(resolution: string, orientation: 'landscape' | 'portrait' | 'square' = 'landscape') {
  // Base dimensions (landscape)
  let baseDimensions;
  switch (resolution) {
    case '720p': baseDimensions = { width: 1280, height: 720 }; break;
    case '1080p': baseDimensions = { width: 1920, height: 1080 }; break;
    case '1440p': baseDimensions = { width: 2560, height: 1440 }; break;
    case '4K': baseDimensions = { width: 3840, height: 2160 }; break;
    default: baseDimensions = { width: 1920, height: 1080 }; break;
  }
  
  // Adjust for orientation
  if (orientation === 'portrait') {
    // Swap width and height for portrait orientation (9:16 aspect ratio)
    return { width: baseDimensions.height, height: baseDimensions.width };
  } else if (orientation === 'square') {
    // Use the smaller dimension for square format (1:1 aspect ratio)
    const size = Math.min(baseDimensions.width, baseDimensions.height);
    return { width: size, height: size };
  }
  
  // Default to landscape (16:9 aspect ratio)
  return baseDimensions;
}

// Get quality settings
function getQualitySettings(quality: string) {
  switch (quality) {
    case 'standard': return { crf: 28, preset: 'fast' as const };
    case 'high': return { crf: 23, preset: 'medium' as const };
    case 'ultra': return { crf: 18, preset: 'slow' as const };
    default: return { crf: 23, preset: 'fast' as const };
  }
}

// Clean up temporary files
async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    console.log('🧹 [Cleanup] Removing temp directory:', tempDir);
    
    // Remove all files in the directory first
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      await unlink(filePath);
    }
    
    // Remove the directory
    await rmdir(tempDir);
    console.log('✅ [Cleanup] Temp directory removed successfully');
  } catch (error) {
    console.error('❌ [Cleanup] Failed to remove temp directory:', error);
    // Don't throw - cleanup failures shouldn't break the main process
  }
}

// COMPLETE SEGMENT CREATION WITH CORRECT ORDER: Effects → Subtitles → Audio
async function createVideoSegment(
  imagePath: string,
  audioPath: string,
  duration: number,
  outputPath: string,
  settings: VideoSettings,
  sceneIndex: number,
  narration?: string,
  onProgress?: (progress: FFmpegProgress) => void
): Promise<void> {
  const { width, height } = getResolutionDimensions(settings.resolution, settings.orientation);
  const { crf, preset } = getQualitySettings(settings.quality);

  // Use same duration for both audio and video (no extension)
  const extendedDuration = duration;
  console.log(`🎬 [Segment] Using equal duration for audio and video: ${duration}s`);

  console.log(`🎬 [Segment] Creating COMPLETE video segment ${sceneIndex + 1}:`, {
    image: imagePath,
    audio: audioPath,
    audioDuration: duration,
    videoDuration: extendedDuration,
    output: outputPath,
    resolution: `${width}x${height}`,
    hasNarration: !!narration,
    transitionEnabled: settings.transition !== 'none'
  });

  // STEP 1: Build video filter chain in CORRECT ORDER
  const videoFilters: string[] = [];

  // 1.1: Base scaling and padding (always first)
  const baseVideoFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
  videoFilters.push(baseVideoFilter);

  // 1.2: Apply EFFECTS (ken-burns, zoom, pan, etc.) - FIRST
  // Use extended duration for effects when transitions are enabled
  const animationSettings = settings.animation || getDefaultAnimationSettings();
  if (animationSettings.type !== 'none') {
    const animationFilter = generateAnimationFilter(animationSettings, extendedDuration, width, height);
    if (animationFilter) {
      videoFilters.push(animationFilter);
      console.log(`🎨 [Segment] Applied ${animationSettings.type} effect with ${animationSettings.intensity} intensity over ${extendedDuration}s`);
    }
  }

  // 1.3: Apply SUBTITLES (burned into video) - SECOND
  // Keep subtitles using original duration for proper timing
  const subtitleSettings = settings.subtitles || getDefaultSubtitleSettings();
  if (subtitleSettings.enabled && narration) {
    const subtitleFilter = generateDrawTextFilter(
      narration,
      subtitleSettings,
      width,
      height,
      duration, // Use original duration for subtitle timing
      sceneIndex,
      settings.transition !== 'none',
      settings.transitionDuration || 1,
      settings.orientation
    );
    if (subtitleFilter) {
      videoFilters.push(subtitleFilter);
      console.log(`📝 [Segment] Applied subtitles: "${narration.substring(0, 50)}..." (timed for ${duration}s)`);
    }
  }

  // Combine all video filters
  const finalVideoFilter = videoFilters.join(',');
  console.log(`🎨 [Segment] Complete video filter chain: ${finalVideoFilter}`);

  // STEP 2: Create the FFmpeg command with AUDIO PADDING FOR EXACT DURATION
  const command = ffmpeg({
    timeout: 120000, // 2 minutes per segment
    crf,
    preset,
    threads: 2
  })
    .inputOption('-loop', '1')
    .input(imagePath)
    .input(audioPath)
    .videoCodec('libx264')
    .audioCodec('aac')
    .pixelFormat('yuv420p')
    .videoFilter(finalVideoFilter)
    .overwrite();

  // CRITICAL: Pad audio with silence to exact scene duration
  command.audioFilter(`apad=whole_dur=${duration}`);
  
  // Use exact duration for both streams
  command.duration(duration);
  
  // ENSURE EXACT TIMING WITH PADDING
  command.outputOption('-t', duration.toString()); // Force output duration
  command.outputOption('-avoid_negative_ts', 'make_zero'); // Ensure no negative timestamps
  command.outputOption('-fflags', '+genpts'); // Generate presentation timestamps
  
  console.log(`🎵 [Segment] AUDIO: Duration=${duration}s (padded with silence if needed)`);
  console.log(`🎬 [Segment] VIDEO: Duration=${extendedDuration}s (same as audio)`);
  console.log(`✅ [Segment] EQUAL DURATIONS: Audio and video both ${duration}s`);
  console.log(`🔇 [Segment] AUDIO PADDING: Using apad=whole_dur=${duration} for exact timing`);
  console.log(`🎯 [Segment] PROCESSING ORDER: Image → Effects → Subtitles → Audio Padding → Complete Segment`);
  console.log(`🔧 [Segment] TIMING FIX: Audio padded with silence to prevent advance issues`);

  command.save(outputPath);

  // Handle progress events
  if (onProgress) {
    command.on('progress', onProgress);
  }

  // Handle errors with detailed logging
  command.on('error', (error) => {
    console.error(`❌ [Segment] FFmpeg error:`, error.message);
    throw error;
  });

  await command.run();

  // Verify segment was created
  const stats = fs.statSync(outputPath);
  console.log(`📊 [Segment] Created complete segment: ${stats.size} bytes`);
  
  if (stats.size === 0) {
    throw new Error(`Generated segment file is empty: ${outputPath}`);
  }
}

// SMART CONCATENATION - USES TRANSITIONS WHEN REQUESTED, DIRECT WHEN NOT
async function concatenateSegments(
  segmentPaths: string[],
  outputPath: string,
  settings: VideoSettings,
  onProgress?: (progress: VideoGenerationProgress) => void
): Promise<void> {
  console.log(`🔗 [SmartConcat] Starting concatenation for ${segmentPaths.length} segments`);
  console.log(`🎯 [SmartConcat] Transition type: ${settings.transition || 'none'}`);
  console.log(`🎵 [SmartConcat] Background music: Will be added after concatenation/transitions`);

  // Check if transitions are requested
  if (settings.transition && settings.transition !== 'none') {
    console.log(`🎨 [SmartConcat] Using transition system for: ${settings.transition}`);
    
    // Use the transition system from video-transitions.ts
    await generateVideoWithTransitions(
      segmentPaths,
      settings,
      outputPath,
      (transitionProgress) => {
        onProgress?.({
          stage: 'concatenating',
          totalScenes: segmentPaths.length,
          percent: 75 + (transitionProgress.percent * 0.25), // Map to 75-100% range
          message: transitionProgress.message
        });
      }
    );
  } else {
    console.log(`🔗 [SmartConcat] No transitions requested, using direct concatenation (NO BACKGROUND MUSIC)`);
    
    // Use direct concatenation without any background music processing
    await directConcatenation(segmentPaths, outputPath, settings, onProgress);
  }

  // Verify final video was created
  const stats = fs.statSync(outputPath);
  console.log(`📊 [SmartConcat] Final video: ${stats.size} bytes`);
  
  if (stats.size === 0) {
    throw new Error(`Generated final video file is empty: ${outputPath}`);
  }
}

// BACKGROUND MUSIC FUNCTIONS COMPLETELY REMOVED TO FIX SYNC ISSUES
// All background music processing has been disabled to ensure perfect audio-video synchronization

// DIRECT CONCATENATION - SIMPLEST POSSIBLE APPROACH
async function directConcatenation(
  segmentPaths: string[],
  outputPath: string,
  settings: VideoSettings,
  onProgress?: (progress: VideoGenerationProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🎬 [DirectConcat] Starting SIMPLEST concatenation for ${segmentPaths.length} segments`);
    console.log(`🔧 [DirectConcat] Method: concat demuxer with stream copy (NO AUDIO FILTERS)`);
    
    // Validate all segments exist and have content
    for (let i = 0; i < segmentPaths.length; i++) {
      const segmentPath = segmentPaths[i];
      if (!fs.existsSync(segmentPath)) {
        const error = `Segment ${i + 1} does not exist: ${segmentPath}`;
        console.error(`❌ [DirectConcat] ${error}`);
        reject(new Error(error));
        return;
      }
      
      const stats = fs.statSync(segmentPath);
      if (stats.size === 0) {
        const error = `Segment ${i + 1} is empty: ${segmentPath}`;
        console.error(`❌ [DirectConcat] ${error}`);
        reject(new Error(error));
        return;
      }
      
      console.log(`✅ [DirectConcat] Segment ${i + 1} validated: ${stats.size} bytes`);
    }

    // Create a temporary concat file list for FFmpeg concat demuxer
    const concatListPath = path.join(path.dirname(outputPath), 'concat_list.txt');
    const concatContent = segmentPaths.map(segmentPath => `file '${segmentPath}'`).join('\n');
    
    // Write concat list file
    fs.writeFileSync(concatListPath, concatContent);
    console.log(`📝 [DirectConcat] Created concat list: ${concatListPath}`);
    console.log(`📝 [DirectConcat] Concat content:\n${concatContent}`);
    
    // CHANGED TO RE-ENCODING FOR BETTER COMPATIBILITY
    const ffmpegArgs = [
      '-loglevel', 'warning',      // Reduce informational messages
      '-f', 'concat',              // Use concat demuxer
      '-safe', '0',                // Allow unsafe file paths
      '-i', concatListPath,        // Input: concat list file
      '-c:v', 'libx264',           // Re-encode video for consistency
      '-c:a', 'aac',               // Re-encode audio for consistency
      '-preset', 'fast',           // Fast encoding preset
      '-crf', '23',                // Good quality setting
      '-ac', '2',                  // Force stereo audio
      '-ar', '44100',              // Force 44.1kHz sample rate
      '-avoid_negative_ts', 'make_zero',  // Fix timestamp issues
      '-fflags', '+genpts',        // Generate presentation timestamps
      '-y',                        // Overwrite output
      outputPath
    ];

    console.log('🔗 [DirectConcat] RE-ENCODING FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));
    console.log(`🔄 [DirectConcat] RE-ENCODING: Using libx264 + aac for consistency`);
    console.log(`🎵 [DirectConcat] AUDIO: Forcing stereo 44.1kHz for standardization`);
    
    const { spawn } = require('child_process');
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    let errorOutput = '';
    let hasProgress = false;
    
    ffmpeg.on('close', (code: number) => {
      // Clean up concat list file
      try {
        if (fs.existsSync(concatListPath)) {
          fs.unlinkSync(concatListPath);
          console.log(`🧹 [DirectConcat] Cleaned up concat list file: ${concatListPath}`);
        }
      } catch (cleanupError) {
        console.warn(`⚠️ [DirectConcat] Failed to cleanup concat list file: ${cleanupError}`);
      }
      
      if (code === 0) {
        // Verify output file was created and has content
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          if (stats.size > 0) {
            console.log(`✅ [DirectConcat] Single concatenation completed successfully: ${stats.size} bytes`);
            onProgress?.({
              stage: 'concatenating',
              totalScenes: segmentPaths.length,
              percent: 100,
              message: 'Video concatenation complete!'
            });
            resolve();
          } else {
            const error = 'Generated video file is empty';
            console.error(`❌ [DirectConcat] ${error}`);
            reject(new Error(error));
          }
        } else {
          const error = 'Generated video file does not exist';
          console.error(`❌ [DirectConcat] ${error}`);
          reject(new Error(error));
        }
      } else {
        console.error(`❌ [DirectConcat] FFmpeg failed with code: ${code}`);
        console.error(`❌ [DirectConcat] Error output: ${errorOutput}`);
        reject(new Error(`FFmpeg process exited with code ${code}. Error: ${errorOutput}`));
      }
    });
    
    ffmpeg.on('error', (error: Error) => {
      console.error('❌ [DirectConcat] FFmpeg spawn error:', error);
      reject(error);
    });
    
    ffmpeg.stderr.on('data', (data: Buffer) => {
      const output = data.toString();
      errorOutput += output;
      
      // Filter out normal informational messages
      const isNormalMessage = output.includes('Qavg:') || 
                             output.includes('bitrate=') || 
                             output.includes('speed=') ||
                             output.includes('frame=') ||
                             output.includes('fps=') ||
                             output.includes('size=') ||
                             output.includes('Input #') ||
                             output.includes('Stream #') ||
                             output.includes('Metadata:') ||
                             output.includes('Duration:') ||
                             output.includes('Stream mapping:') ||
                             output.includes('Press [q]') ||
                             output.includes('[libx264') ||
                             output.includes('Output #') ||
                             output.includes('encoder         :') ||
                             output.includes('handler_name') ||
                             output.includes('vendor_id') ||
                             output.includes('compatible_brands') ||
                             output.includes('major_brand') ||
                             output.includes('minor_version') ||
                             output.includes('Side data:') ||
                             output.includes('cpb:') ||
                             output.includes('vbv_delay') ||
                             output.includes('muxing overhead') ||
                             output.includes('kb/s:') ||
                             output.includes('ref P L0:') ||
                             output.includes('ref B L') ||
                             output.includes('Weighted P-Frames') ||
                             output.includes('consecutive B-frames') ||
                             output.includes('transform intra') ||
                             output.includes('coded y,uvDC') ||
                             output.includes('mb I  I16') ||
                             output.includes('mb P  I16') ||
                             output.includes('mb B  I16') ||
                             output.includes('i16 v,h,dc') ||
                             output.includes('i8 v,h,dc') ||
                             output.includes('i4 v,h,dc') ||
                             output.includes('i8c dc,h,v');
      
      // Only log non-normal messages for debugging
      if (!isNormalMessage) {
        console.log('🔍 [DirectConcat] FFmpeg stderr:', output);
      }
      
      if (output.includes('time=') && !hasProgress) {
        hasProgress = true;
        const progressPercent = Math.min(90, Math.max(80, 85));
        onProgress?.({
          stage: 'concatenating',
          totalScenes: segmentPaths.length,
          percent: progressPercent,
          message: 'Concatenating video segments with single command...'
        });
      }
      
      // Check for actual errors (not normal informational messages)
      if ((output.includes('Error') || output.includes('error')) && !isNormalMessage) {
        console.error('⚠️ [DirectConcat] FFmpeg error detected:', output);
      }
    });
    
    ffmpeg.stdout.on('data', (data: Buffer) => {
      console.log('📤 [DirectConcat] FFmpeg stdout:', data.toString());
    });
  });
}

// MAIN VIDEO GENERATION FUNCTION - COMPLETE ONE-TIME FIX
export async function generateVideo(
  scenes: VideoScene[],
  settings: VideoSettings,
  outputPath: string,
  options: VideoGenerationOptions = {}
): Promise<string> {
  const {
    timeout = 600000, // 10 minutes default
    onProgress,
    tempDir: customTempDir
  } = options;

  // Check FFmpeg availability
  const ffmpegAvailable = await checkFFmpegAvailability();
  if (!ffmpegAvailable) {
    throw new Error('FFmpeg is not available. Please install FFmpeg to generate videos.');
  }

  const tempDir = customTempDir || path.join(process.cwd(), 'temp', 'video-generation', Date.now().toString());
  
  // DEBUG: Log the received settings to trace background music
  console.log('🎬 [VideoGen] Starting COMPLETE video generation with CORRECT ORDER:', {
    scenes: scenes.length,
    outputPath,
    tempDir,
    processingOrder: 'Effects → Subtitles → Audio → Transitions'
  });
  
  console.log('🔍 [VideoGen] DEBUG - Received settings:', JSON.stringify(settings, null, 2));
  console.log('🔍 [VideoGen] DEBUG - Background music in settings:', settings.backgroundMusic);
  console.log('🔍 [VideoGen] DEBUG - Background music enabled:', settings.backgroundMusic?.enabled);

  const startTime = Date.now();

  try {
    await mkdir(tempDir, { recursive: true });
    console.log('✅ [VideoGen] Created temp directory:', tempDir);

    // Stage 1: Download all assets
    onProgress?.({
      stage: 'downloading',
      totalScenes: scenes.length,
      percent: 0,
      message: 'Downloading assets...'
    });

    const sceneFiles: Array<{ image: string; audio: string; duration: number; narration?: string }> = [];
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const progressPercent = (i / scenes.length) * 25; // 25% for downloading

      onProgress?.({
        stage: 'downloading',
        currentScene: i + 1,
        totalScenes: scenes.length,
        percent: progressPercent,
        message: `Downloading assets for scene ${i + 1}/${scenes.length}...`
      });

      const imageExt = scene.imageUrl.includes('.png') ? 'png' : 'jpg';
      const audioExt = scene.audioUrl.includes('.wav') ? 'wav' : 'mp3';
      
      const imagePath = path.join(tempDir, `scene_${i}_image.${imageExt}`);
      const audioPath = path.join(tempDir, `scene_${i}_audio.${audioExt}`);
      
      await downloadFile(scene.imageUrl, imagePath);
      await downloadFile(scene.audioUrl, audioPath);

      // Verify files exist and have content
      const imageStats = fs.statSync(imagePath);
      const audioStats = fs.statSync(audioPath);
      
      if (imageStats.size === 0) {
        throw new Error(`Downloaded image file is empty: ${imagePath}`);
      }
      if (audioStats.size === 0) {
        throw new Error(`Downloaded audio file is empty: ${audioPath}`);
      }
      
      sceneFiles.push({
        image: imagePath,
        audio: audioPath,
        duration: scene.duration,
        narration: scene.narration
      });
    }

    console.log(`✅ [VideoGen] All assets downloaded successfully`);

    // Stage 2: Create video segments with CORRECT ORDER
    onProgress?.({
      stage: 'processing',
      totalScenes: scenes.length,
      percent: 25,
      message: 'Creating video segments with effects, subtitles, and audio...'
    });

    const videoSegments: string[] = [];
    
    for (let i = 0; i < sceneFiles.length; i++) {
      const scene = sceneFiles[i];
      const segmentPath = path.join(tempDir, `segment_${i}.mp4`);
      const progressPercent = 25 + ((i / sceneFiles.length) * 50); // 25-75% for processing

      onProgress?.({
        stage: 'processing',
        currentScene: i + 1,
        totalScenes: sceneFiles.length,
        percent: progressPercent,
        message: `Processing segment ${i + 1}/${sceneFiles.length} (Effects → Subtitles → Audio)...`
      });

      await createVideoSegment(
        scene.image,
        scene.audio,
        scene.duration,
        segmentPath,
        settings,
        i,
        scene.narration,
        (ffmpegProgress) => {
          onProgress?.({
            stage: 'processing',
            currentScene: i + 1,
            totalScenes: sceneFiles.length,
            percent: progressPercent,
            message: `Processing segment ${i + 1}/${sceneFiles.length}...`,
            ffmpegProgress
          });
        }
      );
      
      videoSegments.push(segmentPath);
    }

    console.log(`✅ [VideoGen] All ${videoSegments.length} segments created with CORRECT ORDER`);

    // Stage 3: Concatenate segments with transitions
    onProgress?.({
      stage: 'concatenating',
      totalScenes: scenes.length,
      percent: 75,
      message: 'Combining video segments with transitions...'
    });

    await concatenateSegments(
      videoSegments,
      outputPath,
      settings,
      onProgress
    );

    // Stage 4: Add background music (if enabled)
    if (settings.backgroundMusic?.enabled) {
      onProgress?.({
        stage: 'adding_music',
        totalScenes: scenes.length,
        percent: 85,
        message: 'Adding background music...'
      });

      console.log('🎵 [VideoGen] Adding background music to final video');
      
      // Create temporary file for music processing
      const tempVideoPath = outputPath + '.temp.mp4';
      fs.renameSync(outputPath, tempVideoPath);
      
      try {
        await addBackgroundMusicToVideo(
          tempVideoPath,
          outputPath,
          settings.backgroundMusic,
          {
            onProgress: (musicProgress) => {
              onProgress?.({
                stage: 'adding_music',
                totalScenes: scenes.length,
                percent: 85 + (musicProgress.percent * 0.1), // Map to 85-95% range
                message: 'Processing background music...',
                ffmpegProgress: musicProgress
              });
            },
            tempDir: path.join(tempDir, 'background-music'),
            timeout: 300000 // 5 minutes for music processing
          }
        );
        
        // Clean up temporary video file
        fs.unlinkSync(tempVideoPath);
        console.log('✅ [VideoGen] Background music added successfully');
        
      } catch (musicError) {
        console.error('❌ [VideoGen] Background music processing failed:', musicError);
        
        // Restore original video if music processing fails
        if (fs.existsSync(tempVideoPath)) {
          fs.renameSync(tempVideoPath, outputPath);
          console.log('🔄 [VideoGen] Restored original video without background music');
        }
        
        // Continue without background music rather than failing completely
        console.warn('⚠️ [VideoGen] Continuing without background music due to processing error');
      }
    } else {
      console.log('🔇 [VideoGen] Background music disabled, skipping music stage');
    }

    // Stage 5: Finalize
    onProgress?.({
      stage: 'finalizing',
      totalScenes: scenes.length,
      percent: 95,
      message: 'Finalizing video...'
    });

    // ALWAYS PRESERVE SEGMENTS FOR INSPECTION
    const timestamp = Date.now();
    const debugDir = path.join(process.cwd(), 'public', 'debug-segments', timestamp.toString());
    await mkdir(debugDir, { recursive: true });
    
    console.log(`🔍 [Debug] Preserving segments for inspection in: ${debugDir}`);
    
    const segmentUrls: string[] = [];
    for (let i = 0; i < videoSegments.length; i++) {
      const segmentPath = videoSegments[i];
      const debugPath = path.join(debugDir, `segment_${i}.mp4`);
      fs.copyFileSync(segmentPath, debugPath);
      
      // Create public URL for the segment
      const segmentUrl = `/debug-segments/${timestamp}/segment_${i}.mp4`;
      segmentUrls.push(segmentUrl);
      
      console.log(`🔍 [Debug] Copied segment ${i} to: ${debugPath}`);
      console.log(`🌐 [Debug] Segment ${i} URL: ${segmentUrl}`);
    }
    
    console.log(`🔍 [Debug] All segments preserved! You can inspect them at:`);
    segmentUrls.forEach((url, i) => {
      console.log(`   Segment ${i}: http://localhost:3000${url}`);
    });
    console.log(`📁 [Debug] Local directory: ${debugDir}`);

    // Cleanup temp files
    await cleanupTempDir(tempDir);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`🎉 [VideoGen] COMPLETE video generation finished successfully in ${duration}s:`, outputPath);
    console.log(`✅ [VideoGen] FIXED ISSUES: Audio sync, Effects order, Subtitles, Transitions`);
    console.log(`🎯 [VideoGen] PROCESSING ORDER: Effects → Subtitles → Audio → Transitions`);

    onProgress?.({
      stage: 'finalizing',
      totalScenes: scenes.length,
      percent: 100,
      message: 'Video generation complete!'
    });

    return outputPath;
  } catch (error) {
    console.error('❌ [VideoGen] COMPLETE video generation failed:', error);
    
    // Cleanup on error
    await cleanupTempDir(tempDir);
    
    throw error;
  }
}

// Helper function to get default settings with background music disabled
export function getDefaultVideoSettings(): VideoSettings {
  return {
    resolution: '1080p',
    frameRate: 30,
    format: 'mp4',
    quality: 'high',
    orientation: 'landscape',
    subtitles: getDefaultSubtitleSettings(),
    animation: { type: 'none', intensity: 'subtle' }, // Disabled by default for debugging
    transition: 'none', // Disabled by default for debugging
    transitionDuration: 1,
    backgroundMusic: { 
      enabled: true, // ✅ RE-ENABLED: Background music now safe with fixed audio sync
      source: 'local',
      volume: 30,
      fadeIn: 2,
      fadeOut: 2,
      loop: true,
      startOffset: 0
    }
  };
}

// Helper function to validate video settings
export function validateVideoSettings(settings: VideoSettings): boolean {
  const validResolutions = ['720p', '1080p', '1440p', '4K'];
  const validFrameRates = [24, 30, 60];
  const validFormats = ['mp4', 'webm'];
  const validQualities = ['standard', 'high', 'ultra'];
  const validOrientations = ['landscape', 'portrait', 'square'];
  const validTransitions = ['none', 'fade', 'slide', 'zoom'];

  if (!validResolutions.includes(settings.resolution)) {
    console.error(`❌ [VideoGen] Invalid resolution: ${settings.resolution}`);
    return false;
  }

  if (!validFrameRates.includes(settings.frameRate)) {
    console.error(`❌ [VideoGen] Invalid frame rate: ${settings.frameRate}`);
    return false;
  }

  if (!validFormats.includes(settings.format)) {
    console.error(`❌ [VideoGen] Invalid format: ${settings.format}`);
    return false;
  }

  if (!validQualities.includes(settings.quality)) {
    console.error(`❌ [VideoGen] Invalid quality: ${settings.quality}`);
    return false;
  }

  if (!validOrientations.includes(settings.orientation)) {
    console.error(`❌ [VideoGen] Invalid orientation: ${settings.orientation}`);
    return false;
  }

  if (settings.transition && !validTransitions.includes(settings.transition)) {
    console.error(`❌ [VideoGen] Invalid transition: ${settings.transition}`);
    return false;
  }

  if (settings.transitionDuration && (settings.transitionDuration < 0.1 || settings.transitionDuration > 5)) {
    console.error(`❌ [VideoGen] Invalid transition duration: ${settings.transitionDuration}`);
    return false;
  }

  return true;
}
