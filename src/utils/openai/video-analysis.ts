import { getOpenAIClient } from './client';
import { VideoAnalysis, VideoContentAnalysis } from './types';
import { SYSTEM_PROMPTS, createVideoAnalysisPrompt } from './prompts';
import { extractThemesFromTitle, extractKeywordsFromTitle, createAIServiceError, safeJsonParse } from './utils';

export async function analyzeVideoContent(video: VideoAnalysis): Promise<VideoContentAnalysis> {
  try {
    const openai = getOpenAIClient();
    const prompt = createVideoAnalysisPrompt(video);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPTS.VIDEO_ANALYST
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw createAIServiceError('No response from OpenAI', 'NO_RESPONSE');
    }

    // Try to parse the JSON response
    const fallbackAnalysis: VideoContentAnalysis = {
      themes: extractThemesFromTitle(video.title),
      contentGaps: [],
      uniqueAngles: [],
      targetKeywords: extractKeywordsFromTitle(video.title)
    };

    return safeJsonParse<VideoContentAnalysis>(response, fallbackAnalysis);
  } catch (error) {
    console.error('Video analysis error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('OpenAI API key not configured')) {
        throw createAIServiceError('OpenAI API key not configured', 'API_KEY_MISSING');
      }
    }
    
    // Return fallback analysis on error
    return {
      themes: extractThemesFromTitle(video.title),
      contentGaps: [],
      uniqueAngles: [],
      targetKeywords: extractKeywordsFromTitle(video.title)
    };
  }
}
