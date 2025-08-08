// Export client
export { getOpenAIClient, openai } from './client';

// Export types
export type {
  VideoAnalysis,
  AIGeneratedIdea,
  VideoContentAnalysis,
  ScriptScene,
  GeneratedScript,
  ScriptGenerationParams,
  SpeakingPace,
  DurationCalculationOptions,
  AIServiceError
} from './types';

// Export content ideas functions
export { generateAIContentIdeas } from './content-ideas';

// Export video analysis functions
export { analyzeVideoContent } from './video-analysis';

// Export script generation functions
export { generateScript } from './script-generation';

// Export utility functions
export {
  calculateSceneDuration,
  adjustSceneDurations,
  parseAIResponse,
  extractThemesFromTitle,
  extractKeywordsFromTitle,
  safeJsonParse,
  calculateTotalScriptDuration,
  calculateTotalWordCount,
  createAIServiceError
} from './utils';

// Export prompt functions (for advanced usage)
export {
  SYSTEM_PROMPTS,
  createIdeaGenerationPrompt,
  createVideoAnalysisPrompt,
  createScriptGenerationPrompt
} from './prompts';
