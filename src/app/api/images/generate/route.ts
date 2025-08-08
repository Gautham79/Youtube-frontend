import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { userCreditsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getOpenAIClient } from '@/utils/openai/client';
import { enhanceImagePromptWithCharacters } from '@/utils/character-consistency';
import { Character } from '@/utils/openai/types';
import { enhanceImagePromptWithStoryContext } from '@/utils/openai/image-prompt-enhancer';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Cost per image generation (in credits)
const IMAGE_GENERATION_COST = 3;

async function getUserCredits(userId: string): Promise<number> {
  const credits = await db
    .select()
    .from(userCreditsTable)
    .where(eq(userCreditsTable.user_id, userId))
    .limit(1);
  
  return credits[0]?.current_balance || 0;
}

async function deductCredits(userId: string, amount: number): Promise<void> {
  const currentCredits = await getUserCredits(userId);
  await db
    .update(userCreditsTable)
    .set({
      current_balance: currentCredits - amount,
      updated_at: new Date()
    })
    .where(eq(userCreditsTable.user_id, userId));
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

    // Check user credits
    const userCredits = await getUserCredits(user.id);
    if (userCredits < IMAGE_GENERATION_COST) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits',
          required: IMAGE_GENERATION_COST,
          available: userCredits
        },
        { status: 402 }
      );
    }

    const body = await request.json();
    
    // Log the full request body to see what frontend is sending
    console.log('🔍 Full request body received:', {
      ...body,
      prompt: body.prompt ? body.prompt.substring(0, 100) + '...' : 'undefined',
      imageStyleReceived: body.imageStyle,
      imageStyleType: typeof body.imageStyle,
      allKeys: Object.keys(body),
      rawBody: JSON.stringify(body, null, 2)
    });
    
    const { 
      prompt, 
      size = '1024x1024', 
      quality = 'standard', 
      format,
      charactersInScene,
      characterRegistry,
      imageStyle,
      // New story context parameters
      storyTitle,
      allScenes,
      sceneIndex,
      videoStyle,
      targetAudience
    } = body;

    // Additional debug log for imageStyle specifically
    console.log('🎨 ImageStyle parameter debug:', {
      imageStyleFromBody: body.imageStyle,
      imageStyleFromDestructuring: imageStyle,
      isUndefined: imageStyle === undefined,
      isNull: imageStyle === null,
      isEmpty: imageStyle === '',
      actualValue: imageStyle
    });

    // Validate input
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Image prompt is required' },
        { status: 400 }
      );
    }

    if (prompt.length > 1000) {
      return NextResponse.json(
        { error: 'Prompt must be less than 1000 characters' },
        { status: 400 }
      );
    }

    // Validate size
    const validSizes = ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'];
    if (!validSizes.includes(size)) {
      return NextResponse.json(
        { error: 'Invalid image size' },
        { status: 400 }
      );
    }

    // Validate quality
    const validQualities = ['standard', 'hd'];
    if (!validQualities.includes(quality)) {
      return NextResponse.json(
        { error: 'Invalid image quality' },
        { status: 400 }
      );
    }

    // Enhance prompt with story context, character consistency and style if provided
    let enhancedPrompt = prompt.trim();
    let characterConsistencyApplied = false;
    let styleApplied = false;
    let storyContextApplied = false;
    let validationNotes: string[] = [];
    
    // First, apply story-aware enhancement if story context is provided
    if (storyTitle && allScenes && typeof sceneIndex === 'number' && videoStyle && targetAudience) {
      try {
        const currentScene = {
          id: sceneIndex + 1,
          imagePrompt: prompt.trim(),
          narration: '', // Will be filled from allScenes if available
          charactersInScene: charactersInScene || [],
          duration: '5s', // Default duration
          sceneType: 'explanation' as const,
          keyPoints: []
        };
        
        // If we have the full scene data, use it
        if (allScenes[sceneIndex]) {
          Object.assign(currentScene, allScenes[sceneIndex]);
          currentScene.imagePrompt = prompt.trim(); // Override with current prompt
        }
        
        const storyContext = {
          title: storyTitle,
          scenes: allScenes,
          characters: characterRegistry,
          videoStyle,
          targetAudience
        };
        
        const enhancement = enhanceImagePromptWithStoryContext(
          currentScene,
          sceneIndex,
          storyContext
        );
        
        enhancedPrompt = enhancement.enhancedPrompt;
        validationNotes = enhancement.factualValidation;
        storyContextApplied = enhancement.enhancedPrompt !== prompt.trim();
        
        console.log('📖 Story context enhancement applied:', {
          originalPrompt: prompt.trim(),
          enhancedPrompt: enhancement.enhancedPrompt,
          storyContext: enhancement.storyContext,
          validationNotes: enhancement.factualValidation,
          characterPositions: enhancement.characterPositions,
          storyContextApplied
        });
      } catch (error) {
        console.warn('⚠️ Story context enhancement failed:', error);
        // Continue with original prompt if enhancement fails
      }
    }
    
    // Then apply character consistency if not already handled by story context
    if (!storyContextApplied && charactersInScene && characterRegistry && Array.isArray(charactersInScene) && Array.isArray(characterRegistry)) {
      try {
        enhancedPrompt = enhanceImagePromptWithCharacters(
          enhancedPrompt,
          charactersInScene,
          characterRegistry,
          imageStyle
        );
        characterConsistencyApplied = enhancedPrompt !== prompt.trim();
        styleApplied = !!imageStyle;
        
        console.log('🎭 Character consistency and style applied:', {
          originalPrompt: prompt.trim(),
          enhancedPrompt,
          charactersInScene,
          characterCount: characterRegistry.length,
          imageStyle,
          styleApplied
        });
      } catch (error) {
        console.warn('⚠️ Character consistency enhancement failed:', error);
        // Continue with original prompt if enhancement fails
      }
    } else if (!storyContextApplied && imageStyle) {
      // Apply style enhancement even without character consistency
      try {
        const { enhanceImagePromptWithStyle } = await import('@/utils/character-consistency');
        enhancedPrompt = enhanceImagePromptWithStyle(enhancedPrompt, imageStyle);
        styleApplied = enhancedPrompt !== prompt.trim();
        
        console.log('🎨 Style enhancement applied:', {
          originalPrompt: prompt.trim(),
          enhancedPrompt,
          imageStyle,
          styleApplied
        });
      } catch (error) {
        console.warn('⚠️ Style enhancement failed:', error);
        // Continue with original prompt if enhancement fails
      }
    }

    // Get OpenAI client
    const openai = getOpenAIClient();

    // Log generation request
    console.log('🎨 Image generation request:', {
      userId: user.id,
      originalPrompt: prompt.trim(),
      enhancedPrompt,
      characterConsistencyApplied,
      size,
      quality,
      format,
      timestamp: new Date().toISOString()
    });

    // Generate image with DALL-E
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: size as any,
      quality: quality as any,
      response_format: 'url'
    });

    console.log('✅ Image generation successful:', {
      userId: user.id,
      imageGenerated: !!response.data?.[0]?.url,
      revisedPrompt: response.data?.[0]?.revised_prompt,
      format,
      timestamp: new Date().toISOString()
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No image generated');
    }

    const imageUrl = response.data[0]?.url;
    const revisedPrompt = response.data[0]?.revised_prompt;

    if (!imageUrl) {
      throw new Error('No image URL returned from OpenAI');
    }

    // Fetch the image from DALL-E URL and save to server
    console.log('📥 Fetching image from DALL-E URL for server storage...');
    let serverImageUrl = null;
    
    try {
      // Fetch image with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
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
        throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();
      
      if (imageBuffer.byteLength === 0) {
        throw new Error('Downloaded image is empty');
      }
      
      console.log('✅ Image fetched successfully:', {
        size: imageBuffer.byteLength,
        contentType: imageResponse.headers.get('content-type')
      });
      
      // Create storage directory
      const storageDir = path.join(process.cwd(), 'public', 'uploaded-assets', user.id);
      await mkdir(storageDir, { recursive: true });
      
      // Generate unique filename
      const timestamp = Date.now();
      const uniqueId = uuidv4().split('-')[0]; // Short UUID
      const filename = `generated_image_${timestamp}_${uniqueId}.png`;
      const filePath = path.join(storageDir, filename);
      
      // Save file to server
      await writeFile(filePath, Buffer.from(imageBuffer));
      
      // Create public URL
      serverImageUrl = `/uploaded-assets/${user.id}/${filename}`;
      
      console.log('✅ Image saved to server:', {
        filename,
        serverUrl: serverImageUrl,
        size: imageBuffer.byteLength
      });
      
    } catch (uploadError) {
      console.error('⚠️ Failed to save image to server:', uploadError);
      // Continue without server URL - user will get DALL-E URL for preview
      // but video generation may not work
    }

    // Deduct credits after successful generation
    await deductCredits(user.id, IMAGE_GENERATION_COST);

    // Get updated credit balance
    const updatedCredits = await getUserCredits(user.id);

    return NextResponse.json({
      imageUrl, // DALL-E URL for preview
      serverImageUrl, // Server URL for video generation (null if upload failed)
      revisedPrompt,
      originalPrompt: prompt.trim(),
      size,
      quality,
      creditsUsed: IMAGE_GENERATION_COST,
      remainingCredits: updatedCredits,
      generatedAt: new Date().toISOString(),
      uploadSuccess: !!serverImageUrl
    });

  } catch (error) {
    console.error('Image generation error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('content_policy_violation')) {
        return NextResponse.json(
          { error: 'Image prompt violates content policy. Please modify your prompt and try again.' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('rate_limit_exceeded')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a moment.' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('OpenAI API key not configured')) {
        return NextResponse.json(
          { error: 'Image generation service temporarily unavailable' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate image. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/images/generate',
    method: 'POST',
    description: 'Generate images using DALL-E 3',
    cost: `${IMAGE_GENERATION_COST} credits per image`,
    parameters: {
      prompt: 'Required: Text description of the image to generate (max 1000 characters)',
      size: 'Optional: Image size (256x256, 512x512, 1024x1024, 1792x1024, 1024x1792). Default: 1024x1024',
      quality: 'Optional: Image quality (standard, hd). Default: standard'
    },
    limits: {
      maxPromptLength: 1000,
      model: 'dall-e-3',
      imagesPerRequest: 1
    }
  });
}
