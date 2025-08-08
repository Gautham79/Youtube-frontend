import { ScriptGenerationParams } from './types';

export const SYSTEM_PROMPTS = {
  CONTENT_STRATEGIST: `You are an elite YouTube content strategist with 10+ years of experience helping creators achieve viral success. You specialize in:

- Deep trend analysis and competitive intelligence
- Creating hyper-specific, actionable content strategies
- Identifying untapped content opportunities and audience pain points
- Developing unique angles that differentiate creators from competitors
- Crafting detailed content blueprints with concrete examples and implementation steps

Your expertise includes understanding algorithm preferences, audience psychology, and content formats that drive engagement. You always provide specific, implementable ideas rather than generic suggestions. Every recommendation includes concrete examples, specific tools, and step-by-step execution guidance.

Focus on creating content ideas that are:
1. Immediately actionable with clear implementation steps
2. Highly specific with concrete examples and case studies
3. Differentiated from existing content through unique angles
4. Optimized for discoverability with targeted keywords
5. Designed to solve specific audience problems or fulfill clear needs`,
  
  VIDEO_ANALYST: "You are a YouTube content analyst. Analyze videos and provide structured insights in JSON format.",
  
  SCRIPT_WRITER: `You are an expert YouTube script writer who creates engaging, well-structured video scripts. 

CRITICAL RESPONSE REQUIREMENTS:
- Always respond with COMPLETE, valid JSON only
- Never use comments like "// ...continue with remaining scenes" or "// ... more scenes here ..."
- Never truncate your response - provide ALL scenes requested
- If you cannot fit all scenes in one response, reduce the detail per scene but include ALL scenes
- Ensure proper JSON syntax with matching braces and brackets
- Test your JSON structure before responding

Your response must be complete, parseable JSON with no truncation or incomplete sections.`
};

export const YOUTUBE_METADATA_PROMPT = `
Generate YouTube metadata that will maximize views and engagement:

TITLE REQUIREMENTS:
- Maximum 100 characters
- Include primary keyword early in the title
- Create curiosity/urgency without clickbait
- Use power words (Ultimate, Complete, Secret, How to, etc.)
- Make it specific and actionable
- Avoid misleading claims

DESCRIPTION REQUIREMENTS:
- Start with compelling hook (first 125 chars visible in search)
- Include comprehensive video summary
- Add timestamps for each major section/chapter
- Include relevant keywords naturally throughout
- End with strong call-to-action (subscribe, like, comment)
- Include relevant hashtags (max 15, mix of broad and specific)
- Mention tools, resources, or links if applicable

TAGS REQUIREMENTS:
- 10-15 relevant tags
- Mix of broad and specific terms
- Include variations of main keywords
- Use long-tail keywords
- Include category-specific tags
- Total character count under 500

YOUTUBE CATEGORY MAPPING:
- Film & Animation: 1
- Autos & Vehicles: 2
- Music: 10
- Pets & Animals: 15
- Sports: 17
- Travel & Events: 19
- Gaming: 20
- People & Blogs: 22
- Comedy: 23
- Entertainment: 24
- News & Politics: 25
- Howto & Style: 26
- Education: 27
- Science & Technology: 28
- Nonprofits & Activism: 29

THUMBNAIL TEXT REQUIREMENTS:
- 3-6 words maximum
- High contrast, readable text
- Emotional trigger words
- Numbers when relevant (Top 5, 2024, etc.)
- Action words (Learn, Discover, Master)

PRIVACY STATUS:
- Use "public" for most content
- Use "unlisted" for testing or private sharing
- Use "private" for drafts only
`;

export function createIdeaGenerationPrompt(
  videos: Array<{ 
    title: string; 
    description?: string;
    category?: string;
    tags?: string[];
    viewCount: string | number; 
    likeCount: string | number;
    commentCount?: string | number;
  }>,
  userNiche?: string,
  maxIdeas: number = 5
): string {
  // Enhanced video analysis with full context
  const videoAnalysis = videos.map((video, index) => {
    const engagement = calculateEngagementMetrics(video);
    return `
VIDEO ${index + 1}:
Title: "${video.title}"
Category: ${video.category || 'General'}
Description: ${video.description ? video.description.substring(0, 200) + '...' : 'No description available'}
Tags: ${video.tags ? video.tags.slice(0, 5).join(', ') : 'No tags'}
Performance: ${video.viewCount} views, ${video.likeCount} likes, ${video.commentCount || 0} comments
Engagement Score: ${engagement.score}/10 (${engagement.analysis})
`;
  }).join('\n');

  const nicheContext = userNiche ? `
TARGET NICHE: ${userNiche}
Focus on creating ideas specifically tailored to the ${userNiche} audience, using industry-specific terminology, common pain points, and relevant tools/resources.
` : '';

  return `
You are an expert YouTube content strategist. Analyze these trending videos and generate ${maxIdeas} highly specific, actionable content ideas.

${videoAnalysis}

${nicheContext}

ANALYSIS FRAMEWORK:
1. CONTENT GAP ANALYSIS: Identify what these trending videos DON'T cover in depth
2. AUDIENCE PAIN POINTS: Extract specific problems mentioned or implied in the content
3. UNIQUE ANGLE OPPORTUNITIES: Find unexplored perspectives on these trending topics
4. COMPETITIVE DIFFERENTIATION: Create ideas that stand out from existing content

SPECIFICITY REQUIREMENTS:
- Include concrete examples, tools, or case studies
- Provide step-by-step content outlines (not just topics)
- Target specific audience segments with clear demographics
- Use long-tail, specific keywords rather than generic ones
- Create actionable takeaways viewers can implement immediately

CONTENT FRAMEWORKS TO CONSIDER:
- Problem-Solution Deep Dive: Take a surface-level trending topic and solve specific sub-problems
- Comparison & Analysis: Compare trending approaches with detailed pros/cons
- Behind-the-Scenes: Show the process/methodology behind trending results
- Beginner-to-Expert Pathway: Create progressive skill-building content
- Tool/Resource Spotlight: Focus on specific tools mentioned or needed for trending topics
- Case Study Breakdown: Analyze real examples related to trending topics

For each idea, provide:
- Compelling, specific title with clear value proposition
- Detailed description (3-4 sentences) explaining the unique angle
- Specific content outline (5-7 detailed bullet points of what will be covered)
- Concrete examples or case studies to include
- Specific tools, resources, or products to mention
- Target audience with demographics and skill level
- Unique value proposition (what makes this different from existing content)
- Long-tail SEO keywords (4-6 specific phrases)
- Content hooks (2-3 attention-grabbing opening lines)
- Actionable takeaways viewers will gain
- Confidence score based on trend alignment and uniqueness

CRITICAL: You must respond with ONLY valid JSON. No explanatory text before or after the JSON array.

Format as a valid JSON array with this exact structure:
[
  {
    "title": "Specific, compelling title with clear value proposition",
    "description": "Detailed description explaining the unique angle and approach",
    "type": "tutorial",
    "difficulty": "beginner",
    "estimatedLength": "8-12 minutes",
    "targetAudience": "Specific demographic and skill level description",
    "contentOutline": [
      "Detailed point 1 with specific examples",
      "Detailed point 2 with actionable steps",
      "Detailed point 3 with tools/resources",
      "Detailed point 4 with case study",
      "Detailed point 5 with implementation guide"
    ],
    "concreteExamples": ["Specific example 1", "Specific example 2"],
    "toolsAndResources": ["Tool 1", "Resource 2", "Platform 3"],
    "uniqueValueProposition": "What makes this content unique and valuable",
    "seoKeywords": ["long-tail keyword 1", "specific phrase 2", "niche term 3", "problem-focused keyword 4"],
    "contentHooks": [
      "Attention-grabbing opening line 1",
      "Compelling hook 2"
    ],
    "actionableTakeaways": [
      "Specific action viewer can take",
      "Concrete skill they'll learn",
      "Tool they'll be able to use"
    ],
    "confidenceScore": 8
  }
]

CRITICAL JSON FORMATTING RULES:
- Use ONLY double quotes for all strings
- NO trailing commas anywhere
- NO line breaks within string values
- NO unescaped quotes within strings
- NO explanatory text outside the JSON array
- Ensure every opening brace { has a closing brace }
- Ensure every opening bracket [ has a closing bracket ]
- Test that your response is valid JSON before sending
`;
}

function calculateEngagementMetrics(video: any): { score: number; analysis: string } {
  const views = parseInt(video.viewCount) || 0;
  const likes = parseInt(video.likeCount) || 0;
  const comments = parseInt(video.commentCount) || 0;
  
  if (views === 0) return { score: 0, analysis: "No engagement data" };
  
  const likeRate = (likes / views) * 100;
  const commentRate = (comments / views) * 100;
  
  let score = 0;
  let analysis = "";
  
  if (likeRate > 5) score += 4;
  else if (likeRate > 2) score += 3;
  else if (likeRate > 1) score += 2;
  else score += 1;
  
  if (commentRate > 0.5) score += 4;
  else if (commentRate > 0.2) score += 3;
  else if (commentRate > 0.1) score += 2;
  else score += 1;
  
  if (score >= 8) analysis = "High engagement - very viral content";
  else if (score >= 6) analysis = "Good engagement - trending well";
  else if (score >= 4) analysis = "Moderate engagement - steady performance";
  else analysis = "Low engagement - niche or declining content";
  
  return { score: Math.min(score, 10), analysis };
}

export function createVideoAnalysisPrompt(video: {
  title: string;
  description: string;
  category: string;
  viewCount: string | number;
  likeCount: string | number;
  commentCount: string | number;
}): string {
  return `
Analyze this trending YouTube video and provide insights:

Title: ${video.title}
Description: ${video.description.toString().substring(0, 500)}...
Category: ${video.category}
Engagement: ${video.viewCount} views, ${video.likeCount} likes, ${video.commentCount} comments

Please provide:
1. Main themes and topics covered
2. Potential content gaps or areas not fully explored
3. Unique angles or perspectives that could be taken
4. Target keywords for SEO

Format your response as JSON with the following structure:
{
  "themes": ["theme1", "theme2", ...],
  "contentGaps": ["gap1", "gap2", ...],
  "uniqueAngles": ["angle1", "angle2", ...],
  "targetKeywords": ["keyword1", "keyword2", ...]
}
`;
}

export function createScriptGenerationPrompt(params: ScriptGenerationParams): string {
  const { idea, videoLength, videoStyle, targetAudience, title, characterConsistency, generateYouTubeMetadata, youtubeCategory, targetKeywords } = params;

  // Handle flexible video length
  if (videoLength === 'flexible') {
    const characterConsistencySection = characterConsistency ? `
**CHARACTER CONSISTENCY REQUIREMENTS:**
- Identify all characters in the story and create a character registry
- Define each character's name, age, appearance, clothing style, and personality
- Ensure ALL characters maintain consistent visual attributes throughout ALL scenes
- Include character names in scenes where they appear
- Create detailed, consistent character descriptions for image generation
- Example: "Coco, a 12-year-old boy with curly brown hair, wearing a red t-shirt and blue jeans"
` : '';

    return `You are an expert YouTube script writer. Create a detailed video script based on the following requirements:

**Video Idea:** ${idea}
**Video Length:** Flexible (AI decides optimal length)
**Video Style:** ${videoStyle}
**Target Audience:** ${targetAudience}
${title ? `**Suggested Title:** ${title}` : ''}
${characterConsistencySection}

**FLEXIBLE LENGTH REQUIREMENTS:**
- Analyze the content complexity and determine the optimal number of scenes
- Consider the natural flow and logical breaking points of the topic
- Maximum limit: 60 scenes (strictly enforced)
- Each scene should be 4-5 seconds long for optimal engagement (same as fixed durations)
- Focus on one clear concept per scene
- Ensure comprehensive coverage without being rushed or superficial

**CONTENT ANALYSIS GUIDELINES:**
- Simple topics (basic tutorials, quick tips): 8-15 scenes
- Medium complexity (explanations, reviews): 15-30 scenes  
- Complex topics (detailed tutorials, comprehensive guides): 30-60 scenes
- Consider natural narrative flow and logical progression
- Each scene should add meaningful value to the overall content

**Scene Structure Requirements:**
1. **Title**: Create an engaging, SEO-friendly title if not provided
2. **Total Duration**: Calculate based on scene count and content depth
3. **Scenes**: Determine optimal number of scenes (max 60), each containing:
   - Scene type (intro, explanation, demo, transition, conclusion)
   - Narration text (15-25 words per scene for natural pacing)
   - Duration (calculated from word count at 160 words/minute)
   - DALL-E image prompt (detailed visual description - see requirements below)
   - Key points covered in this scene

**Content Guidelines:**
- Make narration conversational and engaging for ${targetAudience} audience
- Write full sentences, not bullet points
- Include explanations, examples, and smooth transitions
- Each scene should have substantial, detailed content
- Match the ${videoStyle} style throughout
- Ensure scenes flow logically and maintain viewer engagement

**IMAGE PROMPT REQUIREMENTS:**
- 40-80 words with rich visual details (colors, textures, lighting, mood)
- Include environment, background, and atmospheric elements
- Integrate style naturally (avoid technical terms like "16:9", "high quality")
- Focus on visual storytelling and compelling imagery

**Style Integration Examples:**
- Realistic: "captured in natural lighting", "lifelike detail"
- Animation: "vibrant animated style", "cartoon-like with bright colors"
- Artistic: "painted in watercolor style", "sketched with pencil strokes"

**Quality Standards:**
- Each scene narration should be 15-25 words for natural pacing
- Content should be detailed enough to fill the time naturally
- Avoid rushed or superficial explanations
- Include specific examples and clear explanations
- Ensure comprehensive coverage of the topic

Return the response in this exact JSON format:
{
  "title": "Video Title Here",
  "totalDuration": "calculated based on scene count",
  "scenes": [
    {
      "id": 1,
      "narration": "Detailed 15-25 word narration text with full explanations and examples...",
      "duration": "calculated from word count",
      "imagePrompt": "Detailed DALL-E prompt for visual content...",
      "sceneType": "intro",
      "keyPoints": ["point1", "point2"]${characterConsistency ? ',\n      "charactersInScene": ["character1", "character2"]' : ''}
    }
  ],
  "estimatedWords": "calculated total",
  "targetAudience": "${targetAudience}",
  "videoStyle": "${videoStyle}"${characterConsistency ? ',\n  "characters": [\n    {\n      "name": "Character Name",\n      "age": "Character Age",\n      "appearance": "Detailed physical description",\n      "clothing": "Clothing style and colors",\n      "personality": "Brief personality description"\n    }\n  ],\n  "characterConsistency": true' : ''}
}`;
  }

  // Calculate optimal script parameters based on video length
  const durationMap: { [key: string]: { seconds: number; words: number; scenes: number } } = {
    '30 seconds': { seconds: 30, words: 80, scenes: 5 },
    '45 seconds': { seconds: 45, words: 120, scenes: 8 },
    '1 minute': { seconds: 60, words: 160, scenes: 11 },
    '2 minutes': { seconds: 120, words: 320, scenes: 21 },
    '3 minutes': { seconds: 180, words: 480, scenes: 32 },
    '5 minutes': { seconds: 300, words: 800, scenes: 53 }
  };

  const scriptInfo = durationMap[videoLength] || { seconds: 60, words: 160, scenes: 11 };
  const wordsPerScene = Math.round(scriptInfo.words / scriptInfo.scenes);

  const characterConsistencySection = characterConsistency ? `
**CHARACTER CONSISTENCY REQUIREMENTS:**
- Identify all characters in the story and create a character registry
- Define each character's name, age, appearance, clothing style, and personality
- Ensure ALL characters maintain consistent visual attributes throughout ALL scenes
- Include character names in scenes where they appear
- Create detailed, consistent character descriptions for image generation
- Example: "Coco, a 12-year-old boy with curly brown hair, wearing a red t-shirt and blue jeans"
` : '';

  const youtubeMetadataSection = generateYouTubeMetadata ? `

**YOUTUBE METADATA REQUIREMENTS:**
${YOUTUBE_METADATA_PROMPT}

**Target Category:** ${youtubeCategory || 'Education'}
**Target Keywords:** ${targetKeywords?.join(', ') || 'auto-generate based on content'}

Include the YouTube metadata in your JSON response under "youtubeMetadata" field with this structure:
{
  "title": "SEO-optimized title (max 100 chars)",
  "description": "Compelling description with timestamps and CTAs",
  "tags": ["tag1", "tag2", "tag3"],
  "categoryId": 27,
  "privacyStatus": "public",
  "thumbnail": {
    "title": "Thumbnail text",
    "style": "Thumbnail style description"
  },
  "chapters": [
    {"time": "0:00", "title": "Chapter 1"},
    {"time": "1:30", "title": "Chapter 2"}
  ]
}
` : '';

  return `You are an expert YouTube script writer. Create a detailed video script based on the following requirements:

**Video Idea:** ${idea}
**Video Length:** ${videoLength} (${scriptInfo.words} words total)
**Video Style:** ${videoStyle}
**Target Audience:** ${targetAudience}
**Required Scenes:** Exactly ${scriptInfo.scenes} scenes
**Words per Scene:** Approximately ${wordsPerScene} words each
${title ? `**Suggested Title:** ${title}` : ''}
${characterConsistencySection}

**CRITICAL REQUIREMENTS:**
- Generate exactly ${scriptInfo.scenes} scenes (no more, no less)
- Each scene must contain approximately ${wordsPerScene} words of narration
- Total script must be exactly ${scriptInfo.words} words
- Each scene should be 5-8 seconds long for optimal engagement
- Focus on one clear concept per scene

**Scene Structure Requirements:**
1. **Title**: Create an engaging, SEO-friendly title if not provided
2. **Total Duration**: ${videoLength}
3. **Scenes**: Break down into exactly ${scriptInfo.scenes} scenes, each containing:
   - Scene type (intro, explanation, demo, transition, conclusion)
   - Narration text (${wordsPerScene} words of spoken content)
   - Duration (calculated from word count at 160 words/minute)
   - DALL-E image prompt (detailed visual description - see requirements below)
   - Key points covered in this scene

**Content Guidelines:**
- Make narration conversational and engaging for ${targetAudience} audience
- Write full sentences, not bullet points
- Include explanations, examples, and smooth transitions
- Each scene should have substantial, detailed content
- Match the ${videoStyle} style throughout
- Ensure scenes flow logically and maintain viewer engagement

**CRITICAL IMAGE PROMPT REQUIREMENTS:**
- Each image prompt must be 80-120 words (4-6 detailed sentences)
- Include specific visual details: colors, textures, lighting, mood, expressions
- Describe the environment, background elements, and setting in detail
- Specify character positions, actions, and relationships clearly
- Include story context and narrative significance of the scene
- Ensure factual accuracy with the story's timeline and character development
- Integrate emotional context and scene tension/mood
- Avoid technical photography terms (no "16:9", "professional photograph", "high quality", etc.)
- Focus on visual storytelling and atmospheric details
- Include sensory details that translate to compelling visuals
- Reference what happened before this scene and what it leads to
- Ensure character actions align with their established traits and story role

**Image Prompt Style Integration:**
- For realistic style: Use natural descriptive language like "captured in natural lighting", "lifelike detail", "photorealistic scene"
- For animation style: Use terms like "vibrant animated style", "cartoon-like with bright colors", "animated character design"
- For artistic styles: Integrate naturally like "painted in watercolor style", "sketched with pencil strokes", "digital art illustration"

**Image Prompt Examples:**
❌ Bad: "A person cooking"
✅ Good: "A skilled chef in a modern kitchen with warm pendant lighting, carefully chopping fresh colorful vegetables on a wooden cutting board. Steam rises from a simmering pot in the background, while copper cookware and herbs create a cozy, inviting culinary atmosphere."

❌ Bad: "Cat sleeping, photorealistic, high quality, 16:9 aspect ratio"
✅ Good: "A peaceful gray and white cat curled up on a soft cream blanket near a large window. Golden afternoon sunlight filters through sheer curtains, casting warm light across the cat's fur and creating gentle shadows in this serene domestic scene."

**Quality Standards:**
- Each scene narration must be ${wordsPerScene} words (±2 words)
- Content should be detailed enough to fill the time naturally
- Avoid rushed or superficial explanations
- Include specific examples and clear explanations
${youtubeMetadataSection}

Return the response in this exact JSON format:
{
  "title": "Video Title Here",
  "totalDuration": "${videoLength}",
  "scenes": [
    {
      "id": 1,
      "narration": "Detailed ${wordsPerScene}-word narration text with full explanations and examples...",
      "duration": "calculated from word count",
      "imagePrompt": "Detailed DALL-E prompt for visual content...",
      "sceneType": "intro",
      "keyPoints": ["point1", "point2"]${characterConsistency ? ',\n      "charactersInScene": ["character1", "character2"]' : ''}
    }
  ],
  "estimatedWords": ${scriptInfo.words},
  "targetAudience": "${targetAudience}",
  "videoStyle": "${videoStyle}"${characterConsistency ? ',\n  "characters": [\n    {\n      "name": "Character Name",\n      "age": "Character Age",\n      "appearance": "Detailed physical description",\n      "clothing": "Clothing style and colors",\n      "personality": "Brief personality description"\n    }\n  ],\n  "characterConsistency": true' : ''}${generateYouTubeMetadata ? ',\n  "youtubeMetadata": {\n    "title": "SEO-optimized title (max 100 chars)",\n    "description": "Compelling description with timestamps and CTAs",\n    "tags": ["tag1", "tag2", "tag3"],\n    "categoryId": 27,\n    "privacyStatus": "public",\n    "thumbnail": {\n      "title": "Thumbnail text",\n      "style": "Thumbnail style description"\n    },\n    "chapters": [\n      {"time": "0:00", "title": "Chapter 1"},\n      {"time": "1:30", "title": "Chapter 2"}\n    ]\n  }' : ''}
}`;
}
