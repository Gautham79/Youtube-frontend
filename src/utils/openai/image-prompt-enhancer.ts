import { ScriptScene } from './types';

interface StoryContext {
  title: string;
  scenes: ScriptScene[];
  characters?: Array<{
    name: string;
    age: string;
    appearance: string;
    clothing: string;
    personality?: string;
  }>;
  videoStyle: string;
  targetAudience: string;
}

interface EnhancedImagePrompt {
  originalPrompt: string;
  enhancedPrompt: string;
  storyContext: string;
  factualValidation: string[];
  characterPositions: string[];
}

/**
 * Enhances image prompts with story context, factual validation, and narrative flow
 */
export function enhanceImagePromptWithStoryContext(
  scene: ScriptScene,
  sceneIndex: number,
  storyContext: StoryContext
): EnhancedImagePrompt {
  const { scenes, characters, title, videoStyle, targetAudience } = storyContext;
  
  // Get previous and next scenes for context
  const previousScene = sceneIndex > 0 ? scenes[sceneIndex - 1] : null;
  const nextScene = sceneIndex < scenes.length - 1 ? scenes[sceneIndex + 1] : null;
  
  // Extract story progression context
  const storyProgressionContext = buildStoryProgressionContext(
    scene,
    previousScene,
    nextScene,
    sceneIndex,
    scenes.length,
    title
  );
  
  // Validate factual accuracy
  const factualValidation = validateSceneFactualAccuracy(
    scene,
    scenes,
    sceneIndex,
    title
  );
  
  // Determine character positions and relationships
  const characterPositions = determineCharacterPositions(
    scene,
    characters,
    previousScene,
    storyProgressionContext
  );
  
  // Build enhanced prompt
  const enhancedPrompt = buildEnhancedImagePrompt(
    scene.imagePrompt || '',
    storyProgressionContext,
    characterPositions,
    factualValidation,
    videoStyle,
    targetAudience
  );
  
  return {
    originalPrompt: scene.imagePrompt || '',
    enhancedPrompt,
    storyContext: storyProgressionContext,
    factualValidation,
    characterPositions
  };
}

/**
 * Builds story progression context for the current scene
 */
function buildStoryProgressionContext(
  currentScene: ScriptScene,
  previousScene: ScriptScene | null,
  nextScene: ScriptScene | null,
  sceneIndex: number,
  totalScenes: number,
  storyTitle: string
): string {
  const progressPercentage = Math.round((sceneIndex / (totalScenes - 1)) * 100);
  
  let context = `Story: "${storyTitle}" - Scene ${sceneIndex + 1} of ${totalScenes} (${progressPercentage}% through story). `;
  
  // Add what happened before
  if (previousScene) {
    context += `Previous scene showed: ${extractSceneEssence(previousScene)}. `;
  } else {
    context += `This is the opening scene. `;
  }
  
  // Add current scene significance
  context += `Current scene represents: ${extractSceneEssence(currentScene)}. `;
  
  // Add what comes next
  if (nextScene) {
    context += `This leads to: ${extractSceneEssence(nextScene)}. `;
  } else {
    context += `This is the concluding scene. `;
  }
  
  // Add story arc position
  if (progressPercentage < 25) {
    context += `Story position: Introduction/Setup phase. `;
  } else if (progressPercentage < 50) {
    context += `Story position: Rising action/Development phase. `;
  } else if (progressPercentage < 75) {
    context += `Story position: Climax/Peak tension phase. `;
  } else {
    context += `Story position: Resolution/Conclusion phase. `;
  }
  
  return context;
}

/**
 * Extracts the essence of what a scene is about
 */
function extractSceneEssence(scene: ScriptScene): string {
  const narration = scene.narration || '';
  const keyPoints = scene.keyPoints || [];
  
  // Extract key actions and subjects from narration
  const essence = narration.length > 50 
    ? narration.substring(0, 50) + '...'
    : narration;
    
  if (keyPoints.length > 0) {
    return `${essence} (Key: ${keyPoints[0]})`;
  }
  
  return essence;
}

/**
 * Validates factual accuracy of the scene within the story context
 */
function validateSceneFactualAccuracy(
  scene: ScriptScene,
  allScenes: ScriptScene[],
  sceneIndex: number,
  storyTitle: string
): string[] {
  const validations: string[] = [];
  
  // Check for common story logic issues
  const narration = (scene.narration || '').toLowerCase();
  const imagePrompt = (scene.imagePrompt || '').toLowerCase();
  
  // Detect potential factual issues based on story patterns
  if (storyTitle.toLowerCase().includes('hare') && storyTitle.toLowerCase().includes('tortoise')) {
    validateHareAndTortoiseStory(scene, allScenes, sceneIndex, validations);
  }
  
  // General story consistency checks
  validateCharacterConsistency(scene, allScenes, sceneIndex, validations);
  validateTimelineConsistency(scene, allScenes, sceneIndex, validations);
  validateOutcomeConsistency(scene, allScenes, sceneIndex, validations);
  
  return validations;
}

/**
 * Specific validation for Hare and Tortoise story
 */
function validateHareAndTortoiseStory(
  scene: ScriptScene,
  allScenes: ScriptScene[],
  sceneIndex: number,
  validations: string[]
): void {
  const narration = (scene.narration || '').toLowerCase();
  const imagePrompt = (scene.imagePrompt || '').toLowerCase();
  
  // Check if this is near the end of the story
  const isNearEnd = sceneIndex >= allScenes.length * 0.8;
  const isLastScene = sceneIndex === allScenes.length - 1;
  
  if (isNearEnd || isLastScene) {
    // In the ending, tortoise should be winning or have won
    if (imagePrompt.includes('hare') && imagePrompt.includes('ahead')) {
      validations.push('CRITICAL: In Hare and Tortoise story, the tortoise should win the race. The hare should NOT be ahead in the final scenes.');
    }
    
    if (isLastScene) {
      validations.push('ENSURE: Tortoise crosses finish line first, hare is behind looking surprised/regretful. This teaches "slow and steady wins the race".');
    }
  }
  
  // Check for character trait consistency
  if (imagePrompt.includes('hare') && !imagePrompt.includes('fast') && !imagePrompt.includes('overconfident') && sceneIndex < allScenes.length * 0.5) {
    validations.push('ENHANCE: Show hare\'s overconfident, fast nature in early scenes to set up the moral lesson.');
  }
  
  if (imagePrompt.includes('tortoise') && !imagePrompt.includes('steady') && !imagePrompt.includes('determined')) {
    validations.push('ENHANCE: Show tortoise\'s steady, determined nature throughout the story.');
  }
}

/**
 * Validates character consistency across scenes
 */
function validateCharacterConsistency(
  scene: ScriptScene,
  allScenes: ScriptScene[],
  sceneIndex: number,
  validations: string[]
): void {
  // Check if character descriptions are consistent
  const imagePrompt = scene.imagePrompt || '';
  const charactersInScene = scene.charactersInScene || [];
  
  if (charactersInScene.length > 0) {
    validations.push('ENSURE: All characters maintain consistent appearance, clothing, and personality traits as established in earlier scenes.');
  }
  
  // Check for character development arcs
  const progressPercentage = sceneIndex / (allScenes.length - 1);
  if (progressPercentage > 0.7) {
    validations.push('CONSIDER: Characters should show growth or change from their initial state, reflecting story lessons learned.');
  }
}

/**
 * Validates timeline and sequence consistency
 */
function validateTimelineConsistency(
  scene: ScriptScene,
  allScenes: ScriptScene[],
  sceneIndex: number,
  validations: string[]
): void {
  const narration = (scene.narration || '').toLowerCase();
  const imagePrompt = (scene.imagePrompt || '').toLowerCase();
  
  // Check for temporal consistency
  if (sceneIndex > 0) {
    validations.push('ENSURE: Scene logically follows from previous events. Actions and consequences should be connected.');
  }
  
  // Check for proper story progression
  const progressPercentage = sceneIndex / (allScenes.length - 1);
  if (progressPercentage < 0.3 && (narration.includes('finally') || narration.includes('conclusion'))) {
    validations.push('WARNING: Conclusion language used too early in the story. Save resolution for later scenes.');
  }
}

/**
 * Validates outcome and resolution consistency
 */
function validateOutcomeConsistency(
  scene: ScriptScene,
  allScenes: ScriptScene[],
  sceneIndex: number,
  validations: string[]
): void {
  const isLastScene = sceneIndex === allScenes.length - 1;
  const isNearEnd = sceneIndex >= allScenes.length * 0.8;
  
  if (isLastScene) {
    validations.push('CRITICAL: Final scene must clearly show the story\'s resolution and moral lesson. Winners should be clearly identified.');
  }
  
  if (isNearEnd) {
    validations.push('ENSURE: Story outcome aligns with established moral or educational goal. No contradictory results.');
  }
}

/**
 * Converts character age to appropriate descriptor for visual prompts
 */
function getAgeDescriptor(age: string): string {
  const ageNum = parseInt(age);
  
  if (ageNum <= 5) return 'very young child';
  if (ageNum <= 10) return 'young child';
  if (ageNum <= 15) return 'young teenager';
  if (ageNum <= 20) return 'teenager';
  if (ageNum <= 30) return 'young adult';
  if (ageNum <= 50) return 'adult';
  if (ageNum <= 65) return 'middle-aged person';
  
  return 'elderly person';
}

/**
 * Determines character visual descriptions for the scene (without names/ages as text)
 */
function determineCharacterPositions(
  scene: ScriptScene,
  characters: Array<{name: string; age: string; appearance: string; clothing: string; personality?: string}> | undefined,
  previousScene: ScriptScene | null,
  storyContext: string
): string[] {
  const positions: string[] = [];
  const charactersInScene = scene.charactersInScene || [];
  
  if (!characters || charactersInScene.length === 0) {
    return positions;
  }
  
  charactersInScene.forEach(characterName => {
    const character = characters.find(c => c.name === characterName);
    if (character) {
      // Convert character info to visual-only description (NO names or ages as text)
      const ageDescriptor = getAgeDescriptor(character.age);
      let visualDescription = `${ageDescriptor} with ${character.appearance}, wearing ${character.clothing}`;
      
      if (character.personality) {
        // Convert personality to visual expressions
        const personalityVisuals = convertPersonalityToVisuals(character.personality);
        if (personalityVisuals) {
          visualDescription += `, ${personalityVisuals}`;
        }
      }
      
      // Add contextual emotional state based on story progression
      if (storyContext.includes('Resolution') || storyContext.includes('Conclusion')) {
        visualDescription += ', showing satisfaction and accomplishment';
      } else if (storyContext.includes('Climax') || storyContext.includes('Peak tension')) {
        visualDescription += ', showing intense focus and determination';
      } else if (storyContext.includes('Introduction') || storyContext.includes('Setup')) {
        visualDescription += ', showing curiosity and readiness';
      }
      
      positions.push(visualDescription);
    }
  });
  
  return positions;
}

/**
 * Converts personality traits to visual expressions
 */
function convertPersonalityToVisuals(personality: string): string {
  const personalityLower = personality.toLowerCase();
  
  if (personalityLower.includes('confident') || personalityLower.includes('brave')) {
    return 'confident posture and determined expression';
  }
  if (personalityLower.includes('shy') || personalityLower.includes('timid')) {
    return 'gentle demeanor and thoughtful expression';
  }
  if (personalityLower.includes('happy') || personalityLower.includes('cheerful')) {
    return 'bright smile and energetic posture';
  }
  if (personalityLower.includes('serious') || personalityLower.includes('focused')) {
    return 'serious expression and attentive posture';
  }
  if (personalityLower.includes('playful') || personalityLower.includes('fun')) {
    return 'playful expression and dynamic pose';
  }
  if (personalityLower.includes('wise') || personalityLower.includes('thoughtful')) {
    return 'wise expression and calm demeanor';
  }
  if (personalityLower.includes('energetic') || personalityLower.includes('active')) {
    return 'energetic posture and animated expression';
  }
  
  return 'expressive and engaging demeanor';
}

/**
 * Builds the final enhanced image prompt
 */
function buildEnhancedImagePrompt(
  originalPrompt: string,
  storyContext: string,
  characterPositions: string[],
  factualValidations: string[],
  videoStyle: string,
  targetAudience: string
): string {
  let enhanced = originalPrompt;
  
  // Add character positioning details (visual-only descriptions)
  if (characterPositions.length > 0) {
    enhanced += ` Featuring: ${characterPositions.join('; ')}.`;
  }
  
  // Add critical factual validations as requirements
  const criticalValidations = factualValidations.filter(v => v.startsWith('CRITICAL:') || v.startsWith('ENSURE:'));
  if (criticalValidations.length > 0) {
    enhanced += ` IMPORTANT: ${criticalValidations.map(v => v.replace(/^(CRITICAL:|ENSURE:)\s*/, '')).join(' ')}.`;
  }
  
  // Add style and audience context
  enhanced += ` Style: ${videoStyle} appropriate for ${targetAudience} audience.`;
  
  // Add emotional and atmospheric guidance
  enhanced += ` Focus on clear visual storytelling, emotional expression, and narrative significance.`;
  
  // CRITICAL: Add explicit text exclusion instructions
  enhanced += ` IMPORTANT: No text, no labels, no names, no ages, no numbers visible in the image. Pure visual content only, no written words or characters displayed anywhere in the scene.`;
  
  return enhanced;
}

/**
 * Validates an entire script for story consistency and factual accuracy
 */
export function validateScriptStoryConsistency(storyContext: StoryContext): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  const { scenes, title, characters } = storyContext;
  
  // Check overall story structure
  if (scenes.length < 3) {
    issues.push('Story too short - needs at least 3 scenes for proper narrative arc');
  }
  
  // Check for proper story progression
  const hasIntro = scenes[0]?.sceneType === 'intro' || scenes[0]?.narration?.toLowerCase().includes('once') || scenes[0]?.narration?.toLowerCase().includes('meet');
  const hasConclusion = scenes[scenes.length - 1]?.sceneType === 'conclusion' || scenes[scenes.length - 1]?.narration?.toLowerCase().includes('finally') || scenes[scenes.length - 1]?.narration?.toLowerCase().includes('end');
  
  if (!hasIntro) {
    suggestions.push('Consider adding a clearer introduction scene to set up the story');
  }
  
  if (!hasConclusion) {
    suggestions.push('Consider adding a clearer conclusion scene to wrap up the story');
  }
  
  // Check character consistency
  if (characters && characters.length > 0) {
    const characterNames = characters.map(c => c.name);
    scenes.forEach((scene, index) => {
      const charactersInScene = scene.charactersInScene || [];
      charactersInScene.forEach(name => {
        if (!characterNames.includes(name)) {
          issues.push(`Scene ${index + 1}: Character "${name}" not found in character registry`);
        }
      });
    });
  }
  
  // Check for story-specific issues
  if (title.toLowerCase().includes('hare') && title.toLowerCase().includes('tortoise')) {
    const lastScene = scenes[scenes.length - 1];
    const lastSceneText = (lastScene?.narration || '').toLowerCase() + (lastScene?.imagePrompt || '').toLowerCase();
    
    if (!lastSceneText.includes('tortoise') || lastSceneText.includes('hare') && lastSceneText.includes('win')) {
      issues.push('Hare and Tortoise story: Final scene should clearly show tortoise winning the race');
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
}

/**
 * Generates story-aware image prompts for batch generation
 */
export function generateStoryAwareImagePrompts(storyContext: StoryContext): Array<{
  sceneId: number;
  originalPrompt: string;
  enhancedPrompt: string;
  validationNotes: string[];
}> {
  return storyContext.scenes.map((scene, index) => {
    const enhanced = enhanceImagePromptWithStoryContext(scene, index, storyContext);
    
    return {
      sceneId: scene.id,
      originalPrompt: enhanced.originalPrompt,
      enhancedPrompt: enhanced.enhancedPrompt,
      validationNotes: enhanced.factualValidation
    };
  });
}
