import { getOpenAIClient } from './client';
import { VideoAnalysis, AIGeneratedIdea } from './types';
import { SYSTEM_PROMPTS, createIdeaGenerationPrompt } from './prompts';
import { parseAIResponse, createAIServiceError } from './utils';

export async function generateAIContentIdeas(
  videos: VideoAnalysis[],
  userNiche?: string,
  maxIdeas: number = 5
): Promise<AIGeneratedIdea[]> {
  try {
    const openai = getOpenAIClient();
    const prompt = createIdeaGenerationPrompt(videos, userNiche, maxIdeas);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using GPT-4 for better analysis and specificity
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPTS.CONTENT_STRATEGIST
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7, // Slightly lower for more focused, specific responses
      max_tokens: 4000, // Increased for detailed responses
      presence_penalty: 0.1, // Encourage diverse ideas
      frequency_penalty: 0.1, // Reduce repetition
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw createAIServiceError('No response from OpenAI', 'NO_RESPONSE');
    }

    return parseAIResponse(response);
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('OpenAI API key not configured')) {
        throw createAIServiceError('OpenAI API key not configured', 'API_KEY_MISSING');
      }
    }
    
    throw createAIServiceError('Failed to generate AI content ideas', 'GENERATION_FAILED', error instanceof Error ? error.message : 'Unknown error');
  }
}
