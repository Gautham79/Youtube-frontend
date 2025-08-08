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
      
      // Calculate offset: start transition AFTER the first video completes
      // This ensures the narration plays fully before transitioning starts
      const offset = firstVideoDuration;
      
      console.log(`🎨 [FadeTransition] Using offset: ${offset}s, duration: ${duration}s`);
      
      // FIXED: Use simple audio concatenation without filter_complex to preserve timing
      const ffmpegArgs = [
        '-i', segmentPaths[0],
        '-i', segmentPaths[1],
        '-filter_complex', 
        `[0:v][1:v]xfade=transition=fade:duration=${duration}:offset=${offset}[v]`,
        '-map', '[v]',
        '-map', '0:a',  // Use first audio stream as-is
        '-map', '1:a',  // Use second audio stream as-is  
        '-c:v', 'libx264',
        '-c:a', 'copy',  // Copy audio without re-encoding
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
      
      // Calculate offset: start transition AFTER the first video completes
      // This ensures the narration plays fully before transitioning starts
      const offset = firstVideoDuration;
      
      console.log(`🎨 [SlideTransition] Using offset: ${offset}s, duration: ${duration}s`);
      
      // FIXED: Use simple audio concatenation without filter_complex to preserve timing
      const ffmpegArgs = [
        '-i', segmentPaths[0],
        '-i', segmentPaths[1],
        '-filter_complex', 
        `[0:v][1:v]xfade=transition=slideleft:duration=${duration}:offset=${offset}[v]`,
        '-map', '[v]',
        '-map', '0:a',  // Use first audio stream as-is
        '-map', '1:a',  // Use second audio stream as-is  
        '-c:v', 'libx264',
        '-c:a', 'copy',  // Copy audio without re-encoding
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
      
      // Calculate offset: start transition AFTER the first video completes
      // This ensures the narration plays fully before transitioning starts
      const offset = firstVideoDuration;
      
      console.log(`🎨 [ZoomTransition] Using offset: ${offset}s, duration: ${duration}s`);
      
      // FIXED: Use simple audio concatenation without filter_complex to preserve timing
      const ffmpegArgs = [
        '-i', segmentPaths[0],
        '-i', segmentPaths[1],
        '-filter_complex', 
        `[0:v][1:v]xfade=transition=zoomin:duration=${duration}:offset=${offset}[v]`,
        '-map', '[v]',
        '-map', '0:a',  // Use first audio stream as-is
        '-map', '1:a',  // Use second audio stream as-is  
        '-c:v', 'libx264',
        '-c:a', 'copy',  // Copy audio without re-encoding
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

// Multi-segment fade transition (chain multiple crossfades)
async function generateMultiSegmentFadeTransition(
  segmentPaths: string[],
  settings: VideoSettings,
  outputPath: string,
  onProgress?: (progress: { percent: number; message: string }) => void
): Promise<string> {
  console.log('🎨 [MultiFadeTransition] Chaining multiple fade transitions');
  
  // For multiple segments, we'll process them in pairs
  let currentOutput = segmentPaths[0];
  const tempDir = path.dirname(segmentPaths[0]);
  
  for (let i = 1; i < segmentPaths.length; i++) {
    const tempOutput = path.join(tempDir, `temp_fade_${i}.mp4`);
    const isLastSegment = i === segmentPaths.length - 1;
    const finalOutput = isLastSegment ? outputPath : tempOutput;
    
    onProgress?.({ 
      percent: (i / segmentPaths.length) * 100, 
      message: `Applying fade transition ${i}/${segmentPaths.length - 1}...` 
    });
    
    await generateTwoSegmentFadeTransition(
      [currentOutput, segmentPaths[i]], 
      settings, 
      finalOutput,
      onProgress
    );
    
    // Clean up previous temp file (but not the original segments)
    if (i > 1 && currentOutput.includes('temp_fade_')) {
      try {
        fs.unlinkSync(currentOutput);
      } catch (e) {
        console.warn('⚠️ [MultiFadeTransition] Could not clean up temp file:', e);
      }
    }
    
    currentOutput = finalOutput;
  }
  
  return outputPath;
}

// Multi-segment slide transition (chain multiple slide transitions)
async function generateMultiSegmentSlideTransition(
  segmentPaths: string[],
  settings: VideoSettings,
  outputPath: string,
  onProgress?: (progress: { percent: number; message: string }) => void
): Promise<string> {
  console.log('🎨 [MultiSlideTransition] Chaining multiple slide transitions');
  
  // For multiple segments, we'll process them in pairs
  let currentOutput = segmentPaths[0];
  const tempDir = path.dirname(segmentPaths[0]);
  
  for (let i = 1; i < segmentPaths.length; i++) {
    const tempOutput = path.join(tempDir, `temp_slide_${i}.mp4`);
    const isLastSegment = i === segmentPaths.length - 1;
    const finalOutput = isLastSegment ? outputPath : tempOutput;
    
    onProgress?.({ 
      percent: (i / segmentPaths.length) * 100, 
      message: `Applying slide transition ${i}/${segmentPaths.length - 1}...` 
    });
    
    await generateTwoSegmentSlideTransition(
      [currentOutput, segmentPaths[i]], 
      settings, 
      finalOutput,
      onProgress
    );
    
    // Clean up previous temp file (but not the original segments)
    if (i > 1 && currentOutput.includes('temp_slide_')) {
      try {
        fs.unlinkSync(currentOutput);
      } catch (e) {
        console.warn('⚠️ [MultiSlideTransition] Could not clean up temp file:', e);
      }
    }
    
    currentOutput = finalOutput;
  }
  
  return outputPath;
}

// Multi-segment zoom transition (chain multiple zoom transitions)
async function generateMultiSegmentZoomTransition(
  segmentPaths: string[],
  settings: VideoSettings,
  outputPath: string,
  onProgress?: (progress: { percent: number; message: string }) => void
): Promise<string> {
  console.log('🎨 [MultiZoomTransition] Chaining multiple zoom transitions');
  
  // For multiple segments, we'll process them in pairs
  let currentOutput = segmentPaths[0];
  const tempDir = path.dirname(segmentPaths[0]);
  
  for (let i = 1; i < segmentPaths.length; i++) {
    const tempOutput = path.join(tempDir, `temp_zoom_${i}.mp4`);
    const isLastSegment = i === segmentPaths.length - 1;
    const finalOutput = isLastSegment ? outputPath : tempOutput;
    
    onProgress?.({ 
      percent: (i / segmentPaths.length) * 100, 
      message: `Applying zoom transition ${i}/${segmentPaths.length - 1}...` 
    });
    
    await generateTwoSegmentZoomTransition(
      [currentOutput, segmentPaths[i]], 
      settings, 
      finalOutput,
      onProgress
    );
    
    // Clean up previous temp file (but not the original segments)
    if (i > 1 && currentOutput.includes('temp_zoom_')) {
      try {
        fs.unlinkSync(currentOutput);
      } catch (e) {
        console.warn('⚠️ [MultiZoomTransition] Could not clean up temp file:', e);
      }
    }
    
    currentOutput = finalOutput;
  }
  
  return outputPath;
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
