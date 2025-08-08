export interface VideoAnalysis {
  title: string;
  description: string;
  category: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  tags?: string[];
}

export interface AIGeneratedIdea {
  title: string;
  description: string;
  type: 'tutorial' | 'review' | 'comparison' | 'analysis' | 'case-study' | 'deep-dive' | 'reaction' | 'tips' | 'beginner' | 'advanced';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedLength: string;
  targetAudience: string;
  contentOutline: string[];
  concreteExamples: string[];
  toolsAndResources: string[];
  uniqueValueProposition: string;
  seoKeywords: string[];
  contentHooks: string[];
  actionableTakeaways: string[];
  confidenceScore: number;
  // Legacy fields for backward compatibility
  keyPoints?: string[];
}

export interface VideoContentAnalysis {
  themes: string[];
  contentGaps: string[];
  uniqueAngles: string[];
  targetKeywords: string[];
}

export interface Character {
  name: string;
  age: string;
  appearance: string;
  clothing: string;
  personality?: string;
}

export interface ScriptScene {
  id: number;
  narration: string;
  duration: string;
  imagePrompt: string;
  sceneType: 'intro' | 'explanation' | 'demo' | 'transition' | 'conclusion';
  keyPoints: string[];
  wordCount?: number;
  originalDuration?: string;
  audioUrl?: string;
  audioSettings?: {
    voice: string;
    speed: number;
    format: string;
  };
  audioGenerated?: boolean;
  audioDuration?: number;
  charactersInScene?: string[];
}

export interface YouTubeMetadata {
  title: string;              // SEO-optimized title (max 100 chars)
  description: string;        // Full description with timestamps
  tags: string[];            // Relevant tags (max 500 chars total)
  categoryId: number;        // YouTube category ID (1-43)
  privacyStatus: 'private' | 'public' | 'unlisted';
  thumbnail: {
    title: string;           // Text overlay for thumbnail
    style: string;           // Style description for thumbnail generation
  };
  chapters?: {
    time: string;            // Format: "0:00"
    title: string;           // Chapter title
  }[];
}

export interface GeneratedScript {
  title: string;
  totalDuration: string;
  scenes: ScriptScene[];
  estimatedWords: number;
  targetAudience: string;
  videoStyle: string;
  characters?: Character[];
  characterConsistency?: boolean;
  youtubeMetadata?: YouTubeMetadata;
}

export interface ScriptGenerationParams {
  idea: string;
  videoLength: string;
  videoStyle: string;
  targetAudience: string;
  title?: string;
  characterConsistency?: boolean;
  generateYouTubeMetadata?: boolean;
  youtubeCategory?: string;
  targetKeywords?: string[];
}

export type SpeakingPace = 'slow' | 'normal' | 'fast';

export interface DurationCalculationOptions {
  speakingPace?: SpeakingPace;
  targetDuration?: string;
}

export interface AIServiceError extends Error {
  code?: string;
  details?: string;
}
