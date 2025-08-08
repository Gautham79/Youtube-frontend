import { SpeakingPace, ScriptScene, AIGeneratedIdea } from './types';

// Helper function to calculate duration based on word count
export function calculateSceneDuration(
  narration: string, 
  speakingPace: SpeakingPace = 'normal'
): string {
  const wordCount = narration.trim().split(/\s+/).length;
  
  // Words per minute based on speaking pace
  const wordsPerMinute = {
    slow: 130,     // Slower, more deliberate pace
    normal: 160,   // Standard YouTube speaking pace
    fast: 190      // Faster, energetic pace
  };
  
  const wpm = wordsPerMinute[speakingPace];
  const durationInMinutes = wordCount / wpm;
  const totalSeconds = Math.round(durationInMinutes * 60);
  
  // Format duration
  if (totalSeconds < 60) {
    return `${totalSeconds} seconds`;
  } else {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (seconds === 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }
}

// Parse duration string to seconds
export function parseDurationToSeconds(duration: string): number {
  // Handle predefined durations
  const durationMap: { [key: string]: number } = {
    '30 seconds': 30,
    '45 seconds': 45,
    '1 minute': 60,
    '2 minutes': 120,
    '3 minutes': 180,
    '5 minutes': 300
  };
  
  if (durationMap[duration]) {
    return durationMap[duration];
  }
  
  // Handle dynamic duration strings like "5 seconds", "1:30", "2 minutes"
  if (typeof duration === 'string') {
    // Handle "X seconds" format
    const secondsMatch = duration.match(/(\d+)\s*seconds?/i);
    if (secondsMatch) {
      return parseInt(secondsMatch[1]);
    }
    
    // Handle "X minutes" format
    const minutesMatch = duration.match(/(\d+)\s*minutes?/i);
    if (minutesMatch) {
      return parseInt(minutesMatch[1]) * 60;
    }
    
    // Handle "M:SS" format
    const timeMatch = duration.match(/(\d+):(\d+)/);
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1]);
      const seconds = parseInt(timeMatch[2]);
      return (minutes * 60) + seconds;
    }
    
    // Handle pure numbers as strings
    const numberMatch = duration.match(/^\d+$/);
    if (numberMatch) {
      return parseInt(duration);
    }
  }
  
  // Handle numbers passed as duration
  if (typeof duration === 'number') {
    return duration;
  }
  
  // Default fallback
  console.warn(`Could not parse duration: ${duration}, defaulting to 5 seconds`);
  return 5;
}

// Format seconds to duration string
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }
}

// Helper function to calculate total duration and adjust scenes proportionally
export function adjustSceneDurations(scenes: any[], targetVideoLength: string): any[] {
  // Handle flexible video length - calculate duration based on actual content
  if (targetVideoLength === 'flexible') {
    return scenes.map(scene => {
      const wordCount = scene.narration ? scene.narration.split(' ').length : 0;
      // Use standard speaking rate of 160 words per minute
      const durationSeconds = Math.round((wordCount / 160) * 60);
      // Don't clamp the duration - let it be natural based on content
      // This ensures scene duration matches the actual audio length
      const naturalDuration = Math.max(3, durationSeconds); // Only ensure minimum 3 seconds
      
      return {
        ...scene,
        duration: formatDuration(naturalDuration),
        wordCount
      };
    });
  }
  
  // Parse target duration to get total seconds using new function
  const totalTargetSeconds = parseDurationToSeconds(targetVideoLength);
  
  // Calculate words per minute (standard speaking rate)
  const wordsPerMinute = 160;
  const totalTargetWords = Math.round((totalTargetSeconds / 60) * wordsPerMinute);
  
  // Calculate current total words
  const currentTotalWords = scenes.reduce((total, scene) => {
    return total + (scene.narration ? scene.narration.split(' ').length : 0);
  }, 0);
  
  // If we're close to target, just recalculate durations
  if (Math.abs(currentTotalWords - totalTargetWords) / totalTargetWords < 0.2) {
    return scenes.map(scene => {
      const wordCount = scene.narration ? scene.narration.split(' ').length : 0;
      const durationSeconds = Math.round((wordCount / wordsPerMinute) * 60);
      return {
        ...scene,
        duration: formatDuration(durationSeconds),
        wordCount
      };
    });
  }
  
  // Otherwise, adjust scene content proportionally
  const scaleFactor = totalTargetWords / currentTotalWords;
  
  return scenes.map(scene => {
    const currentWords = scene.narration ? scene.narration.split(' ').length : 0;
    const targetWords = Math.round(currentWords * scaleFactor);
    const durationSeconds = Math.round((targetWords / wordsPerMinute) * 60);
    
    return {
      ...scene,
      duration: formatDuration(durationSeconds),
      wordCount: currentWords // Keep actual word count, not target
    };
  });
}

// Legacy function for backward compatibility
export function adjustSceneDurationsLegacy(scenes: any[], targetDuration: string): any[] {
  const targetMatch = targetDuration.match(/(\d+)[-–](\d+)\s*minutes?/);
  if (!targetMatch) return scenes;
  
  const minTarget = parseInt(targetMatch[1]) * 60;
  const maxTarget = parseInt(targetMatch[2]) * 60;
  const targetSeconds = (minTarget + maxTarget) / 2; // Use average
  
  // Calculate current total duration
  let currentTotalSeconds = 0;
  scenes.forEach(scene => {
    const wordCount = scene.narration.trim().split(/\s+/).length;
    currentTotalSeconds += Math.round((wordCount / 160) * 60); // Use normal pace for calculation
  });
  
  // If current duration is significantly different from target, adjust proportionally
  const ratio = targetSeconds / currentTotalSeconds;
  
  // Only adjust if the difference is significant (more than 20% off)
  if (ratio < 0.8 || ratio > 1.2) {
    const adjustedScenes = scenes.map(scene => {
      const wordCount = scene.narration.trim().split(/\s+/).length;
      const originalSeconds = Math.round((wordCount / 160) * 60);
      const adjustedSeconds = Math.round(originalSeconds * ratio);
      
      // Format adjusted duration
      let adjustedDuration;
      if (adjustedSeconds < 60) {
        adjustedDuration = `${adjustedSeconds} seconds`;
      } else {
        const minutes = Math.floor(adjustedSeconds / 60);
        const seconds = adjustedSeconds % 60;
        if (seconds === 0) {
          adjustedDuration = `${minutes} minute${minutes > 1 ? 's' : ''}`;
        } else {
          adjustedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
      }
      
      return {
        ...scene,
        duration: adjustedDuration,
        originalDuration: calculateSceneDuration(scene.narration),
        wordCount: wordCount
      };
    });
    
    return adjustedScenes;
  }
  
  // If duration is close to target, use calculated durations
  return scenes.map(scene => ({
    ...scene,
    duration: calculateSceneDuration(scene.narration),
    wordCount: scene.narration.trim().split(/\s+/).length
  }));
}

// Parse AI response with fallback handling
export function parseAIResponse(response: string): AIGeneratedIdea[] {
  try {
    // Clean the response - remove markdown code blocks if present
    let cleanedResponse = response.trim();
    
    // Remove markdown code block markers
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '');
    }
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '');
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
    }
    
    // Additional cleaning for common JSON issues
    cleanedResponse = cleanedResponse
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
      .trim();
    
    // Find JSON array boundaries more reliably
    const startIndex = cleanedResponse.indexOf('[');
    const endIndex = cleanedResponse.lastIndexOf(']');
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      cleanedResponse = cleanedResponse.substring(startIndex, endIndex + 1);
    }
    
    // Try to parse as JSON
    const parsed = JSON.parse(cleanedResponse);
    if (Array.isArray(parsed)) {
      return parsed.map(idea => normalizeAIGeneratedIdea(idea));
    }
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', error);
    console.error('Original response:', response);
    
    // Try to fix common JSON issues and parse again
    try {
      const fixedResponse = fixCommonJSONIssues(response);
      const parsed = JSON.parse(fixedResponse);
      if (Array.isArray(parsed)) {
        return parsed.map(idea => normalizeAIGeneratedIdea(idea));
      }
    } catch (secondError) {
      console.error('Second parsing attempt failed:', secondError);
    }
  }

  // Fallback: extract ideas from text response
  return extractIdeasFromText(response);
}

// More aggressive JSON fixing for malformed responses
function fixCommonJSONIssues(response: string): string {
  let fixed = response.trim();
  
  // Remove markdown code blocks
  fixed = fixed.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Find the JSON array
  const startIndex = fixed.indexOf('[');
  const endIndex = fixed.lastIndexOf(']');
  
  if (startIndex === -1 || endIndex === -1) {
    throw new Error('No valid JSON array found');
  }
  
  fixed = fixed.substring(startIndex, endIndex + 1);
  
  try {
    // Try to parse each object individually and reconstruct
    const objects = [];
    let currentObject = '';
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 1; i < fixed.length - 1; i++) { // Skip opening and closing brackets
      const char = fixed[i];
      
      if (escapeNext) {
        currentObject += char;
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        currentObject += char;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
      }
      
      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        }
      }
      
      currentObject += char;
      
      if (braceCount === 0 && currentObject.trim() && !inString) {
        // End of an object
        let objStr = currentObject.trim();
        if (objStr.endsWith(',')) {
          objStr = objStr.slice(0, -1);
        }
        
        if (objStr.startsWith('{') && objStr.endsWith('}')) {
          try {
            // Try to fix and parse this individual object
            const fixedObj = fixIndividualObject(objStr);
            const parsed = JSON.parse(fixedObj);
            objects.push(parsed);
          } catch (e) {
            console.warn('Failed to parse individual object:', objStr);
          }
        }
        
        currentObject = '';
      }
    }
    
    return JSON.stringify(objects);
  } catch (e) {
    // Fallback to basic string replacement
    return basicJSONFix(fixed);
  }
}

function fixIndividualObject(objStr: string): string {
  return objStr
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/,(\s*})/g, '$1') // Remove trailing commas
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // Quote unquoted keys
    .replace(/:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*([,}])/g, ':"$1"$2') // Quote unquoted string values
    .replace(/\\n/g, '\\n') // Fix newline escaping
    .replace(/\\"([^"]*)\\":/g, '"$1":') // Fix escaped quotes in keys
    .replace(/:\s*\\"([^"]*)\\"([,}])/g, ':"$1"$2'); // Fix escaped quotes in values
}

function basicJSONFix(fixed: string): string {
  return fixed
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // Quote unquoted keys
    .replace(/:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*([,}\]])/g, ':"$1"$2') // Quote unquoted string values
    .replace(/\\n/g, '\\n') // Fix newline escaping
    .replace(/\\"([^"]*)\\":/g, '"$1":') // Fix escaped quotes in keys
    .replace(/:\s*\\"([^"]*)\\"([,}\]])/g, ':"$1"$2'); // Fix escaped quotes in values
}

// Normalize AI generated idea to ensure all required fields are present
function normalizeAIGeneratedIdea(idea: any): AIGeneratedIdea {
  return {
    title: idea.title || 'Untitled Content Idea',
    description: idea.description || 'AI-generated content idea',
    type: idea.type || 'tutorial',
    difficulty: idea.difficulty || 'intermediate',
    estimatedLength: idea.estimatedLength || '10-15 minutes',
    targetAudience: idea.targetAudience || 'General audience',
    contentOutline: idea.contentOutline || idea.keyPoints || [
      'Introduction and overview',
      'Main content points',
      'Practical examples',
      'Implementation steps',
      'Conclusion and next steps'
    ],
    concreteExamples: idea.concreteExamples || [
      'Real-world example 1',
      'Case study or demonstration'
    ],
    toolsAndResources: idea.toolsAndResources || [
      'Relevant tools',
      'Helpful resources'
    ],
    uniqueValueProposition: idea.uniqueValueProposition || 'Unique perspective on trending topic',
    seoKeywords: idea.seoKeywords || extractKeywordsFromTitle(idea.title || ''),
    contentHooks: idea.contentHooks || [
      'Attention-grabbing opening',
      'Compelling hook'
    ],
    actionableTakeaways: idea.actionableTakeaways || [
      'Specific action viewers can take',
      'Practical skill they will learn'
    ],
    confidenceScore: idea.confidenceScore || 7,
    // Legacy support
    keyPoints: idea.keyPoints || idea.contentOutline
  };
}

// Fallback text extraction for when JSON parsing fails
function extractIdeasFromText(text: string): AIGeneratedIdea[] {
  const ideas: AIGeneratedIdea[] = [];
  const lines = text.split('\n');
  
  let currentIdea: Partial<AIGeneratedIdea> = {};
  
  for (const line of lines) {
    if (line.includes('Title:') || line.includes('title:')) {
      if (currentIdea.title) {
        ideas.push(currentIdea as AIGeneratedIdea);
        currentIdea = {};
      }
      currentIdea.title = line.replace(/.*title:\s*/i, '').trim();
    } else if (line.includes('Description:') || line.includes('description:')) {
      currentIdea.description = line.replace(/.*description:\s*/i, '').trim();
    }
  }
  
  if (currentIdea.title) {
    ideas.push(normalizeAIGeneratedIdea({
      title: currentIdea.title,
      description: currentIdea.description || 'AI-generated content idea',
      type: 'tutorial',
      difficulty: 'intermediate',
      estimatedLength: '10-15 minutes',
      targetAudience: 'General audience',
      keyPoints: ['Key point 1', 'Key point 2', 'Key point 3'],
      seoKeywords: extractKeywordsFromTitle(currentIdea.title || ''),
      confidenceScore: 7
    }));
  }
  
  return ideas;
}

// Extract themes from title (simple keyword extraction)
export function extractThemesFromTitle(title: string): string[] {
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'how', 'what', 'why', 'when', 'where'];
  const words = title.toLowerCase().split(/\s+/).filter(word => 
    word.length > 3 && !commonWords.includes(word)
  );
  return words.slice(0, 5);
}

// Extract keywords from title
export function extractKeywordsFromTitle(title: string): string[] {
  return extractThemesFromTitle(title);
}

// Safe JSON parsing with error handling
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON parsing failed:', error);
    return fallback;
  }
}

// Calculate total script duration from scenes
export function calculateTotalScriptDuration(scenes: ScriptScene[]): string {
  let totalSeconds = 0;
  
  scenes.forEach(scene => {
    const wordCount = scene.wordCount || scene.narration.trim().split(/\s+/).length;
    totalSeconds += Math.round((wordCount / 160) * 60); // Use normal speaking pace
  });

  const totalMinutes = Math.round(totalSeconds / 60);
  return `${totalMinutes} minutes`;
}

// Calculate total word count from scenes
export function calculateTotalWordCount(scenes: ScriptScene[]): number {
  return scenes.reduce((total, scene) => {
    return total + (scene.wordCount || scene.narration.trim().split(/\s+/).length);
  }, 0);
}

// Create AI service error
export function createAIServiceError(message: string, code?: string, details?: string): Error {
  const error = new Error(message) as any;
  error.code = code;
  error.details = details;
  return error;
}
