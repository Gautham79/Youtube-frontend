import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOpenAIClient } from '@/utils/openai/client';
import {
  BatchScene,
  BatchSettings,
  BatchResult,
  getUserCreditsAndPlan,
  deductCreditsAndLog,
  processBatch,
  calculateBatchCredits,
  validateBatchRequest,
  TTS_CONCURRENT_LIMIT,
  TTS_DELAY_BETWEEN_BATCHES
} from '@/utils/batch-generation';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Single audio generation function (extracted from existing API)
async function generateSingleAudio(
  scene: BatchScene,
  settings: BatchSettings,
  userId: string,
  openai: any
): Promise<BatchResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🎵 Generating audio for scene ${scene.id}:`, {
      textLength: scene.prompt.length,
      voice: settings.voice || 'alloy',
      speed: settings.speed || 1.0,
      format: settings.format || 'mp3'
    });

    // Validate voice parameter
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const voice = settings.voice || 'alloy';
    if (!validVoices.includes(voice)) {
      throw new Error('Invalid voice selection');
    }

    // Validate speed parameter
    const speed = settings.speed || 1.0;
    if (speed < 0.25 || speed > 4.0) {
      throw new Error('Speed must be between 0.25 and 4.0');
    }

    // Validate format parameter
    const validFormats = ['mp3', 'opus', 'aac', 'flac', 'wav'];
    const format = settings.format || 'mp3';
    if (!validFormats.includes(format)) {
      throw new Error('Invalid audio format');
    }

    // Generate audio using OpenAI TTS
    const audioResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as any,
      input: scene.prompt,
      speed: speed,
      response_format: format as any,
    });

    // Convert the response to a buffer
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

    if (audioBuffer.length === 0) {
      throw new Error('Generated audio is empty');
    }

    // Save audio file to server
    let serverAudioUrl = null;
    
    try {
      // Create storage directory
      const storageDir = path.join(process.cwd(), 'public', 'uploaded-assets', userId);
      await mkdir(storageDir, { recursive: true });
      
      // Generate unique filename
      const timestamp = Date.now();
      const uniqueId = uuidv4().split('-')[0];
      const filename = `batch_audio_scene${scene.id}_${timestamp}_${uniqueId}.${format}`;
      const filePath = path.join(storageDir, filename);
      
      // Save file to server
      await writeFile(filePath, audioBuffer);
      
      // Create public URL
      serverAudioUrl = `/uploaded-assets/${userId}/${filename}`;
      
    } catch (uploadError) {
      console.warn(`⚠️ Failed to save audio for scene ${scene.id}:`, uploadError);
      // Continue without server URL
    }

    // Calculate audio duration (rough estimate: ~150 words per minute)
    const wordCount = scene.prompt.split(/\s+/).length;
    const estimatedDurationSeconds = Math.ceil((wordCount / 150) * 60 / speed);

    const duration = Date.now() - startTime;
    console.log(`✅ Audio generated for scene ${scene.id} in ${duration}ms`);

    return {
      sceneId: scene.id,
      success: true,
      url: serverAudioUrl || undefined, // For audio, we return the server URL directly
      serverUrl: serverAudioUrl,
      creditsUsed: 0 // Will be set after successful generation
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Audio generation failed for scene ${scene.id} after ${duration}ms:`, error);
    
    return {
      sceneId: scene.id,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      creditsUsed: 0
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { scenes, settings = {}, skipExisting = false } = body;

    console.log('🚀 Batch audio generation request:', {
      userId: user.id,
      sceneCount: scenes?.length || 0,
      settings,
      skipExisting,
      timestamp: new Date().toISOString()
    });

    // Validate request
    const validation = validateBatchRequest(scenes);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Additional validation for audio-specific requirements
    for (const scene of scenes) {
      if (scene.prompt.length > 4096) {
        return NextResponse.json(
          { error: `Scene ${scene.id} text exceeds 4096 characters limit for TTS` },
          { status: 400 }
        );
      }
    }

    // Get user credits and plan
    const userPlan = await getUserCreditsAndPlan(user.id);
    const audioCost = userPlan.audioCost || 3; // Default cost

    // Calculate total credits needed
    const { totalCredits, itemsToProcess } = calculateBatchCredits(
      scenes,
      audioCost,
      skipExisting
    );

    // Check if user has enough credits
    if (userPlan.currentBalance < totalCredits) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required: totalCredits,
          available: userPlan.currentBalance,
          itemsToProcess
        },
        { status: 402 }
      );
    }

    // Get OpenAI client
    const openai = getOpenAIClient();

    // Filter scenes if skipExisting is enabled
    const scenesToProcess = skipExisting 
      ? scenes.filter((scene: BatchScene) => !scene.skipExisting)
      : scenes;

    console.log(`📊 Processing ${scenesToProcess.length} scenes with ${TTS_CONCURRENT_LIMIT} concurrent requests`);

    // Process batch with rate limiting
    const results = await processBatch(
      scenesToProcess,
      (scene: BatchScene) => generateSingleAudio(scene, settings, user.id, openai),
      TTS_CONCURRENT_LIMIT,
      TTS_DELAY_BETWEEN_BATCHES
    );

    // Process results and handle credits
    const batchResults: BatchResult[] = [];
    let totalCreditsUsed = 0;
    let successCount = 0;
    let failureCount = 0;
    let currentBalance = userPlan.currentBalance;

    for (const { item: scene, result, error } of results) {
      if (result && result.success) {
        // Deduct credits for successful generation
        try {
          currentBalance = await deductCreditsAndLog(
            user.id,
            audioCost,
            'audio',
            `Batch audio generation - Scene ${scene.id}`,
            currentBalance
          );
          
          result.creditsUsed = audioCost;
          totalCreditsUsed += audioCost;
          successCount++;
        } catch (creditError) {
          console.error(`Failed to deduct credits for scene ${scene.id}:`, creditError);
          // Convert to failure if credit deduction fails
          result.success = false;
          result.error = 'Failed to process payment';
          result.creditsUsed = 0;
          failureCount++;
        }
      } else {
        failureCount++;
      }

      batchResults.push(result || {
        sceneId: scene.id,
        success: false,
        error: error?.message || 'Unknown error',
        creditsUsed: 0
      });
    }

    const summary = {
      total: scenesToProcess.length,
      successful: successCount,
      failed: failureCount,
      creditsUsed: totalCreditsUsed,
      remainingCredits: currentBalance,
      processingTime: Date.now()
    };

    console.log('✅ Batch audio generation completed:', summary);

    return NextResponse.json({
      success: true,
      results: batchResults,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Batch audio generation error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('insufficient_quota')) {
        return NextResponse.json(
          { error: 'OpenAI API quota exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('rate_limit_exceeded')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a moment.' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('Too many consecutive failures')) {
        return NextResponse.json(
          { error: 'Batch processing stopped due to consecutive failures. Please check your text and try again.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Batch audio generation failed. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/audio/batch-generate',
    method: 'POST',
    description: 'Generate multiple audio files using OpenAI TTS with rate limiting',
    rateLimits: {
      concurrent: TTS_CONCURRENT_LIMIT,
      delayBetweenBatches: `${TTS_DELAY_BETWEEN_BATCHES}ms`,
      maxConsecutiveErrors: 3
    },
    parameters: {
      scenes: 'Required: Array of scenes with id and prompt (text to convert to speech)',
      settings: 'Optional: Audio generation settings (voice, speed, format)',
      skipExisting: 'Optional: Skip scenes that already have audio'
    },
    limits: {
      maxScenes: 50,
      maxTextLength: 4096,
      model: 'tts-1',
      validVoices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      validFormats: ['mp3', 'opus', 'aac', 'flac', 'wav'],
      speedRange: '0.25 - 4.0'
    },
    creditHandling: {
      deductionPolicy: 'Credits deducted only on successful generation',
      errorHandling: 'Continue processing on individual failures, stop after 3 consecutive batch failures'
    }
  });
}
