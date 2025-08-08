import { Character, ScriptScene, GeneratedScript } from './openai/types';

export interface CharacterConsistencyOptions {
  enabled: boolean;
  characters: Character[];
}

/**
 * Enhances image prompts with style information
 */
export function enhanceImagePromptWithStyle(
  originalPrompt: string,
  videoStyle: string
): string {
  if (!videoStyle || videoStyle === 'realistic') {
    // For realistic style, add natural descriptive terms
    return `${originalPrompt}, captured in natural lighting with lifelike detail and photorealistic quality`;
  }

  const styleEnhancements: { [key: string]: string } = {
    'realistic': 'captured in natural lighting with lifelike detail and photorealistic quality',
    'animation': 'in vibrant animated style with cartoon-like features and bright colors',
    'oil-painting': 'painted in rich oil painting style with thick brushstrokes and warm colors',
    'watercolor': 'painted in soft watercolor style with flowing brushstrokes and gentle colors',
    'pixel-art': 'created in retro pixel art style with blocky, 8-bit inspired graphics',
    'sketch': 'drawn in detailed pencil sketch style with fine lines and artistic shading',
    'digital-art': 'created in modern digital art style with clean lines and vibrant colors',
    'minimalist': 'in clean minimalist style with simple shapes and limited color palette',
    'vintage': 'in vintage art style with muted colors and classic retro composition',
    'cyberpunk': 'in futuristic cyberpunk style with neon lighting and high-tech atmosphere',
    'fantasy': 'in magical fantasy art style with ethereal lighting and mystical atmosphere',
    'comic-book': 'in dynamic comic book style with bold lines and dramatic colors'
  };

  const enhancement = styleEnhancements[videoStyle.toLowerCase()] || styleEnhancements['animation'];
  return `${originalPrompt} ${enhancement}`;
}

/**
 * Enhances image prompts with character consistency information and style
 */
export function enhanceImagePromptWithCharacters(
  originalPrompt: string,
  charactersInScene: string[],
  characterRegistry: Character[],
  videoStyle?: string
): string {
  let enhancedPrompt = originalPrompt;

  // Add character consistency if provided
  if (charactersInScene && charactersInScene.length > 0) {
    const characterDescriptions = charactersInScene
      .map(characterName => {
        const character = characterRegistry.find(c => c.name.toLowerCase() === characterName.toLowerCase());
        if (!character) return null;
        
        return `${character.name}: ${character.age} years old, ${character.appearance}, wearing ${character.clothing}`;
      })
      .filter(Boolean)
      .join(', ');

    if (characterDescriptions) {
      enhancedPrompt = `${characterDescriptions}. ${originalPrompt}`;
    }
  }

  // Add style enhancement if provided
  if (videoStyle) {
    enhancedPrompt = enhanceImagePromptWithStyle(enhancedPrompt, videoStyle);
  }

  return enhancedPrompt;
}

/**
 * Validates character consistency across scenes
 */
export function validateCharacterConsistency(script: GeneratedScript): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!script.characterConsistency || !script.characters) {
    return { isValid: true, errors, warnings };
  }

  // Check if all characters mentioned in scenes exist in character registry
  const characterNames = script.characters.map(c => c.name.toLowerCase());
  
  script.scenes.forEach((scene, index) => {
    if (scene.charactersInScene) {
      scene.charactersInScene.forEach(characterName => {
        if (!characterNames.includes(characterName.toLowerCase())) {
          errors.push(`Scene ${index + 1}: Character "${characterName}" not found in character registry`);
        }
      });
    }
  });

  // Check for incomplete character definitions
  script.characters.forEach(character => {
    if (!character.name || !character.age || !character.appearance || !character.clothing) {
      warnings.push(`Character "${character.name || 'Unknown'}" has incomplete definition`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Extracts character names from a scene's image prompt
 */
export function extractCharacterNamesFromPrompt(prompt: string, characterRegistry: Character[]): string[] {
  const foundCharacters: string[] = [];
  
  characterRegistry.forEach(character => {
    const nameVariations = [
      character.name,
      character.name.toLowerCase(),
      character.name.toUpperCase()
    ];
    
    nameVariations.forEach(variation => {
      if (prompt.includes(variation)) {
        foundCharacters.push(character.name);
      }
    });
  });

  return [...new Set(foundCharacters)]; // Remove duplicates
}

/**
 * Generates a character consistency report
 */
export function generateCharacterConsistencyReport(script: GeneratedScript): {
  totalCharacters: number;
  charactersPerScene: { [sceneId: number]: string[] };
  characterAppearances: { [characterName: string]: number[] };
  consistencyScore: number;
} {
  if (!script.characterConsistency || !script.characters) {
    return {
      totalCharacters: 0,
      charactersPerScene: {},
      characterAppearances: {},
      consistencyScore: 100
    };
  }

  const charactersPerScene: { [sceneId: number]: string[] } = {};
  const characterAppearances: { [characterName: string]: number[] } = {};

  // Initialize character appearances
  script.characters.forEach(character => {
    characterAppearances[character.name] = [];
  });

  // Track character appearances per scene
  script.scenes.forEach(scene => {
    if (scene.charactersInScene) {
      charactersPerScene[scene.id] = scene.charactersInScene;
      scene.charactersInScene.forEach(characterName => {
        if (characterAppearances[characterName]) {
          characterAppearances[characterName].push(scene.id);
        }
      });
    }
  });

  // Calculate consistency score (percentage of scenes with proper character tracking)
  const scenesWithCharacters = Object.keys(charactersPerScene).length;
  const totalScenes = script.scenes.length;
  const consistencyScore = totalScenes > 0 ? (scenesWithCharacters / totalScenes) * 100 : 100;

  return {
    totalCharacters: script.characters.length,
    charactersPerScene,
    characterAppearances,
    consistencyScore: Math.round(consistencyScore)
  };
}

/**
 * Suggests character consistency improvements
 */
export function suggestCharacterImprovements(script: GeneratedScript): string[] {
  const suggestions: string[] = [];
  
  if (!script.characterConsistency) {
    return suggestions;
  }

  const validation = validateCharacterConsistency(script);
  const report = generateCharacterConsistencyReport(script);

  if (validation.errors.length > 0) {
    suggestions.push("Fix character registry errors before proceeding with image generation");
  }

  if (report.consistencyScore < 80) {
    suggestions.push("Consider adding character information to more scenes for better consistency");
  }

  if (script.characters && script.characters.length > 5) {
    suggestions.push("Consider reducing the number of characters for better visual consistency");
  }

  // Check for characters that appear in very few scenes
  Object.entries(report.characterAppearances).forEach(([characterName, appearances]) => {
    if (appearances.length === 1) {
      suggestions.push(`Character "${characterName}" only appears in one scene - consider expanding their role or removing them`);
    }
  });

  return suggestions;
}
