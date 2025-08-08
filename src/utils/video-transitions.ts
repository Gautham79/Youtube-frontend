import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { VideoScene, VideoSettings } from './video-generator';

export interface TransitionOptions {
  name: string;
  duration: number;
}

// Main function to generate video with transitions using direct FFmpeg
export async function generateVideoWithTransitions(
  segmentPaths: string[],
  settings: VideoSettings,
  outputPath: string,
  onProgress?: (progress: { percent: number; message: string }) => void
): Promise<string> {
  console.log('🎬 [VideoTransitions] Starting video generation with transitions:', {
    segments: segmentPaths.length,
    transition: settings.transition,
    duration: settings.transitionDuration
  });

  console.log('🔍 [VideoTransitions] DEBUGGING - Transition selection:', {
    'settings.transition': settings.transition,
    'typeof settings.transition': typeof settings.transition,
    'settings object': JSON.stringify(settings, null, 2)
  });

  // Handle different transition types
  switch (settings.transition) {
    case 'fade':
      console.log('✅ [VideoTransitions] Selected FADE transition');
      return await generateFadeTransition(segmentPaths, settings, outputPath, onProgress);
    case 'slide':
      console.log('✅ [VideoTransitions] Selected SLIDE transition');
      return await generateSlideTransition(segmentPaths, settings, outputPath, onProgress);
    case 'zoom':
      console.log('✅ [VideoTransitions] Selected ZOOM transition');
      return await generateZoomTransition(segmentPaths, settings, outputPath, onProgress);
    case 'none':
      console.log('✅ [VideoTransitions] Selected NONE transition');
      return await generateSimpleConcatenation(segmentPaths, outputPath, onProgress);
    default:
      console.log('⚠️ [VideoTransitions] Unknown transition, defaulting to simple concatenation:', settings.transition);
      return await generateSimpleConcatenation(segmentPaths, outputPath, onProgress);
  }
}

// Generate fade transition between segments
async function generateFadeTransition(
  segmentPaths: string[],
  settings: VideoSettings,
  outputPath: string,
  onProgress?: (progress: { percent: number; message: string }) => void
): Promise<string> {
  console.log('🎨 [FadeTransition] Generating fade transition');
  
  if (segmentPaths.length === 2) {
    // Simple case: two segments with crossfade
    return await generateTwoSegmentFadeTransition(segmentPaths, settings, outputPath, onProgress);
  } else if (segmentPaths.length > 2) {
    // Multiple segments: chain fade transitions
    return await generateMultiSegmentFadeTransition(segmentPaths, settings, outputPath, onProgress);
  } else {
    // Single segment: no transition needed
    return await generateSimpleConcatenation(segmentPaths, outputPath, onProgress);
  }
}

// Generate slide transition between segments
async function generateSlideTransition(
  segmentPaths: string[],
  settings: VideoSettings,
  outputPath: string,
  onProgress?: (progress: { percent: number; message: string }) => void
): Promise<string> {
  console.log(`🎨 [SlideTransition] Generating slide transition for ${segmentPaths.length} segments`);
  
  if (segmentPaths.length === 1) {
    // Single segment: no transition needed
    console.log('🎨 [SlideTransition] Single segment, using simple concatenation');
    return await generateSimpleConcatenation(segmentPaths, outputPath, onProgress);
  } else if (segmentPaths.length === 2) {
    // Two segments: use slide transition
    console.log('🎨 [SlideTransition] Two segments, applying slide transition');
    return await generateTwoSegmentSlideTransition(segmentPaths, settings, outputPath, onProgress);
  } else {
    // Multiple segments: chain slide transitions
    console.log('🎨 [SlideTransition] Multiple segments, chaining slide transitions');
    return await generateMultiSegmentSlideTransition(segmentPaths, settings, outputPath, onProgress);
  }
}

// Generate zoom transition between segments
async function generateZoomTransition(
  segmentPaths: string[],
  settings: VideoSettings,
  outputPath: string,
  onProgress?: (progress: { percent: number; message: string }) => void
): Promise<string> {
  console.log(`🎨 [ZoomTransition] Generating zoom transition for ${segmentPaths.length} segments`);
  
  if (segmentPaths.length === 1) {
    // Single segment: no transition needed
    console.log('🎨 [ZoomTransition] Single segment, using simple concatenation');
    return await generateSimpleConcatenation(segmentPaths, outputPath, onProgress);
  } else if (segmentPaths.length === 2) {
    // Two segments: use zoom transition
    console.log('🎨 [ZoomTransition] Two segments, applying zoom transition');
    return await generateTwoSegmentZoomTransition(segmentPaths, settings, outputPath, onProgress);
  } else {
    // Multiple segments: chain zoom transitions
    console.log('🎨 [ZoomTransition] Multiple segments, chaining zoom transitions');
    return await generateMultiSegmentZoomTransition(segmentPaths, settings, outputPath, onProgress);
  }
}

// Two-segment fade transition using xfade with proper offset calculation
async function generateTwoSegmentFadeTransition(
  segmentPaths: string[],
  settings: VideoSettings,
  outputPath: string,
  onProgress?: (progress: { percent: number; message: string }) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const duration = settings.transitionDuration || 1;
    
    console.log('🎨 [FadeTransition] Getting video duration for proper offset calculation');
    
    // First, get the duration of the first video to calculate proper offset
    const ffprobeArgs = ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', segmentPaths[0]];
    
    const ffprobe = spawn('ffprobe', ffprobeArgs);
    let firstVideoDuration = 0;
    
    ffprobe.stdout.on('data', (data: Buffer) => {
      const durationStr = data.toString().trim();
      firstVideoDuration = parseFloat(durationStr);
      console.log(`📏 [FadeTransition] First video duration: ${firstVideoDuration}s`);
    });
    
    ffprobe.on('close', (code: number) => {
      if (code !== 0) {
        console.warn('⚠️ [FadeTransition] Could not get video duration, using simple concatenation');
        // Fall back to simple concatenation if we can't get duration
        generateSimpleConcatenationForFade(segmentPaths, outputPath, onProgress)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      // Calculate offset: start transition BEFORE the first video ends to create overlap
      // This creates a proper crossfade effect
      const offset = Math.max(0, firstVideoDuration - duration);
      
      console.log(`🎨 [FadeTransition] Using offset: ${offset}s, duration: ${duration}s`);
      
      // FIXED: Properly concatenate audio streams to preserve all scenes
      const ffmpegArgs = [
        '-i', segmentPaths[0],
        '-i', segmentPaths[1],
        '-filter_complex', 
        `[0:v][1:v]xfade=transition=fade:duration=${duration}:offset=${offset}[v];[0:a][1:a]concat=n=2:v=0:a=1[a]`,
        '-map', '[v]',
        '-map', '[a]',  // Use concatenated audio stream
        '-c:v', 'libx264',
        '-c:a', 'aac',  // Re-encode audio to ensure compatibility
        '-preset', 'fast',
        '-pix_fmt', 'yuv420p',
        '-y',
        outputPath
      ];

      console.log('🎨 [FadeTransition] FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));
      
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      let hasProgress = false;
      let errorOutput = '';
      
      ffmpeg.on('close', (code: number) => {
        if (code === 0) {
          console.log('✅ [FadeTransition] Fade transition completed successfully');
          onProgress?.({ percent: 100, message: 'Fade transition complete!' });
          resolve(outputPath);
        } else {
          console.error('❌ [FadeTransition] FFmpeg failed with code:', code);
          console.error('❌ [FadeTransition] Error output:', errorOutput);
          reject(new Error(`FFmpeg process exited with code ${code}. Error: ${errorOutput}`));
        }
      });
      
      ffmpeg.on('error', (error: Error) => {
        console.error('❌ [FadeTransition] FFmpeg spawn error:', error);
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
          console.log('🔍 [FadeTransition] FFmpeg stderr:', output);
        }
        
        if (output.includes('time=') && !hasProgress) {
          hasProgress = true;
          onProgress?.({ percent: 50, message: 'Applying fade transition...' });
        }
        
        // Check for actual errors (not normal informational messages)
        if ((output.includes('Error') || output.includes('error')) && !isNormalMessage) {
          console.error('⚠️ [FadeTransition] FFmpeg error detected:', output);
        }
      });
      
      ffmpeg.stdout.on('data', (data: Buffer) => {
        console.log('📤 [FadeTransition] FFmpeg stdout:', data.toString());
      });
    });
    
    ffprobe.on('error', (error: Error) => {
      console.warn('⚠️ [FadeTransition] FFprobe error, falling back to simple concatenation:', error);
      // Fall back to simple concatenation if ffprobe fails
      generateSimpleConcatenationForFade(segmentPaths, outputPath, onProgress)
        .then(resolve)
        .catch(reject);
    });
  });
}

// Simple concatenation fallback for fade transitions
async function generateSimpleConcatenationForFade(
  segmentPaths: string[],
  outputPath: string,
  onProgress?: (progress: { percent: number; message: string }) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create concat file
    const tempDir = path.dirname(segmentPaths[0]);
    const concatFile = path.join(tempDir, 'concat_fade_fallback.txt');
    const concatContent = segmentPaths.map(segment => `file '${segment}'`).join('\n');
    
    fs.writeFileSync(concatFile, concatContent);
    
    const ffmpegArgs = [
      '-f', 'concat',
      '-safe', '0',
      '-i', concatFile,
      '-c', 'copy',
      '-y',
      outputPath
    ];

    console.log('🔗 [FadeTransition] Fallback concat command:', 'ffmpeg', ffmpegArgs.join(' '));
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    ffmpeg.on('close', (code: number) => {
      // Clean up concat file
      try {
        fs.unlinkSync(concatFile);
      } catch (e) {
        console.warn('⚠️ [FadeTransition] Could not clean up concat file:', e);
      }
      
      if (code === 0) {
        console.log('✅ [FadeTransition] Fallback concatenation completed successfully');
        onProgress?.({ percent: 100, message: 'Video concatenation complete!' });
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg process exited with code ${code}`));
      }
    });
    
    ffmpeg.on('error', (error: Error) => {
      console.error('❌ [FadeTransition] Fallback FFmpeg error:', error);
      reject(error);
    });
    
    ffmpeg.stderr.on('data', (data: Buffer) => {
      const output = data.toString();
      if (output.includes('time=')) {
        onProgress?.({ percent: 75, message: 'Concatenating video segments...' });
      }
    });
  });
}

// Two-segment slide transition with proper offset calculation
async function generateTwoSegmentSlideTransition(
  segmentPaths: string[],
  settings: VideoSettings,
  outputPath: string,
  onProgress?: (progress: { percent: number; message: string }) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const duration = settings.transitionDuration || 1;
    
    console.log('🎨 [SlideTransition] Getting video duration for proper offset calculation');
    
    // Get the duration of the first video to calculate proper offset
    const ffprobeArgs = ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', segmentPaths[0]];
    
    const ffprobe = spawn('ffprobe', ffprobeArgs);
    let firstVideoDuration = 0;
    
    ffprobe.stdout.on('data', (data: Buffer) => {
      const durationStr = data.toString().trim();
      firstVideoDuration = parseFloat(durationStr);
      console.log(`📏 [SlideTransition] First video duration: ${firstVideoDuration}s`);
    });
    
    ffprobe.on('close', (code: number) => {
      if (code !== 0) {
        console.warn('⚠️ [SlideTransition] Could not get video duration, using simple concatenation');
        generateSimpleConcatenationForFade(segmentPaths, outputPath, onProgress)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      // Calculate offset: start transition BEFORE the first video ends to create overlap
      // This creates a proper crossfade effect
      const offset = Math.max(0, firstVideoDuration - duration);
      
      console.log(`🎨 [SlideTransition] Using offset: ${offset}s, duration: ${duration}s`);
      
      // FIXED: Properly concatenate audio streams to preserve all scenes
      const ffmpegArgs = [
        '-i', segmentPaths[0],
        '-i', segmentPaths[1],
        '-filter_complex', 
        `[0:v][1:v]xfade=transition=slideleft:duration=${duration}:offset=${offset}[v];[0:a][1:a]concat=n=2:v=0:a=1[a]`,
        '-map', '[v]',
        '-map', '[a]',  // Use concatenated audio stream
        '-c:v', 'libx264',
        '-c:a', 'aac',  // Re-encode audio to ensure compatibility
        '-preset', 'fast',
        '-pix_fmt', 'yuv420p',
        '-y',
        outputPath
      ];

      console.log('🎨 [SlideTransition] FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));
      
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      let hasProgress = false;
      let errorOutput = '';
      
      ffmpeg.on('close', (code: number) => {
        if (code === 0) {
          console.log('✅ [SlideTransition] Slide transition completed successfully');
          onProgress?.({ percent: 100, message: 'Slide transition complete!' });
          resolve(outputPath);
        } else {
          console.error('❌ [SlideTransition] FFmpeg failed with code:', code);
          console.error('❌ [SlideTransition] Error output:', errorOutput);
          reject(new Error(`FFmpeg process exited with code ${code}. Error: ${errorOutput}`));
        }
      });
      
      ffmpeg.on('error', (error: Error) => {
        console.error('❌ [SlideTransition] FFmpeg spawn error:', error);
        reject(error);
      });
      
      ffmpeg.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        errorOutput += output;
        
        if (output.includes('time=') && !hasProgress) {
          hasProgress = true;
          onProgress?.({ percent: 50, message: 'Applying slide transition...' });
        }
        
        // Check for actual errors
        if (output.includes('Error') || output.includes('error')) {
          console.error('⚠️ [SlideTransition] FFmpeg error detected:', output);
        }
      });
    });
    
    ffprobe.on('error', (error: Error) => {
      console.warn('⚠️ [SlideTransition] FFprobe error, falling back to simple concatenation:', error);
      generateSimpleConcatenationForFade(segmentPaths, outputPath, onProgress)
        .then(resolve)
        .catch(reject);
    });
  });
}

// Two-segment zoom transition with proper offset calculation
async function generateTwoSegmentZoomTransition(
  segmentPaths: string[],
  settings: VideoSettings,
  outputPath: string,
  onProgress?: (progress: { percent: number; message: string }) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const duration = settings.transitionDuration || 1;
    
    console.log('🎨 [ZoomTransition] Getting video duration for proper offset calculation');
    
    // Get the duration of the first video to calculate proper offset
    const ffprobeArgs = ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', segmentPaths[0]];
    
    const ffprobe = spawn('ffprobe', ffprobeArgs);
    let firstVideoDuration = 0;
    
    ffprobe.stdout.on('data', (data: Buffer) => {
      const durationStr = data.toString().trim();
      firstVideoDuration = parseFloat(durationStr);
      console.log(`📏 [ZoomTransition] First video duration: ${firstVideoDuration}s`);
    });
    
    ffprobe.on('close', (code: number) => {
      if (code !== 0) {
        console.warn('⚠️ [ZoomTransition] Could not get video duration, using simple concatenation');
        generateSimpleConcatenationForFade(segmentPaths, outputPath, onProgress)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      // Calculate offset: start transition BEFORE the first video ends to create overlap
      // This creates a proper crossfade effect
      const offset = Math.max(0, firstVideoDuration - duration);
      
      console.log(`🎨 [ZoomTransition] Using offset: ${offset}s, duration: ${duration}s`);
      
      // FIXED: Properly concatenate audio streams to preserve all scenes
      const ffmpegArgs = [
        '-i', segmentPaths[0],
        '-i', segmentPaths[1],
        '-filter_complex', 
        `[0:v][1:v]xfade=transition=zoomin:duration=${duration}:offset=${offset}[v];[0:a][1:a]concat=n=2:v=0:a=1[a]`,
        '-map', '[v]',
        '-map', '[a]',  // Use concatenated audio stream
        '-c:v', 'libx264',
        '-c:a', 'aac',  // Re-encode audio to ensure compatibility
        '-preset', 'fast',
        '-pix_fmt', 'yuv420p',
        '-y',
        outputPath
      ];

      console.log('🎨 [ZoomTransition] FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));
      
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      let hasProgress = false;
      let errorOutput = '';
      
      ffmpeg.on('close', (code: number) => {
        if (code === 0) {
          console.log('✅ [ZoomTransition] Zoom transition completed successfully');
          onProgress?.({ percent: 100, message: 'Zoom transition complete!' });
          resolve(outputPath);
        } else {
          console.error('❌ [ZoomTransition] FFmpeg failed with code:', code);
          console.error('❌ [ZoomTransition] Error output:', errorOutput);
          reject(new Error(`FFmpeg process exited with code ${code}. Error: ${errorOutput}`));
        }
      });
      
      ffmpeg.on('error', (error: Error) => {
        console.error('❌ [ZoomTransition] FFmpeg spawn error:', error);
        reject(error);
      });
      
      ffmpeg.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        errorOutput += output;
        
        if (output.includes('time=') && !hasProgress) {
          hasProgress = true;
          onProgress?.({ percent: 50, message: 'Applying zoom transition...' });
        }
        
        // Check for actual errors
        if (output.includes('Error') || output.includes('error')) {
          console.error('⚠️ [ZoomTransition] FFmpeg error detected:', output);
        }
      });
    });
    
    ffprobe.on('error', (error: Error) => {
      console.warn('⚠️ [ZoomTransition] FFprobe error, falling back to simple concatenation:', error);
      generateSimpleConcatenationForFade(segmentPaths, outputPath, onProgress)
        .then(resolve)
        .catch(reject);
    });
  });
}

// Multi-segment fade transition - FIXED to handle all segments properly
async function generateMultiSegmentFadeTransition(
  segmentPaths: string[],
  settings: VideoSettings,
  outputPath: string,
  onProgress?: (progress: { percent: number; message: string }) => void
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    console.log('🎨 [MultiFadeTransition] FIXED: Building unified complex filter for all segments');
    
    const duration = settings.transitionDuration || 1;
    const numSegments = segmentPaths.length;
    
    // For 2 segments, use the proper two-segment fade transition function
    if (numSegments === 2) {
      console.log('🎨 [MultiFadeTransition] 2 segments detected, using proper two-segment transition');
      try {
        const result = await generateTwoSegmentFadeTransition(segmentPaths, settings, outputPath, onProgress);
        resolve(result);
      } catch (error) {
        reject(error);
      }
      return;
    }

    console.log(`🎨 [MultiFadeTransition] FIXED: Processing ${numSegments} segments with unified approach`);
    
    // Get durations of all segments first
    const segmentDurations: number[] = [];
    let totalProcessed = 0;
    
    for (const segmentPath of segmentPaths) {
      try {
        const { spawn } = require('child_process');
        const ffprobeArgs = ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', segmentPath];
        
        const duration = await new Promise<number>((resolveDuration, rejectDuration) => {
          const ffprobe = spawn('ffprobe', ffprobeArgs);
          let durationStr = '';
          
          ffprobe.stdout.on('data', (data: Buffer) => {
            durationStr += data.toString().trim();
          });
          
          ffprobe.on('close', (code: number) => {
            if (code === 0 && durationStr) {
              resolveDuration(parseFloat(durationStr));
            } else {
              rejectDuration(new Error(`Could not get duration for ${segmentPath}`));
            }
          });
          
          ffprobe.on('error', rejectDuration);
        });
        
        segmentDurations.push(duration);
        totalProcessed++;
        
        onProgress?.({ 
          percent: (totalProcessed / numSegments) * 20, 
          message: `Analyzing segment ${totalProcessed}/${numSegments}...` 
        });
        
      } catch (error) {
        console.warn(`⚠️ [MultiFadeTransition] Could not get duration for ${segmentPath}, falling back to concatenation`);
        const result = await generateReEncodedConcatenation(segmentPaths, outputPath, onProgress);
        resolve(result);
        return;
      }
    }
    
    console.log('📏 [MultiFadeTransition] Segment durations:', segmentDurations);
    
    // Build unified complex filter for all segments
    const videoFilters: string[] = [];
    const audioInputs: string[] = [];
    
    // Calculate cumulative offsets for transitions
    let cumulativeOffset = 0;
    
    // Build video transition chain
    let currentVideoLabel = '[0:v]';
    
    for (let i = 1; i < numSegments; i++) {
      const prevDuration = segmentDurations[i - 1];
      const offset = Math.max(0, cumulativeOffset + prevDuration - duration);
      
      const nextVideoLabel = i === numSegments - 1 ? '[v]' : `[v${i}]`;
      
      videoFilters.push(
        `${currentVideoLabel}[${i}:v]xfade=transition=fade:duration=${duration}:offset=${offset}${nextVideoLabel}`
      );
      
      currentVideoLabel = nextVideoLabel;
      cumulativeOffset += prevDuration - duration; // Account for overlap
      
      console.log(`🎨 [MultiFadeTransition] Transition ${i}: offset=${offset}s, duration=${duration}s`);
    }
    
    // FIXED: Build synchronized audio that matches video transition timing
    const audioFilters: string[] = [];
    let audioOffset = 0;
    
    // First audio segment starts at time 0
    audioFilters.push(`[0:a]adelay=0[a0]`);
    
    // Calculate audio delays to match video transition timing
    for (let i = 1; i < numSegments; i++) {
      const prevDuration = segmentDurations[i - 1];
      // Audio should start when the video transition begins (accounting for overlap)
      audioOffset += prevDuration - duration; // Subtract transition duration for overlap
      const audioDelayMs = Math.max(0, audioOffset * 1000); // Convert to milliseconds
      
      audioFilters.push(`[${i}:a]adelay=${audioDelayMs}[a${i}]`);
      console.log(`🎵 [MultiFadeTransition] Audio ${i}: delay=${audioDelayMs}ms (${audioOffset}s)`);
    }
    
    // Mix all delayed audio streams
    const delayedAudioInputs = Array.from({ length: numSegments }, (_, i) => `[a${i}]`).join('');
    const audioMixFilter = `${delayedAudioInputs}amix=inputs=${numSegments}:duration=longest[a]`;
    
    const videoFilterChain = videoFilters.join(';');
    const audioFilterChain = `${audioFilters.join(';')};${audioMixFilter}`;
    const complexFilter = `${videoFilterChain};${audioFilterChain}`;
    
    console.log(`🎨 [MultiFadeTransition] UNIFIED Complex filter: ${complexFilter}`);
    
    const { spawn } = require('child_process');
    const ffmpegArgs = [
      ...segmentPaths.flatMap(path => ['-i', path]),
      '-filter_complex', complexFilter,
      '-map', '[v]',
      '-map', '[a]',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'fast',
      '-pix_fmt', 'yuv420p',
      '-avoid_negative_ts', 'make_zero',
      '-fflags', '+genpts',
      '-y',
      outputPath
    ];

    console.log('🎨 [MultiFadeTransition] UNIFIED FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    let hasProgress = false;
    let errorOutput = '';
    
    ffmpeg.on('close', (code: number) => {
      if (code === 0) {
        console.log('✅ [MultiFadeTransition] FIXED: Multi-segment fade transition completed successfully');
        onProgress?.({ percent: 100, message: 'Multi-segment fade transition complete!' });
        resolve(outputPath);
      } else {
        console.error('❌ [MultiFadeTransition] FFmpeg failed with code:', code);
        console.error('❌ [MultiFadeTransition] Error output:', errorOutput);
        // Fall back to re-encoded concatenation
        console.log('🔄 [MultiFadeTransition] Falling back to re-encoded concatenation');
        generateReEncodedConcatenation(segmentPaths, outputPath, onProgress)
          .then(resolve)
          .catch(reject);
      }
    });
    
    ffmpeg.on('error', (error: Error) => {
      console.error('❌ [MultiFadeTransition] FFmpeg spawn error:', error);
      // Fall back to re-encoded concatenation
      generateReEncodedConcatenation(segmentPaths, outputPath, onProgress)
        .then(resolve)
        .catch(reject);
    });
    
    ffmpeg.stderr.on('data', (data: Buffer) => {
      const output = data.toString();
      errorOutput += output;
      
      if (output.includes('time=') && !hasProgress) {
        hasProgress = true;
        onProgress?.({ percent: 70, message: 'Applying unified multi-segment fade transitions...' });
      }
      
      // Check for actual errors
      if (output.includes('Error') || output.includes('error')) {
        console.error('⚠️ [MultiFadeTransition] FFmpeg error detected:', output);
      }
    });
  });
}

// Re-encoded concatenation to ensure all segments are properly included
async function generateReEncodedConcatenation(
  segmentPaths: string[],
  outputPath: string,
  onProgress?: (progress: { percent: number; message: string }) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`🔄 [ReEncodedConcat] Starting re-encoded concatenation for ${segmentPaths.length} segments`);
    
    // Validate all segments exist and have content
    for (let i = 0; i < segmentPaths.length; i++) {
      const segmentPath = segmentPaths[i];
      if (!fs.existsSync(segmentPath)) {
        const error = `Segment ${i + 1} does not exist: ${segmentPath}`;
        console.error(`❌ [ReEncodedConcat] ${error}`);
        reject(new Error(error));
        return;
      }
      
      const stats = fs.statSync(segmentPath);
      if (stats.size === 0) {
        const error = `Segment ${i + 1} is empty: ${segmentPath}`;
        console.error(`❌ [ReEncodedConcat] ${error}`);
        reject(new Error(error));
        return;
      }
      
      console.log(`✅ [ReEncodedConcat] Segment ${i + 1} validated: ${stats.size} bytes`);
    }

    // Create a temporary concat file list for FFmpeg concat demuxer
    const concatListPath = path.join(path.dirname(segmentPaths[0]), 'concat_list_reencoded.txt');
    const concatContent = segmentPaths.map(segmentPath => `file '${segmentPath}'`).join('\n');
    
    // Write concat list file
    fs.writeFileSync(concatListPath, concatContent);
    console.log(`📝 [ReEncodedConcat] Created concat list: ${concatListPath}`);
    console.log(`📝 [ReEncodedConcat] Concat content:\n${concatContent}`);
    
    // Use re-encoding to ensure compatibility and include all segments
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

    console.log('🔄 [ReEncodedConcat] Re-encoding FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));
    console.log(`🎯 [ReEncodedConcat] RE-ENCODING: Using libx264 + aac for guaranteed compatibility`);
    console.log(`🎵 [ReEncodedConcat] AUDIO: Forcing stereo 44.1kHz for standardization`);
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    let errorOutput = '';
    let hasProgress = false;
    
    ffmpeg.on('close', (code: number) => {
      // Clean up concat list file
      try {
        if (fs.existsSync(concatListPath)) {
          fs.unlinkSync(concatListPath);
          console.log(`🧹 [ReEncodedConcat] Cleaned up concat list file: ${concatListPath}`);
        }
      } catch (cleanupError) {
        console.warn(`⚠️ [ReEncodedConcat] Failed to cleanup concat list file: ${cleanupError}`);
      }
      
      if (code === 0) {
        // Verify output file was created and has content
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          if (stats.size > 0) {
            console.log(`✅ [ReEncodedConcat] Re-encoded concatenation completed successfully: ${stats.size} bytes`);
            onProgress?.({ percent: 100, message: 'Re-encoded video concatenation complete!' });
            resolve(outputPath);
          } else {
            const error = 'Generated video file is empty';
            console.error(`❌ [ReEncodedConcat] ${error}`);
            reject(new Error(error));
          }
        } else {
          const error = 'Generated video file does not exist';
          console.error(`❌ [ReEncodedConcat] ${error}`);
          reject(new Error(error));
        }
      } else {
        console.error(`❌ [ReEncodedConcat] FFmpeg failed with code: ${code}`);
        console.error(`❌ [ReEncodedConcat] Error output: ${errorOutput}`);
        reject(new Error(`FFmpeg process exited with code ${code}. Error: ${errorOutput}`));
      }
    });
    
    ffmpeg.on('error', (error: Error) => {
      console.error('❌ [ReEncodedConcat] FFmpeg spawn error:', error);
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
        console.log('🔍 [ReEncodedConcat] FFmpeg stderr:', output);
      }
      
      if (output.includes('time=') && !hasProgress) {
        hasProgress = true;
        const progressPercent = Math.min(90, Math.max(50, 70));
        onProgress?.({ percent: progressPercent, message: 'Re-encoding and concatenating video segments...' });
      }
      
      // Check for actual errors (not normal informational messages)
      if ((output.includes('Error') || output.includes('error')) && !isNormalMessage) {
        console.error('⚠️ [ReEncodedConcat] FFmpeg error detected:', output);
      }
    });
    
    ffmpeg.stdout.on('data', (data: Buffer) => {
      console.log('📤 [ReEncodedConcat] FFmpeg stdout:', data.toString());
    });
  });
}

// Multi-segment slide transition - FIXED to handle all segments properly
async function generateMultiSegmentSlideTransition(
  segmentPaths: string[],
  settings: VideoSettings,
  outputPath: string,
  onProgress?: (progress: { percent: number; message: string }) => void
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    console.log('🎨 [MultiSlideTransition] FIXED: Building unified complex filter for all segments');
    
    const duration = settings.transitionDuration || 1;
    const numSegments = segmentPaths.length;
    
    // For 2 segments, use the proper two-segment slide transition function
    if (numSegments === 2) {
      console.log('🎨 [MultiSlideTransition] 2 segments detected, using proper two-segment transition');
      try {
        const result = await generateTwoSegmentSlideTransition(segmentPaths, settings, outputPath, onProgress);
        resolve(result);
      } catch (error) {
        reject(error);
      }
      return;
    }

    console.log(`🎨 [MultiSlideTransition] FIXED: Processing ${numSegments} segments with unified approach`);
    
    // Get durations of all segments first
    const segmentDurations: number[] = [];
    let totalProcessed = 0;
    
    for (const segmentPath of segmentPaths) {
      try {
        const { spawn } = require('child_process');
        const ffprobeArgs = ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', segmentPath];
        
        const duration = await new Promise<number>((resolveDuration, rejectDuration) => {
          const ffprobe = spawn('ffprobe', ffprobeArgs);
          let durationStr = '';
          
          ffprobe.stdout.on('data', (data: Buffer) => {
            durationStr += data.toString().trim();
          });
          
          ffprobe.on('close', (code: number) => {
            if (code === 0 && durationStr) {
              resolveDuration(parseFloat(durationStr));
            } else {
              rejectDuration(new Error(`Could not get duration for ${segmentPath}`));
            }
          });
          
          ffprobe.on('error', rejectDuration);
        });
        
        segmentDurations.push(duration);
        totalProcessed++;
        
        onProgress?.({ 
          percent: (totalProcessed / numSegments) * 20, 
          message: `Analyzing segment ${totalProcessed}/${numSegments}...` 
        });
        
      } catch (error) {
        console.warn(`⚠️ [MultiSlideTransition] Could not get duration for ${segmentPath}, falling back to concatenation`);
        const result = await generateReEncodedConcatenation(segmentPaths, outputPath, onProgress);
        resolve(result);
        return;
      }
    }
    
    console.log('📏 [MultiSlideTransition] Segment durations:', segmentDurations);
    
    // Build unified complex filter for all segments
    const videoFilters: string[] = [];
    const audioInputs: string[] = [];
    
    // Calculate cumulative offsets for transitions
    let cumulativeOffset = 0;
    
    // Build video transition chain
    let currentVideoLabel = '[0:v]';
    
    for (let i = 1; i < numSegments; i++) {
      const prevDuration = segmentDurations[i - 1];
      const offset = Math.max(0, cumulativeOffset + prevDuration - duration);
      
      const nextVideoLabel = i === numSegments - 1 ? '[v]' : `[v${i}]`;
      
      videoFilters.push(
        `${currentVideoLabel}[${i}:v]xfade=transition=slideleft:duration=${duration}:offset=${offset}${nextVideoLabel}`
      );
      
      currentVideoLabel = nextVideoLabel;
      cumulativeOffset += prevDuration - duration; // Account for overlap
      
      console.log(`🎨 [MultiSlideTransition] Transition ${i}: offset=${offset}s, duration=${duration}s`);
    }
    
    // FIXED: Build synchronized audio that matches video transition timing
    const audioFilters: string[] = [];
    let audioOffset = 0;
    
    // First audio segment starts at time 0
    audioFilters.push(`[0:a]adelay=0[a0]`);
    
    // Calculate audio delays to match video transition timing
    for (let i = 1; i < numSegments; i++) {
      const prevDuration = segmentDurations[i - 1];
      // Audio should start when the video transition begins (accounting for overlap)
      audioOffset += prevDuration - duration; // Subtract transition duration for overlap
      const audioDelayMs = Math.max(0, audioOffset * 1000); // Convert to milliseconds
      
      audioFilters.push(`[${i}:a]adelay=${audioDelayMs}[a${i}]`);
      console.log(`🎵 [MultiSlideTransition] Audio ${i}: delay=${audioDelayMs}ms (${audioOffset}s)`);
    }
    
    // Mix all delayed audio streams
    const delayedAudioInputs = Array.from({ length: numSegments }, (_, i) => `[a${i}]`).join('');
    const audioMixFilter = `${delayedAudioInputs}amix=inputs=${numSegments}:duration=longest[a]`;
    
    const videoFilterChain = videoFilters.join(';');
    const audioFilterChain = `${audioFilters.join(';')};${audioMixFilter}`;
    const complexFilter = `${videoFilterChain};${audioFilterChain}`;
    
    console.log(`🎨 [MultiSlideTransition] UNIFIED Complex filter: ${complexFilter}`);
    
    const { spawn } = require('child_process');
    const ffmpegArgs = [
      ...segmentPaths.flatMap(path => ['-i', path]),
      '-filter_complex', complexFilter,
      '-map', '[v]',
      '-map', '[a]',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'fast',
      '-pix_fmt', 'yuv420p',
      '-avoid_negative_ts', 'make_zero',
      '-fflags', '+genpts',
      '-y',
      outputPath
    ];

    console.log('🎨 [MultiSlideTransition] UNIFIED FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    let hasProgress = false;
    let errorOutput = '';
    
    ffmpeg.on('close', (code: number) => {
      if (code === 0) {
        console.log('✅ [MultiSlideTransition] FIXED: Multi-segment slide transition completed successfully');
        onProgress?.({ percent: 100, message: 'Multi-segment slide transition complete!' });
        resolve(outputPath);
      } else {
        console.error('❌ [MultiSlideTransition] FFmpeg failed with code:', code);
        console.error('❌ [MultiSlideTransition] Error output:', errorOutput);
        // Fall back to re-encoded concatenation
        console.log('🔄 [MultiSlideTransition] Falling back to re-encoded concatenation');
        generateReEncodedConcatenation(segmentPaths, outputPath, onProgress)
          .then(resolve)
          .catch(reject);
      }
    });
    
    ffmpeg.on('error', (error: Error) => {
      console.error('❌ [MultiSlideTransition] FFmpeg spawn error:', error);
      // Fall back to re-encoded concatenation
      generateReEncodedConcatenation(segmentPaths, outputPath, onProgress)
        .then(resolve)
        .catch(reject);
    });
    
    ffmpeg.stderr.on('data', (data: Buffer) => {
      const output = data.toString();
      errorOutput += output;
      
      if (output.includes('time=') && !hasProgress) {
        hasProgress = true;
        onProgress?.({ percent: 70, message: 'Applying unified multi-segment slide transitions...' });
      }
      
      // Check for actual errors
      if (output.includes('Error') || output.includes('error')) {
        console.error('⚠️ [MultiSlideTransition] FFmpeg error detected:', output);
      }
    });
  });
}

// Multi-segment zoom transition - FIXED to handle all segments properly
async function generateMultiSegmentZoomTransition(
  segmentPaths: string[],
  settings: VideoSettings,
  outputPath: string,
  onProgress?: (progress: { percent: number; message: string }) => void
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    console.log('🎨 [MultiZoomTransition] FIXED: Building unified complex filter for all segments');
    
    const duration = settings.transitionDuration || 1;
    const numSegments = segmentPaths.length;
    
    // For 2 segments, use the proper two-segment zoom transition function
    if (numSegments === 2) {
      console.log('🎨 [MultiZoomTransition] 2 segments detected, using proper two-segment transition');
      try {
        const result = await generateTwoSegmentZoomTransition(segmentPaths, settings, outputPath, onProgress);
        resolve(result);
      } catch (error) {
        reject(error);
      }
      return;
    }

    console.log(`🎨 [MultiZoomTransition] FIXED: Processing ${numSegments} segments with unified approach`);
    
    // Get durations of all segments first
    const segmentDurations: number[] = [];
    let totalProcessed = 0;
    
    for (const segmentPath of segmentPaths) {
      try {
        const { spawn } = require('child_process');
        const ffprobeArgs = ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', segmentPath];
        
        const duration = await new Promise<number>((resolveDuration, rejectDuration) => {
          const ffprobe = spawn('ffprobe', ffprobeArgs);
          let durationStr = '';
          
          ffprobe.stdout.on('data', (data: Buffer) => {
            durationStr += data.toString().trim();
          });
          
          ffprobe.on('close', (code: number) => {
            if (code === 0 && durationStr) {
              resolveDuration(parseFloat(durationStr));
            } else {
              rejectDuration(new Error(`Could not get duration for ${segmentPath}`));
            }
          });
          
          ffprobe.on('error', rejectDuration);
        });
        
        segmentDurations.push(duration);
        totalProcessed++;
        
        onProgress?.({ 
          percent: (totalProcessed / numSegments) * 20, 
          message: `Analyzing segment ${totalProcessed}/${numSegments}...` 
        });
        
      } catch (error) {
        console.warn(`⚠️ [MultiZoomTransition] Could not get duration for ${segmentPath}, falling back to concatenation`);
        const result = await generateReEncodedConcatenation(segmentPaths, outputPath, onProgress);
        resolve(result);
        return;
      }
    }
    
    console.log('📏 [MultiZoomTransition] Segment durations:', segmentDurations);
    
    // Build unified complex filter for all segments
    const videoFilters: string[] = [];
    const audioInputs: string[] = [];
    
    // Calculate cumulative offsets for transitions
    let cumulativeOffset = 0;
    
    // Build video transition chain
    let currentVideoLabel = '[0:v]';
    
    for (let i = 1; i < numSegments; i++) {
      const prevDuration = segmentDurations[i - 1];
      const offset = Math.max(0, cumulativeOffset + prevDuration - duration);
      
      const nextVideoLabel = i === numSegments - 1 ? '[v]' : `[v${i}]`;
      
      videoFilters.push(
        `${currentVideoLabel}[${i}:v]xfade=transition=zoomin:duration=${duration}:offset=${offset}${nextVideoLabel}`
      );
      
      currentVideoLabel = nextVideoLabel;
      cumulativeOffset += prevDuration - duration; // Account for overlap
      
      console.log(`🎨 [MultiZoomTransition] Transition ${i}: offset=${offset}s, duration=${duration}s`);
    }
    
    // FIXED: Build synchronized audio that matches video transition timing
    const audioFilters: string[] = [];
    let audioOffset = 0;
    
    // First audio segment starts at time 0
    audioFilters.push(`[0:a]adelay=0[a0]`);
    
    // Calculate audio delays to match video transition timing
    for (let i = 1; i < numSegments; i++) {
      const prevDuration = segmentDurations[i - 1];
      // Audio should start when the video transition begins (accounting for overlap)
      audioOffset += prevDuration - duration; // Subtract transition duration for overlap
      const audioDelayMs = Math.max(0, audioOffset * 1000); // Convert to milliseconds
      
      audioFilters.push(`[${i}:a]adelay=${audioDelayMs}[a${i}]`);
      console.log(`🎵 [MultiZoomTransition] Audio ${i}: delay=${audioDelayMs}ms (${audioOffset}s)`);
    }
    
    // Mix all delayed audio streams
    const delayedAudioInputs = Array.from({ length: numSegments }, (_, i) => `[a${i}]`).join('');
    const audioMixFilter = `${delayedAudioInputs}amix=inputs=${numSegments}:duration=longest[a]`;
    
    const videoFilterChain = videoFilters.join(';');
    const audioFilterChain = `${audioFilters.join(';')};${audioMixFilter}`;
    const complexFilter = `${videoFilterChain};${audioFilterChain}`;
    
    console.log(`🎨 [MultiZoomTransition] UNIFIED Complex filter: ${complexFilter}`);
    
    const { spawn } = require('child_process');
    const ffmpegArgs = [
      ...segmentPaths.flatMap(path => ['-i', path]),
      '-filter_complex', complexFilter,
      '-map', '[v]',
      '-map', '[a]',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'fast',
      '-pix_fmt', 'yuv420p',
      '-avoid_negative_ts', 'make_zero',
      '-fflags', '+genpts',
      '-y',
      outputPath
    ];

    console.log('🎨 [MultiZoomTransition] UNIFIED FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    let hasProgress = false;
    let errorOutput = '';
    
    ffmpeg.on('close', (code: number) => {
      if (code === 0) {
        console.log('✅ [MultiZoomTransition] FIXED: Multi-segment zoom transition completed successfully');
        onProgress?.({ percent: 100, message: 'Multi-segment zoom transition complete!' });
        resolve(outputPath);
      } else {
        console.error('❌ [MultiZoomTransition] FFmpeg failed with code:', code);
        console.error('❌ [MultiZoomTransition] Error output:', errorOutput);
        // Fall back to re-encoded concatenation
        console.log('🔄 [MultiZoomTransition] Falling back to re-encoded concatenation');
        generateReEncodedConcatenation(segmentPaths, outputPath, onProgress)
          .then(resolve)
          .catch(reject);
      }
    });
    
    ffmpeg.on('error', (error: Error) => {
      console.error('❌ [MultiZoomTransition] FFmpeg spawn error:', error);
      // Fall back to re-encoded concatenation
      generateReEncodedConcatenation(segmentPaths, outputPath, onProgress)
        .then(resolve)
        .catch(reject);
    });
    
    ffmpeg.stderr.on('data', (data: Buffer) => {
      const output = data.toString();
      errorOutput += output;
      
      if (output.includes('time=') && !hasProgress) {
        hasProgress = true;
        onProgress?.({ percent: 70, message: 'Applying unified multi-segment zoom transitions...' });
      }
      
      // Check for actual errors
      if (output.includes('Error') || output.includes('error')) {
        console.error('⚠️ [MultiZoomTransition] FFmpeg error detected:', output);
      }
    });
  });
}

// Get resolution dimensions
function getResolutionDimensions(resolution: string) {
  switch (resolution) {
    case '720p': return { width: 1280, height: 720 };
    case '1080p': return { width: 1920, height: 1080 };
    case '1440p': return { width: 2560, height: 1440 };
    case '4K': return { width: 3840, height: 2160 };
    default: return { width: 1920, height: 1080 };
  }
}

// Get video bitrate based on quality
function getVideoBitrate(quality: string): string {
  switch (quality) {
    case 'standard': return '1000k';
    case 'high': return '2000k';
    case 'ultra': return '4000k';
    default: return '2000k';
  }
}

// Simple concatenation fallback with proper re-encoding to fix stream compatibility issues
async function generateSimpleConcatenation(
  segmentPaths: string[],
  outputPath: string,
  onProgress?: (progress: { percent: number; message: string }) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`🔗 [SimpleTransitions] Starting robust concatenation for ${segmentPaths.length} segments`);
    
    // Validate all segments exist and have content
    for (let i = 0; i < segmentPaths.length; i++) {
      const segmentPath = segmentPaths[i];
      if (!fs.existsSync(segmentPath)) {
        const error = `Segment ${i + 1} does not exist: ${segmentPath}`;
        console.error(`❌ [SimpleTransitions] ${error}`);
        reject(new Error(error));
        return;
      }
      
      const stats = fs.statSync(segmentPath);
      if (stats.size === 0) {
        const error = `Segment ${i + 1} is empty: ${segmentPath}`;
        console.error(`❌ [SimpleTransitions] ${error}`);
        reject(new Error(error));
        return;
      }
      
      console.log(`✅ [SimpleTransitions] Segment ${i + 1} validated: ${stats.size} bytes`);
    }

    // REVERTED TO SIMPLE CONCAT DEMUXER - NO BACKGROUND MUSIC PROCESSING
    // Create a temporary concat file list for FFmpeg concat demuxer
    const concatListPath = path.join(path.dirname(segmentPaths[0]), 'concat_list_transitions.txt');
    const concatContent = segmentPaths.map(segmentPath => `file '${segmentPath}'`).join('\n');
    
    // Write concat list file
    fs.writeFileSync(concatListPath, concatContent);
    console.log(`📝 [SimpleTransitions] Created concat list: ${concatListPath}`);
    console.log(`📝 [SimpleTransitions] Concat content:\n${concatContent}`);
    
    const ffmpegArgs = [
      '-loglevel', 'warning',      // Reduce informational messages
      '-f', 'concat',              // Use concat demuxer
      '-safe', '0',                // Allow unsafe file paths
      '-i', concatListPath,        // Input: concat list file
      '-c', 'copy',                // ✅ PURE STREAM COPY - No re-encoding at all
      '-avoid_negative_ts', 'make_zero',  // Fix timestamp issues
      '-fflags', '+genpts',        // Generate presentation timestamps
      '-y',                        // Overwrite output
      outputPath
    ];

    console.log('🔗 [SimpleTransitions] REVERTED FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));
    console.log(`✅ [SimpleTransitions] NO AUDIO FILTERS: Using pure stream copy concatenation`);
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    let errorOutput = '';
    let hasProgress = false;
    
    ffmpeg.on('close', (code: number) => {
      if (code === 0) {
        // Verify output file was created and has content
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          if (stats.size > 0) {
            console.log(`✅ [SimpleTransitions] Robust concatenation completed successfully: ${stats.size} bytes`);
            onProgress?.({ percent: 100, message: 'Video concatenation complete!' });
            resolve(outputPath);
          } else {
            const error = 'Generated video file is empty';
            console.error(`❌ [SimpleTransitions] ${error}`);
            reject(new Error(error));
          }
        } else {
          const error = 'Generated video file does not exist';
          console.error(`❌ [SimpleTransitions] ${error}`);
          reject(new Error(error));
        }
      } else {
        console.error(`❌ [SimpleTransitions] FFmpeg failed with code: ${code}`);
        console.error(`❌ [SimpleTransitions] Error output: ${errorOutput}`);
        reject(new Error(`FFmpeg process exited with code ${code}. Error: ${errorOutput}`));
      }
    });
    
    ffmpeg.on('error', (error: Error) => {
      console.error('❌ [SimpleTransitions] FFmpeg spawn error:', error);
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
        console.log('🔍 [SimpleTransitions] FFmpeg stderr:', output);
      }
      
      if (output.includes('time=') && !hasProgress) {
        hasProgress = true;
        const progressPercent = Math.min(75, Math.max(25, 50));
        onProgress?.({ percent: progressPercent, message: 'Concatenating video segments with re-encoding...' });
      }
      
      // Check for actual errors (not normal informational messages)
      if ((output.includes('Error') || output.includes('error')) && !isNormalMessage) {
        console.error('⚠️ [SimpleTransitions] FFmpeg error detected:', output);
      }
    });
    
    ffmpeg.stdout.on('data', (data: Buffer) => {
      console.log('📤 [SimpleTransitions] FFmpeg stdout:', data.toString());
    });
  });
}
