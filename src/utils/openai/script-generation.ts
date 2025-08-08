import { getOpenAIClient } from './client';
import { ScriptGenerationParams, GeneratedScript, YouTubeMetadata, ScriptScene } from './types';
import { SYSTEM_PROMPTS, createScriptGenerationPrompt } from './prompts';
import { 
  adjustSceneDurations, 
  calculateTotalScriptDuration, 
  calculateTotalWordCount, 
  createAIServiceError 
} from './utils';

function validateAndOptimizeYouTubeMetadata(
  metadata: YouTubeMetadata,
  scenes: ScriptScene[]
): YouTubeMetadata {
  // Validate and optimize title
  if (metadata.title && metadata.title.length > 100) {
    metadata.title = metadata.title.substring(0, 97) + '...';
  }

  // Validate tags
  if (metadata.tags) {
    // Ensure tags don't exceed character limit
    const totalTagsLength = metadata.tags.join(',').length;
    if (totalTagsLength > 500) {
      // Trim tags to fit within limit
      let currentLength = 0;
      metadata.tags = metadata.tags.filter(tag => {
        currentLength += tag.length + 1; // +1 for comma
        return currentLength <= 500;
      });
    }
    
    // Limit to 15 tags maximum
    if (metadata.tags.length > 15) {
      metadata.tags = metadata.tags.slice(0, 15);
    }
  }

  // Generate chapters from scenes if not provided
  if (!metadata.chapters || metadata.chapters.length === 0) {
    let currentTime = 0;
    metadata.chapters = scenes.map((scene, index) => {
      const timeString = formatTime(currentTime);
      currentTime += parseFloat(scene.duration.replace('s', ''));
      
      return {
        time: timeString,
        title: scene.keyPoints?.[0] || `Scene ${index + 1}`
      };
    }).slice(0, 10); // Limit to 10 chapters for readability
  }

  // Validate category ID
  const validCategoryIds = [1, 2, 10, 15, 17, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29];
  if (!validCategoryIds.includes(metadata.categoryId)) {
    metadata.categoryId = 27; // Default to Education
  }

  // Ensure privacy status is valid
  const validPrivacyStatuses = ['public', 'unlisted', 'private'];
  if (!validPrivacyStatuses.includes(metadata.privacyStatus)) {
    metadata.privacyStatus = 'public';
  }

  return metadata;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export async function generateScript(params: ScriptGenerationParams): Promise<GeneratedScript> {
  try {
    const openai = getOpenAIClient();
    const prompt = createScriptGenerationPrompt(params);

    // Debug: Print the prompt being sent to ChatGPT
    console.log('🔍 DEBUG: Prompt being sent to ChatGPT:');
    console.log('='.repeat(80));
    console.log('SYSTEM PROMPT:');
    console.log(SYSTEM_PROMPTS.SCRIPT_WRITER);
    console.log('='.repeat(80));
    console.log('USER PROMPT:');
    console.log(prompt);
    console.log('='.repeat(80));

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPTS.SCRIPT_WRITER
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw createAIServiceError('No response from OpenAI', 'NO_RESPONSE');
    }

    // Debug: Print the raw response from ChatGPT
    console.log('🔍 DEBUG: Raw response from ChatGPT:');
    console.log('='.repeat(80));
    console.log('Response length:', responseContent.length);
    console.log('Response content:');
    console.log(responseContent);
    console.log('='.repeat(80));

    let scriptData: GeneratedScript;
    try {
      // Clean the response content to handle potential issues
      let cleanedContent = responseContent.trim();
      
      // Remove any markdown code blocks if present
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // First, try to parse as-is
      try {
        scriptData = JSON.parse(cleanedContent);
      } catch (initialParseError) {
        console.warn('Initial JSON parse failed, attempting to fix common issues...');
        
        // Check for incomplete JSON (common with long responses)
        if (cleanedContent.includes('// ...continue with remaining scenes') || 
            cleanedContent.includes('// ... more scenes here ...') || 
            cleanedContent.includes('...continue with') ||
            cleanedContent.includes('// ...') ||
            !cleanedContent.trim().endsWith('}')) {
          console.warn('Detected incomplete JSON response, attempting to fix...');
          
          // Find the last complete scene object
          let lastCompleteSceneEnd = -1;
          let braceCount = 0;
          let inString = false;
          let escapeNext = false;
          
          // Parse through the content to find the last complete scene
          for (let i = 0; i < cleanedContent.length; i++) {
            const char = cleanedContent[i];
            
            if (escapeNext) {
              escapeNext = false;
              continue;
            }
            
            if (char === '\\') {
              escapeNext = true;
              continue;
            }
            
            if (char === '"' && !escapeNext) {
              inString = !inString;
              continue;
            }
            
            if (!inString) {
              if (char === '{') {
                braceCount++;
              } else if (char === '}') {
                braceCount--;
                // If we're back to the scenes array level and find a complete scene
                if (braceCount === 1 && cleanedContent.substring(i + 1, i + 2) === ',') {
                  lastCompleteSceneEnd = i + 1; // Include the comma
                }
              }
            }
          }
          
          if (lastCompleteSceneEnd > -1) {
            // Find the scenes array start
            const scenesStartMatch = cleanedContent.indexOf('"scenes": [');
            if (scenesStartMatch > -1) {
              // Extract everything up to the last complete scene
              const beforeScenes = cleanedContent.substring(0, scenesStartMatch + '"scenes": ['.length);
              const scenesContent = cleanedContent.substring(scenesStartMatch + '"scenes": ['.length, lastCompleteSceneEnd);
              
              // Remove trailing comma if present
              const cleanedScenesContent = scenesContent.replace(/,\s*$/, '');
              
              // Close the JSON structure properly
              cleanedContent = beforeScenes + '\n' + cleanedScenesContent + '\n  ],\n  "estimatedWords": 0,\n  "targetAudience": "' + params.targetAudience + '",\n  "videoStyle": "' + params.videoStyle + '"';
              
              // Add character consistency fields if needed
              if (params.characterConsistency) {
                cleanedContent += ',\n  "characters": [],\n  "characterConsistency": true';
              }
              
              cleanedContent += '\n}';
              
              console.log('🔧 Fixed incomplete JSON by truncating at last complete scene');
            }
          }
        } else {
          // Try to fix common JSON syntax issues
          // Remove trailing commas before closing brackets/braces
          cleanedContent = cleanedContent.replace(/,(\s*[}\]])/g, '$1');
          
          // Fix any double commas
          cleanedContent = cleanedContent.replace(/,,/g, ',');
          
          // Ensure proper closing of JSON structure
          if (!cleanedContent.trim().endsWith('}')) {
            cleanedContent = cleanedContent.trim() + '}';
          }
        }
        
        // Try parsing the cleaned content
        scriptData = JSON.parse(cleanedContent);
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response after all fixes:', {
        error: parseError,
        responseLength: responseContent.length,
        responsePreview: responseContent.substring(0, 500) + '...',
        responseSuffix: responseContent.substring(Math.max(0, responseContent.length - 200))
      });
      throw createAIServiceError('Invalid response format from AI', 'PARSE_ERROR');
    }

    // Validate the response structure
    if (!scriptData.title || !scriptData.scenes || !Array.isArray(scriptData.scenes)) {
      throw createAIServiceError('Invalid script structure from AI', 'INVALID_STRUCTURE');
    }

    // Enforce 60-scene maximum for flexible mode
    if (params.videoLength === 'flexible' && scriptData.scenes.length > 60) {
      console.warn(`AI generated ${scriptData.scenes.length} scenes, truncating to 60 for flexible mode`);
      scriptData.scenes = scriptData.scenes.slice(0, 60);
    }

    // Ensure scenes have proper IDs and calculate accurate durations
    scriptData.scenes = scriptData.scenes.map((scene: any, index: number) => ({
      ...scene,
      id: index + 1,
      keyPoints: scene.keyPoints || []
    }));

    // Calculate accurate durations based on narration content
    scriptData.scenes = adjustSceneDurations(scriptData.scenes, params.videoLength);

    // Recalculate total duration and word count
    scriptData.totalDuration = calculateTotalScriptDuration(scriptData.scenes);
    scriptData.estimatedWords = calculateTotalWordCount(scriptData.scenes);

    // Ensure all required fields are present
    scriptData.targetAudience = params.targetAudience;
    scriptData.videoStyle = params.videoStyle;

    // Preserve character consistency data if it was generated
    if (params.characterConsistency && scriptData.characters) {
      scriptData.characterConsistency = true;
      console.log('✅ Character consistency enabled with characters:', scriptData.characters);
    } else if (params.characterConsistency) {
      console.warn('⚠️ Character consistency was requested but no characters were generated by AI');
      scriptData.characterConsistency = false;
    }

    // Validate and optimize YouTube metadata if generated
    if (params.generateYouTubeMetadata && scriptData.youtubeMetadata) {
      scriptData.youtubeMetadata = validateAndOptimizeYouTubeMetadata(
        scriptData.youtubeMetadata,
        scriptData.scenes
      );
      console.log('✅ YouTube metadata generated and validated');
    } else if (params.generateYouTubeMetadata) {
      console.warn('⚠️ YouTube metadata was requested but not generated by AI');
    }

    return scriptData;
  } catch (error) {
    console.error('Script generation error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('OpenAI API key not configured')) {
        throw createAIServiceError('OpenAI API key not configured', 'API_KEY_MISSING');
      }
      
      // Re-throw our custom errors
      if (error.message.includes('No response from OpenAI') || 
          error.message.includes('Invalid response format') ||
          error.message.includes('Invalid script structure')) {
        throw error;
      }
    }
    
    throw createAIServiceError(
      'Failed to generate script. Please try again.', 
      'GENERATION_FAILED',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
