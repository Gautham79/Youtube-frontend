import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { userCreditsTable, creditTransactionsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { uploadScenesAssets, hasCompleteAssets, getReadyScenes } from '@/utils/asset-upload';
import { SubtitleSettings, getDefaultSubtitleSettings } from '@/utils/subtitle-generator';
import { BackgroundMusicSettings } from '@/utils/local-music-library';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

interface VideoGenerationRequest {
  scriptTitle: string;
  scenes: Array<{
    id: number;
    imageUrl?: string;
    audioUrl?: string;
    imageBlob?: Blob;
    audioBlob?: Blob;
    duration: number; // in seconds
    narration?: string; // For subtitle generation
  }>;
  settings: {
    resolution: '720p' | '1080p' | '1440p' | '4K';
    frameRate: 24 | 30 | 60;
    format: 'mp4' | 'webm';
    quality: 'standard' | 'high' | 'ultra';
    transition: 'none' | 'fade' | 'slide' | 'zoom';
    transitionDuration: 0.5 | 1 | 1.5 | 2;
    subtitles?: SubtitleSettings;
    animation?: {
      type: 'none' | 'ken-burns-zoom-in' | 'ken-burns-pan-diagonal' | 'ken-burns-pan-left' | 'ken-burns-pan-right' | 'slow-zoom' | 'gentle-pan';
      intensity: 'subtle' | 'moderate' | 'strong';
    };
    orientation?: 'landscape' | 'portrait' | 'square'; // Video orientation setting
    backgroundMusic?: BackgroundMusicSettings; // Background music settings
  };
  uploadAssets?: boolean; // Whether to upload blob assets first
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: VideoGenerationRequest = await request.json();
    const { scriptTitle, scenes, settings, uploadAssets = false } = body;

    // Validate input
    if (!scenes || scenes.length === 0) {
      return NextResponse.json({ error: 'No scenes provided' }, { status: 400 });
    }

    console.log('🎬 [API] Starting video generation process:', {
      title: scriptTitle,
      totalScenes: scenes.length,
      uploadAssets,
      settings
    });

    // Step 1: Handle asset upload if needed (for blob assets)
    let processedScenes = scenes;
    
    // Check if we have blob assets that need uploading
    const hasBlobs = scenes.some(scene => scene.imageBlob || scene.audioBlob);
    
    if (hasBlobs || uploadAssets) {
      console.log('📤 [API] Uploading blob assets to server...');
      try {
        // Note: This would be handled on the frontend before calling this API
        // For now, we'll just validate that we have server URLs
        processedScenes = scenes.map(scene => ({
          ...scene,
          // Ensure we have server URLs, not blob URLs
          imageUrl: scene.imageUrl?.startsWith('blob:') ? undefined : scene.imageUrl,
          audioUrl: scene.audioUrl?.startsWith('blob:') ? undefined : scene.audioUrl,
        }));
      } catch (uploadError) {
        console.error('❌ [API] Asset upload failed:', uploadError);
        return NextResponse.json({
          error: 'Failed to upload assets',
          details: uploadError instanceof Error ? uploadError.message : 'Unknown upload error'
        }, { status: 500 });
      }
    }

    // Get user credits and plan
    const userCredits = await db
      .select()
      .from(userCreditsTable)
      .where(eq(userCreditsTable.user_id, user.id))
      .limit(1);

    if (!userCredits.length) {
      return NextResponse.json({ error: 'User credits not found' }, { status: 404 });
    }

    const currentCredits = userCredits[0].current_balance;
    
    // Calculate credit cost based on video settings
    let creditCost = 15; // Base cost
    if (settings.resolution === '1440p') creditCost += 5;
    if (settings.resolution === '4K') creditCost += 10;
    if (settings.quality === 'high') creditCost += 3;
    if (settings.quality === 'ultra') creditCost += 7;
    if (settings.frameRate === 60) creditCost += 5;

    if (currentCredits < creditCost) {
      return NextResponse.json({
        error: 'Insufficient credits',
        required: creditCost,
        available: currentCredits
      }, { status: 402 });
    }

    // Step 2: Validate that we have server-accessible assets
    console.log('🔍 [API] Validating scene assets:', {
      totalScenes: processedScenes.length,
      sceneAssets: processedScenes.map(scene => ({
        id: scene.id,
        hasImageUrl: !!scene.imageUrl,
        hasAudioUrl: !!scene.audioUrl,
        imageUrl: scene.imageUrl ? scene.imageUrl.substring(0, 50) + (scene.imageUrl.length > 50 ? '...' : '') : 'N/A',
        audioUrl: scene.audioUrl ? scene.audioUrl.substring(0, 50) + (scene.audioUrl.length > 50 ? '...' : '') : 'N/A',
        imageType: scene.imageUrl?.startsWith('blob:') ? 'blob' : 
                   scene.imageUrl?.startsWith('data:') ? 'data' : 
                   scene.imageUrl?.startsWith('/') ? 'local' : 
                   scene.imageUrl?.startsWith('http') ? 'remote' : 'unknown',
        audioType: scene.audioUrl?.startsWith('blob:') ? 'blob' : 
                   scene.audioUrl?.startsWith('data:') ? 'data' : 
                   scene.audioUrl?.startsWith('/') ? 'local' : 
                   scene.audioUrl?.startsWith('http') ? 'remote' : 'unknown'
      }))
    });

    const validScenes = processedScenes.filter(scene => {
      const hasValidImage = scene.imageUrl && 
        !scene.imageUrl.startsWith('blob:') && 
        !scene.imageUrl.startsWith('data:') &&
        (scene.imageUrl.startsWith('/') || scene.imageUrl.startsWith('http'));
      const hasValidAudio = scene.audioUrl && 
        !scene.audioUrl.startsWith('blob:') && 
        !scene.audioUrl.startsWith('data:') &&
        (scene.audioUrl.startsWith('/') || scene.audioUrl.startsWith('http'));
      return hasValidImage && hasValidAudio;
    });
    
    if (validScenes.length === 0) {
      // Provide detailed error information
      const sceneIssues = processedScenes.map(scene => {
        const issues = [];
        if (!scene.imageUrl) issues.push('Missing image URL');
        else if (scene.imageUrl.startsWith('blob:')) issues.push('Image is blob URL (needs upload)');
        else if (scene.imageUrl.startsWith('data:')) issues.push('Image is data URL (needs upload)');
        else if (!scene.imageUrl.startsWith('/') && !scene.imageUrl.startsWith('http')) issues.push('Invalid image URL format');
        
        if (!scene.audioUrl) issues.push('Missing audio URL');
        else if (scene.audioUrl.startsWith('blob:')) issues.push('Audio is blob URL (needs upload)');
        else if (scene.audioUrl.startsWith('data:')) issues.push('Audio is data URL (needs upload)');
        else if (!scene.audioUrl.startsWith('/') && !scene.audioUrl.startsWith('http')) issues.push('Invalid audio URL format');
        
        return {
          sceneId: scene.id,
          issues: issues
        };
      });

      return NextResponse.json({
        error: 'No valid scenes with server-accessible assets found.',
        details: 'All scenes have issues that prevent video generation. See sceneIssues for details.',
        suggestion: 'Upload your assets to the server first using the batch upload API, then try video generation again.',
        sceneIssues,
        totalScenes: processedScenes.length,
        validScenes: validScenes.length,
        uploadFirstWorkflow: {
          step1: 'Use uploadScenesAssets() to upload blob assets to server',
          step2: 'Get back server URLs (e.g., /uploaded-assets/user-id/filename.jpg)',
          step3: 'Send scenes with server URLs to video generation API'
        }
      }, { status: 400 });
    }

    console.log('🎬 [API] Processing video generation:', {
      title: scriptTitle,
      totalScenes: scenes.length,
      validScenes: validScenes.length,
      settings,
      creditCost,
      sceneDetails: validScenes.map(scene => ({
        id: scene.id,
        imageUrl: scene.imageUrl,
        audioUrl: scene.audioUrl,
        duration: scene.duration,
        imageType: scene.imageUrl?.startsWith('/') ? 'local' : 
                   scene.imageUrl?.startsWith('http') ? 'remote' : 'unknown',
        audioType: scene.audioUrl?.startsWith('/') ? 'local' : 
                   scene.audioUrl?.startsWith('http') ? 'remote' : 'unknown'
      }))
    });

    // Step 3: Generate video using server-accessible assets
    const videoFilename = `${uuidv4()}_${scriptTitle.replace(/[^a-z0-9]/gi, '_')}.${settings.format}`;
    const videoStoragePath = path.join(process.cwd(), 'public', 'generated-videos');
    
    // Ensure storage directory exists
    await mkdir(videoStoragePath, { recursive: true });
    
    const finalVideoPath = path.join(videoStoragePath, videoFilename);
    
    // Convert to the format expected by video generation utility
    // Import the duration parser to convert string durations to numbers
    const { parseDurationToSeconds } = await import('@/utils/openai/utils');
    
    const videoScenes = validScenes.map(scene => ({
      id: scene.id,
      imageUrl: scene.imageUrl!,
      audioUrl: scene.audioUrl!,
      duration: typeof scene.duration === 'string' ? parseDurationToSeconds(scene.duration) : scene.duration
    }));
    
    // Step 3: Generate video using the main video generator
    console.log('🎬 [API] Using main video generator (effects→subtitles→audio→concat)...');
    
    // Import the main video generation utility
    const { generateVideo } = await import('@/utils/video-generator');
    
    // Convert scenes to include narration for subtitles
    const videoScenesWithNarration = validScenes.map(scene => ({
      id: scene.id,
      imageUrl: scene.imageUrl!,
      audioUrl: scene.audioUrl!,
      duration: typeof scene.duration === 'string' ? parseDurationToSeconds(scene.duration) : scene.duration,
      narration: scene.narration || '' // Add narration for subtitles
    }));
    
    // Convert to correct order settings format
    const videoSettings = {
      resolution: settings.resolution,
      frameRate: settings.frameRate,
      format: settings.format,
      quality: settings.quality,
      transition: settings.transition || 'none' as const,
      transitionDuration: settings.transitionDuration || 1,
      orientation: settings.orientation || 'landscape' as const,
      animation: settings.animation,
      subtitles: settings.subtitles,
      backgroundMusic: settings.backgroundMusic // Pass through but will be ignored
    };

    console.log('🎬 [API] Video generation settings (CORRECT ORDER):', videoSettings);
    console.log('🔍 [API] DEBUG - Background music in API settings:', settings.backgroundMusic);
    console.log('🔍 [API] DEBUG - Background music in video settings:', videoSettings.backgroundMusic);

    try {
      await generateVideo(videoScenesWithNarration, videoSettings, finalVideoPath, {
        timeout: 600000, // 10 minutes
        onProgress: (progress) => {
          console.log(`📊 [VideoGen] Progress: ${progress.stage} - ${progress.percent}% - ${progress.message}`);
        }
      });
      
      console.log('✅ [API] Video generated successfully with CORRECT ORDER generator');
      
    } catch (videoError) {
      console.error('❌ [API] Video generation failed:', videoError);
      throw new Error(`Video generation failed: ${videoError instanceof Error ? videoError.message : String(videoError)}`);
    }

    // Get file stats for response
    const fs = await import('fs');
    const stats = fs.statSync(finalVideoPath);
    
    console.log('� Video generation completed:', {
      filename: videoFilename,
      path: finalVideoPath,
      size: stats.size,
      validScenes: validScenes.length
    });

    // Calculate total duration
    const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);

    // Deduct credits and log transaction
    await db
      .update(userCreditsTable)
      .set({ current_balance: currentCredits - creditCost })
      .where(eq(userCreditsTable.user_id, user.id));

    await db.insert(creditTransactionsTable).values({
      user_id: user.id,
      type: 'usage',
      amount: -creditCost,
      action_type: 'video_generation',
      description: `Video generation: ${scriptTitle}`,
      balance_before: currentCredits,
      balance_after: currentCredits - creditCost
    });

    console.log('✅ Video generation completed:', {
      filename: videoFilename,
      duration: totalDuration,
      creditsUsed: creditCost
    });

    return NextResponse.json({
      success: true,
      video: {
        url: `/generated-videos/${videoFilename}`,
        filename: videoFilename,
        title: scriptTitle,
        duration: totalDuration,
        size: stats.size,
        settings,
        scenesCount: scenes.length,
        generatedAt: new Date().toISOString()
      },
      remainingCredits: currentCredits - creditCost,
      creditsUsed: creditCost
    });

  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json({
      error: 'Failed to generate video',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to get resolution dimensions
function getResolutionDimensions(resolution: string) {
  switch (resolution) {
    case '720p': return { width: 1280, height: 720 };
    case '1080p': return { width: 1920, height: 1080 };
    case '1440p': return { width: 2560, height: 1440 };
    case '4K': return { width: 3840, height: 2160 };
    default: return { width: 1920, height: 1080 };
  }
}

/* 
 * PRODUCTION VIDEO GENERATION IMPLEMENTATION NOTES:
 * 
 * For production use, you would replace the mock implementation above with:
 * 
 * 1. Cloud-based video processing services:
 *    - AWS MediaConvert
 *    - Google Cloud Video Intelligence API
 *    - Azure Media Services
 *    - Cloudinary Video API
 * 
 * 2. Dedicated video generation APIs:
 *    - Bannerbear Video API
 *    - Shotstack Video API
 *    - Remotion (React-based video generation)
 *    - Loom API
 * 
 * 3. Server-side FFmpeg (requires proper server setup):
 *    - Install FFmpeg on your server
 *    - Use child_process to execute FFmpeg commands
 *    - Handle file uploads and processing
 * 
 * Example with cloud service:
 * 
 * async function generateVideoWithCloudService(scenes, settings) {
 *   const response = await fetch('https://api.shotstack.io/v1/render', {
 *     method: 'POST',
 *     headers: {
 *       'Authorization': `Bearer ${process.env.SHOTSTACK_API_KEY}`,
 *       'Content-Type': 'application/json'
 *     },
 *     body: JSON.stringify({
 *       timeline: {
 *         tracks: scenes.map(scene => ({
 *           clips: [
 *             {
 *               asset: { type: 'image', src: scene.imageUrl },
 *               start: 0,
 *               length: scene.duration
 *             },
 *             {
 *               asset: { type: 'audio', src: scene.audioUrl },
 *               start: 0,
 *               length: scene.duration
 *             }
 *           ]
 *         }))
 *       },
 *       output: {
 *         format: settings.format,
 *         resolution: settings.resolution
 *       }
 *     })
 *   });
 *   
 *   return response.json();
 * }
 */
