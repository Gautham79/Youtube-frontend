import { ffmpeg, FFmpegProgress, getMediaInfo } from './ffmpeg-wrapper';
import { BackgroundMusicSettings, getLocalMusicLibrary, LocalAudioTrack } from './local-music-library';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);

export interface MusicMixingOptions {
  onProgress?: (progress: FFmpegProgress) => void;
  tempDir?: string;
  timeout?: number;
}

/**
 * Add background music to an existing video file using FFmpeg
 * This implements Option B (Post-Processing) approach with local music files
 */
export async function addBackgroundMusicToVideo(
  inputVideoPath: string,
  outputVideoPath: string,
  musicSettings: BackgroundMusicSettings,
  options: MusicMixingOptions = {}
): Promise<void> {
  if (!musicSettings.enabled) {
    // If background music is disabled, just copy the input to output
    fs.copyFileSync(inputVideoPath, outputVideoPath);
    return;
  }

  const {
    onProgress,
    tempDir: customTempDir,
    timeout = 300000 // 5 minutes default
  } = options;

  const tempDir = customTempDir || path.join(process.cwd(), 'temp', 'background-music', Date.now().toString());
  
  console.log('🎵 [Background Music] Starting music mixing:', {
    inputVideo: inputVideoPath,
    outputVideo: outputVideoPath,
    musicSettings,
    tempDir
  });

  try {
    await mkdir(tempDir, { recursive: true });
    console.log('✅ [Background Music] Created temp directory:', tempDir);

    // Step 1: Get background music file path
    let musicPath: string;
    
    if (musicSettings.source === 'local' && musicSettings.trackId) {
      // Use local music library - this should be the primary path for local music
      const localMusicLibrary = getLocalMusicLibrary();
      const localMusicPath = await localMusicLibrary.getTrackFilePath(musicSettings.trackId);
      
      if (!localMusicPath) {
        throw new Error(`Local music track not found: ${musicSettings.trackId}`);
      }
      
      musicPath = localMusicPath;
      console.log('✅ [Background Music] Using local music file:', musicPath);
    } else if (musicSettings.trackUrl) {
      // Check if trackUrl is a local file path (starts with /)
      if (musicSettings.trackUrl.startsWith('/')) {
        // Local file path - convert to absolute path
        const localPath = path.join(process.cwd(), 'public', musicSettings.trackUrl);
        console.log('🎵 [Background Music] Using local file path:', localPath);
        
        if (fs.existsSync(localPath)) {
          musicPath = localPath;
          console.log('✅ [Background Music] Local music file found:', musicPath);
        } else {
          console.warn('⚠️ [Background Music] Local file not found, generating fallback:', localPath);
          musicPath = path.join(tempDir, 'background_music.mp3');
          await generateFallbackAudio(musicPath);
        }
      } else if (musicSettings.source === 'upload') {
        // Download from uploaded URL
        musicPath = path.join(tempDir, 'background_music.mp3');
        await downloadMusicFile(musicSettings.trackUrl, musicPath);
      } else {
        // Download from external URL (fallback for other sources)
        musicPath = path.join(tempDir, 'background_music.mp3');
        await downloadMusicFile(musicSettings.trackUrl, musicPath);
      }
    } else {
      throw new Error('No music source specified. Either trackUrl or trackId must be provided.');
    }

    console.log('✅ [Background Music] Music file ready:', musicPath);

    // Step 2: Get video duration to determine if music needs looping
    const videoDuration = await getVideoDuration(inputVideoPath);
    console.log(`📹 [Background Music] Video duration: ${videoDuration}s`);

    // Step 3: Prepare music for mixing
    const processedMusicPath = await prepareMusicForMixing(
      musicPath,
      videoDuration,
      musicSettings,
      tempDir
    );

    // Step 4: Mix music with video
    await mixMusicWithVideo(
      inputVideoPath,
      processedMusicPath,
      outputVideoPath,
      musicSettings,
      onProgress
    );

    console.log('✅ [Background Music] Music mixing completed successfully');

  } catch (error) {
    console.error('❌ [Background Music] Music mixing failed:', error);
    throw error;
  } finally {
    // Cleanup temp directory
    try {
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          await unlink(path.join(tempDir, file));
        }
        fs.rmdirSync(tempDir);
        console.log('🧹 [Background Music] Cleaned up temp directory');
      }
    } catch (cleanupError) {
      console.warn('⚠️ [Background Music] Cleanup failed:', cleanupError);
    }
  }
}

/**
 * Download music file from URL with fallback to local files
 */
async function downloadMusicFile(url: string, outputPath: string): Promise<void> {
  console.log('📥 [Background Music] Downloading music from URL:', url);
  
  try {
    // First try to download from URL with AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout (reduced)
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VideoGenerator/1.0)'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    if (buffer.length === 0) {
      throw new Error('Downloaded file is empty');
    }
    
    await writeFile(outputPath, buffer);
    console.log(`✅ [Background Music] Music downloaded: ${outputPath} (${buffer.length} bytes)`);
    
  } catch (error) {
    console.warn('⚠️ [Background Music] Download failed, using fallback audio:', error instanceof Error ? error.message : String(error));
    
    // Fallback: Generate a simple audio file or use a local placeholder
    await generateFallbackAudio(outputPath);
  }
}

/**
 * Generate a simple fallback audio file when download fails
 */
async function generateFallbackAudio(outputPath: string): Promise<void> {
  try {
    console.log('🎵 [Background Music] Generating fallback audio...');
    
    // Generate a more pleasant ambient background music using FFmpeg
    // This creates a 60-second ambient soundscape with multiple tones
    const command = ffmpeg({ timeout: 60000 })
      .inputOption('-f', 'lavfi')
      .input('aevalsrc=0.3*(sin(2*PI*220*t)+0.5*sin(2*PI*330*t)+0.3*sin(2*PI*440*t))*sin(2*PI*0.1*t):s=44100:d=60:c=stereo')
      .audioFilter('volume=0.6,highpass=f=100,lowpass=f=8000')
      .audioCodec('mp3')
      .duration(60)
      .save(outputPath);

    await command.run();
    
    // Verify the file was created
    const stats = fs.statSync(outputPath);
    if (stats.size > 0) {
      console.log(`✅ [Background Music] Fallback audio generated: ${outputPath} (${stats.size} bytes)`);
    } else {
      throw new Error('Fallback audio file is empty');
    }
    
  } catch (fallbackError) {
    console.error('❌ [Background Music] Fallback audio generation failed:', fallbackError);
    
    // Last resort: Create a silent audio file
    await generateSilentAudio(outputPath);
  }
}

/**
 * Generate a silent audio file as the last resort
 */
async function generateSilentAudio(outputPath: string): Promise<void> {
  try {
    console.log('🔇 [Background Music] Generating silent audio as last resort...');
    
    const command = ffmpeg({ timeout: 30000 })
      .inputOption('-f', 'lavfi')
      .input('anullsrc=channel_layout=stereo:sample_rate=44100:duration=30')
      .audioCodec('mp3')
      .save(outputPath);

    await command.run();
    
    const stats = fs.statSync(outputPath);
    console.log(`✅ [Background Music] Silent audio generated: ${outputPath} (${stats.size} bytes)`);
    
  } catch (silentError) {
    console.error('❌ [Background Music] Silent audio generation failed:', silentError);
    throw new Error('Failed to generate any audio file');
  }
}

/**
 * Get video duration using ffprobe
 */
async function getVideoDuration(videoPath: string): Promise<number> {
  try {
    console.log('📹 [Background Music] Getting video duration for:', videoPath);
    
    const mediaInfo = await getMediaInfo(videoPath);
    
    if (!mediaInfo.format || !mediaInfo.format.duration) {
      throw new Error('Could not determine video duration from media info');
    }
    
    const duration = parseFloat(mediaInfo.format.duration);
    
    if (duration === 0 || isNaN(duration)) {
      throw new Error('Invalid video duration');
    }
    
    console.log(`✅ [Background Music] Video duration: ${duration}s`);
    return duration;
    
  } catch (error) {
    console.error('❌ [Background Music] Failed to get video duration:', error);
    throw new Error(`Failed to get video duration: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Prepare music for mixing (handle looping, volume, fades)
 */
async function prepareMusicForMixing(
  musicPath: string,
  videoDuration: number,
  settings: BackgroundMusicSettings,
  tempDir: string
): Promise<string> {
  const processedMusicPath = path.join(tempDir, 'processed_music.mp3');
  
  console.log('🎛️ [Background Music] Preparing music for mixing:', {
    originalMusic: musicPath,
    videoDuration,
    settings: {
      volume: settings.volume,
      fadeIn: settings.fadeIn,
      fadeOut: settings.fadeOut,
      loop: settings.loop,
      startOffset: settings.startOffset
    }
  });

  try {
    // Get original music duration
    const musicDuration = await getAudioDuration(musicPath);
    console.log(`🎵 [Background Music] Original music duration: ${musicDuration}s`);

    // Calculate target duration (video duration minus start offset)
    const targetDuration = videoDuration - settings.startOffset;
    
    // Build FFmpeg command for music processing
    const command = ffmpeg({ timeout: 120000 })
      .input(musicPath);

    // Handle looping if music is shorter than needed
    if (settings.loop && musicDuration < targetDuration) {
      const loopCount = Math.ceil(targetDuration / musicDuration);
      console.log(`🔄 [Background Music] Looping music ${loopCount} times`);
      
      // Use stream_loop to repeat the audio
      command.inputOption('-stream_loop', (loopCount - 1).toString());
    }

    // Build audio filter chain
    const filters: string[] = [];

    // Volume adjustment (convert percentage to decimal, ensure minimum audible level)
    const volumeLevel = Math.max(settings.volume / 100, 0.1); // Minimum 10% volume
    filters.push(`volume=${volumeLevel}`);

    // Fade in
    if (settings.fadeIn > 0) {
      filters.push(`afade=t=in:st=0:d=${settings.fadeIn}`);
    }

    // Fade out
    if (settings.fadeOut > 0) {
      const fadeOutStart = targetDuration - settings.fadeOut;
      filters.push(`afade=t=out:st=${fadeOutStart}:d=${settings.fadeOut}`);
    }

    // Trim to exact duration needed
    filters.push(`atrim=duration=${targetDuration}`);

    // Apply all filters
    if (filters.length > 0) {
      command.audioFilter(filters.join(','));
    }

    command
      .audioCodec('mp3')
      .overwrite()
      .save(processedMusicPath);

    await command.run();

    // Verify processed music was created
    const stats = fs.statSync(processedMusicPath);
    console.log(`✅ [Background Music] Music processed: ${stats.size} bytes`);
    
    if (stats.size === 0) {
      throw new Error('Processed music file is empty');
    }

    return processedMusicPath;

  } catch (error) {
    console.error('❌ [Background Music] Music processing failed:', error);
    throw new Error(`Failed to process music: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get audio duration using ffprobe
 */
async function getAudioDuration(audioPath: string): Promise<number> {
  try {
    console.log('🎵 [Background Music] Getting audio duration for:', audioPath);
    
    const mediaInfo = await getMediaInfo(audioPath);
    
    if (!mediaInfo.format || !mediaInfo.format.duration) {
      throw new Error('Could not determine audio duration from media info');
    }
    
    const duration = parseFloat(mediaInfo.format.duration);
    
    if (duration === 0 || isNaN(duration)) {
      throw new Error('Invalid audio duration');
    }
    
    console.log(`✅ [Background Music] Audio duration: ${duration}s`);
    return duration;
    
  } catch (error) {
    console.error('❌ [Background Music] Failed to get audio duration:', error);
    throw new Error(`Failed to get audio duration: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Mix processed music with video using FFmpeg
 */
async function mixMusicWithVideo(
  videoPath: string,
  musicPath: string,
  outputPath: string,
  settings: BackgroundMusicSettings,
  onProgress?: (progress: FFmpegProgress) => void
): Promise<void> {
  console.log('🎬 [Background Music] Mixing music with video:', {
    video: videoPath,
    music: musicPath,
    output: outputPath,
    startOffset: settings.startOffset
  });

  try {
    const command = ffmpeg({ timeout: 300000 })
      .input(videoPath)
      .input(musicPath);

    // Build filter complex for audio mixing with better balance
    let filterComplex: string;
    
    if (settings.startOffset > 0) {
      // Delay the background music by startOffset seconds
      filterComplex = `[1:a]adelay=${settings.startOffset * 1000}|${settings.startOffset * 1000}[delayed_music];[0:a][delayed_music]amix=inputs=2:duration=first:dropout_transition=2:weights=1 0.8[mixed_audio]`;
    } else {
      // No delay, mix directly with weights to balance original audio vs background music
      filterComplex = `[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2:weights=1 0.8[mixed_audio]`;
    }

    // Use output options to set the filter complex
    command
      .outputOption('-filter_complex', filterComplex)
      .outputOption('-map', '0:v') // Use video from first input
      .outputOption('-map', '[mixed_audio]') // Use mixed audio
      .videoCodec('copy') // Copy video without re-encoding for speed
      .audioCodec('aac') // Re-encode audio with mixed result
      .overwrite();

    // Handle progress events
    if (onProgress) {
      command.on('progress', onProgress);
    }

    command.on('error', (error: Error) => {
      console.error('❌ [Background Music] FFmpeg mixing error:', error.message);
    });

    command.on('stderr', (data: string) => {
      if (data.includes('error') || data.includes('Error')) {
        console.error('⚠️ [Background Music] FFmpeg stderr:', data);
      }
    });

    command.save(outputPath);
    await command.run();

    // Verify final video was created
    const stats = fs.statSync(outputPath);
    console.log(`✅ [Background Music] Final video with music: ${stats.size} bytes`);
    
    if (stats.size === 0) {
      throw new Error('Final video with background music is empty');
    }

  } catch (error) {
    console.error('❌ [Background Music] Video mixing failed:', error);
    throw new Error(`Failed to mix music with video: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Suggest background music for video content using local music library
 */
export async function suggestBackgroundMusic(videoContent: {
  title?: string;
  description?: string;
  duration: number;
  mood?: string;
}): Promise<LocalAudioTrack[]> {
  try {
    console.log('🤖 [Background Music] Getting music suggestions for:', videoContent);
    
    const localMusicLibrary = getLocalMusicLibrary();
    const suggestions = await localMusicLibrary.suggestMusic(videoContent);
    
    console.log(`✅ [Background Music] Found ${suggestions.length} music suggestions`);
    return suggestions;
    
  } catch (error) {
    console.error('❌ [Background Music] Failed to get suggestions:', error);
    return [];
  }
}

/**
 * Search for background music with specific criteria using local music library
 */
export async function searchBackgroundMusic(params: {
  mood?: string[];
  genre?: string[];
  instrument?: string[];
  duration?: { min: number; max: number };
  attribution?: boolean;
  maxResults?: number;
}): Promise<LocalAudioTrack[]> {
  try {
    console.log('🔍 [Background Music] Searching for music:', params);
    
    const localMusicLibrary = getLocalMusicLibrary();
    const results = await localMusicLibrary.searchMusic(params);
    
    console.log(`✅ [Background Music] Found ${results.length} search results`);
    return results;
    
  } catch (error) {
    console.error('❌ [Background Music] Search failed:', error);
    return [];
  }
}

/**
 * Preview background music by generating a short sample with video audio
 */
export async function previewBackgroundMusic(
  videoAudioPath: string,
  musicTrackId: string,
  settings: BackgroundMusicSettings,
  outputPath: string,
  previewDuration: number = 30
): Promise<void> {
  const tempDir = path.join(process.cwd(), 'temp', 'music-preview', Date.now().toString());
  
  try {
    await mkdir(tempDir, { recursive: true });
    
    // Get local music track file path
    const localMusicLibrary = getLocalMusicLibrary();
    const musicPath = await localMusicLibrary.getTrackFilePath(musicTrackId);
    
    if (!musicPath) {
      throw new Error(`Local music track not found: ${musicTrackId}`);
    }
    
    // Create short preview by trimming both audio files
    const shortVideoAudio = path.join(tempDir, 'short_video_audio.mp3');
    const shortMusic = path.join(tempDir, 'short_music.mp3');
    
    // Trim video audio to preview duration
    await ffmpeg({ timeout: 60000 })
      .input(videoAudioPath)
      .duration(previewDuration)
      .audioCodec('mp3')
      .save(shortVideoAudio)
      .run();
    
    // Trim and process music
    const volumeLevel = settings.volume / 100;
    await ffmpeg({ timeout: 60000 })
      .input(musicPath)
      .duration(previewDuration)
      .audioFilter(`volume=${volumeLevel}`)
      .audioCodec('mp3')
      .save(shortMusic)
      .run();
    
    // Mix the preview
    await ffmpeg({ timeout: 60000 })
      .input(shortVideoAudio)
      .input(shortMusic)
      .outputOption('-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first[mixed]')
      .outputOption('-map', '[mixed]')
      .audioCodec('mp3')
      .save(outputPath)
      .run();
    
    console.log(`✅ [Background Music] Preview created: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ [Background Music] Preview generation failed:', error);
    throw error;
  } finally {
    // Cleanup
    try {
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          await unlink(path.join(tempDir, file));
        }
        fs.rmdirSync(tempDir);
      }
    } catch (cleanupError) {
      console.warn('⚠️ [Background Music] Preview cleanup failed:', cleanupError);
    }
  }
}
