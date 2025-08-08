import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOpenAIClient } from '@/utils/openai/client';
import { generateStoryAwareImagePrompts } from '@/utils/openai/image-prompt-enhancer';
import {
  BatchScene,
  BatchSettings,
  BatchResult,
  getUserCreditsAndPlan,
  deductCreditsAndLog,
  processBatch,
  calculateBatchCredits,
  validateBatchRequest,
  DALLE_CONCURRENT_LIMIT,
  DALLE_DELAY_BETWEEN_BATCHES
} from '@/utils/batch-generation';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Single image generation function (extracted from existing API)
async function generateSingleImage(
  scene: BatchScene,
  settings: BatchSettings,
  userId: string,
  openai: any
): Promise<BatchResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🎨 Generating image for scene ${scene.id}:`, {
      prompt: scene.prompt.substring(0, 100) + '...',
      settings
    });

    // Generate image with DALL-E
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: scene.prompt.trim(),
      n: 1,
      size: settings.size || '1024x1024',
      quality: settings.quality || 'standard',
      response_format: 'url'
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No image generated');
    }

    const imageUrl = response.data[0]?.url;
    const revisedPrompt = response.data[0]?.revised_prompt;

    if (!imageUrl) {
      throw new Error('No image URL returned from OpenAI');
    }

    // Fetch and save image to server
    let serverImageUrl = null;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const imageResponse = await fetch(imageUrl, {
        method: 'GET',
        headers: {
          'Accept': 'image/*',
          'User-Agent': 'Mozilla/5.0 (compatible; ImageBot/1.0)',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();
      
      if (imageBuffer.byteLength === 0) {
        throw new Error('Downloaded image is empty');
      }
      
      // Create storage directory
      const storageDir = path.join(process.cwd(), 'public', 'uploaded-assets', userId);
      await mkdir(storageDir, { recursive: true });
      
      // Generate unique filename
      const timestamp = Date.now();
      const uniqueId = uuidv4().split('-')[0];
      const filename = `batch_image_scene${scene.id}_${timestamp}_${uniqueId}.png`;
      const filePath = path.join(storageDir, filename);
      
      // Save file to server
      await writeFile(filePath, Buffer.from(imageBuffer));
      
      // Create public URL
      serverImageUrl = `/uploaded-assets/${userId}/${filename}`;
      
    } catch (uploadError) {
      console.warn(`⚠️ Failed to save image for scene ${scene.id}:`, uploadError);
      // Continue without server URL
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Image generated for scene ${scene.id} in ${duration}ms`);

    return {
      sceneId: scene.id,
      success: true,
      url: imageUrl,
      serverUrl: serverImageUrl,
      creditsUsed: 0 // Will be set after successful generation
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Image generation failed for scene ${scene.id} after ${duration}ms:`, error);
    
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

    console.log('🚀 Batch image generation request:', {
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

    // Get user credits and plan
    const userPlan = await getUserCreditsAndPlan(user.id);
    const imageCost = userPlan.imageCost || 3; // Default cost

    // Calculate total credits needed
    const { totalCredits, itemsToProcess } = calculateBatchCredits(
      scenes,
      imageCost,
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

    console.log(`📊 Processing ${scenesToProcess.length} scenes with ${DALLE_CONCURRENT_LIMIT} concurrent requests`);

    // Process batch with rate limiting
    const results = await processBatch(
      scenesToProcess,
      (scene: BatchScene) => generateSingleImage(scene, settings, user.id, openai),
      DALLE_CONCURRENT_LIMIT,
      DALLE_DELAY_BETWEEN_BATCHES
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
            imageCost,
            'image',
            `Batch image generation - Scene ${scene.id}`,
            currentBalance
          );
          
          result.creditsUsed = imageCost;
          totalCreditsUsed += imageCost;
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

    console.log('✅ Batch image generation completed:', summary);

    return NextResponse.json({
      success: true,
      results: batchResults,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Batch image generation error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('content_policy_violation')) {
        return NextResponse.json(
          { error: 'One or more prompts violate content policy. Please review and modify your prompts.' },
          { status: 400 }
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
          { error: 'Batch processing stopped due to consecutive failures. Please check your prompts and try again.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Batch image generation failed. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/images/batch-generate',
    method: 'POST',
    description: 'Generate multiple images using DALL-E 3 with rate limiting',
    rateLimits: {
      concurrent: DALLE_CONCURRENT_LIMIT,
      delayBetweenBatches: `${DALLE_DELAY_BETWEEN_BATCHES}ms`,
      maxConsecutiveErrors: 3
    },
    parameters: {
      scenes: 'Required: Array of scenes with id and prompt',
      settings: 'Optional: Image generation settings (size, quality, etc.)',
      skipExisting: 'Optional: Skip scenes that already have images'
    },
    limits: {
      maxScenes: 50,
      maxPromptLength: 1000,
      model: 'dall-e-3'
    },
    creditHandling: {
      deductionPolicy: 'Credits deducted only on successful generation',
      errorHandling: 'Continue processing on individual failures, stop after 3 consecutive batch failures'
    }
  });
}
