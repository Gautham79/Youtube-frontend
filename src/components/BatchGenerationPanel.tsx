'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Image, Volume2, Zap, X, Play, Pause, Loader2 } from 'lucide-react';

interface Scene {
  id: number;
  imagePrompt?: string;
  narration?: string;
  imageUrl?: string;
  audioUrl?: string;
  charactersInScene?: string[];
}

interface BatchGenerationPanelProps {
  scenes: Scene[];
  onBatchComplete?: () => void;
  onAssetUpdate?: (sceneId: number, assets: { imageUrl?: string; audioUrl?: string }) => void;
  imageFormat?: string;
  imageStyle?: string;
  audioVoice?: string;
  audioSpeed?: number;
  audioFormat?: string;
  scriptCharacters?: Array<{
    name: string;
    age: string;
    appearance: string;
    clothing: string;
    personality?: string;
  }>;
  characterConsistency?: boolean;
  // Story context for enhanced image generation
  storyTitle?: string;
  videoStyle?: string;
  targetAudience?: string;
}

interface BatchProgress {
  type: 'images' | 'audio' | 'all';
  total: number;
  completed: number;
  failed: number;
  processing: number;
  isRunning: boolean;
  currentScene?: number;
  results: Array<{
    sceneId: number;
    success: boolean;
    error?: string;
    url?: string;
  }>;
}

export default function BatchGenerationPanel({ 
  scenes, 
  onBatchComplete, 
  onAssetUpdate,
  imageFormat = 'landscape',
  imageStyle = 'realistic',
  audioVoice = 'alloy',
  audioSpeed = 1.0,
  audioFormat = 'mp3',
  scriptCharacters,
  characterConsistency = false,
  storyTitle,
  videoStyle,
  targetAudience
}: BatchGenerationPanelProps) {
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Calculate costs and counts
  const imageCost = 5; // Credits per image
  const audioCost = 3; // Credits per audio
  
  const scenesWithoutImages = scenes.filter(scene => !scene.imageUrl && scene.imagePrompt);
  const scenesWithoutAudio = scenes.filter(scene => !scene.audioUrl && scene.narration);
  
  const imageCreditsNeeded = scenesWithoutImages.length * imageCost;
  const audioCreditsNeeded = scenesWithoutAudio.length * audioCost;
  const totalCreditsNeeded = imageCreditsNeeded + audioCreditsNeeded;

  // Individual scene generation with real-time updates
  const generateSingleImage = async (scene: Scene): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      // Determine image size based on format
      let imageSize = '1024x1024'; // default square
      if (imageFormat === 'landscape') {
        imageSize = '1792x1024'; // 16:9 landscape for YouTube
      } else if (imageFormat === 'portrait') {
        imageSize = '1024x1792'; // 9:16 portrait for YouTube Shorts
      }

      // Create style-enhanced prompt
      let enhancedPrompt = scene.imagePrompt?.trim() || '';
      
      // Add style modifier based on selection
      if (imageStyle === 'realistic') {
        enhancedPrompt = `${enhancedPrompt}, photorealistic, high quality photography, realistic lighting, detailed, professional photograph`;
      } else {
        const styleModifiers = {
          'animation': 'in animation style, cartoon style, animated, 3D rendered',
          'oil-painting': 'oil painting style, painted with oil on canvas, artistic brushstrokes, traditional art',
          'watercolor': 'watercolor painting style, soft watercolor technique, flowing colors, artistic',
          'pixel-art': 'pixel art style, 8-bit graphics, retro gaming aesthetic, pixelated',
          'sketch': 'pencil sketch style, hand-drawn, black and white sketch, artistic drawing',
          'digital-art': 'digital art style, modern digital illustration, clean digital artwork, vector art',
          'minimalist': 'minimalist style, simple clean design, minimal elements, geometric',
          'vintage': 'vintage style, retro aesthetic, aged look, nostalgic, old-fashioned',
          'cyberpunk': 'cyberpunk style, futuristic, neon lights, sci-fi aesthetic, dystopian',
          'fantasy': 'fantasy style, magical, mystical, enchanted, ethereal',
          'comic-book': 'comic book style, graphic novel art, bold lines and colors, illustrated'
        };
        
        const styleModifier = styleModifiers[imageStyle as keyof typeof styleModifiers];
        if (styleModifier) {
          enhancedPrompt = `${enhancedPrompt}, ${styleModifier}`;
        }
      }

      // Add format-specific composition instructions
      const compositionModifiers = {
        'portrait': 'vertical composition, mobile-friendly layout, subject positioned for 9:16 aspect ratio, optimized for vertical viewing, portrait orientation, tall format composition, vertical framing',
        'landscape': 'horizontal composition, widescreen layout, cinematic framing, optimized for 16:9 viewing, landscape orientation, wide format composition, horizontal framing',
        'square': 'centered composition, balanced layout, optimized for 1:1 square format, square orientation, symmetrical framing, centered subject positioning'
      };

      const compositionModifier = compositionModifiers[imageFormat as keyof typeof compositionModifiers];
      if (compositionModifier) {
        enhancedPrompt = `${enhancedPrompt}, ${compositionModifier}`;
      }

      // Prepare character consistency data
      const requestBody: any = {
        prompt: scene.imagePrompt?.trim() || '', // Use original prompt, not enhanced
        size: imageSize,
        quality: 'standard',
        format: imageFormat,
        imageStyle: imageStyle // Pass the imageStyle parameter
      };

      // Add character consistency data if enabled and available
      if (characterConsistency && scriptCharacters && scriptCharacters.length > 0) {
        requestBody.characterRegistry = scriptCharacters;
        
        // Include characters that appear in this scene
        if (scene.charactersInScene && scene.charactersInScene.length > 0) {
          requestBody.charactersInScene = scene.charactersInScene;
        }
      }

      // Add story context for enhanced image generation
      if (storyTitle && videoStyle && targetAudience) {
        requestBody.storyTitle = storyTitle;
        requestBody.allScenes = scenes;
        requestBody.sceneIndex = scene.id - 1; // Convert to 0-based index
        requestBody.videoStyle = videoStyle;
        requestBody.targetAudience = targetAudience;
      }

      const response = await fetch('/api/images/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      // Update the parent component immediately with the new image
      if (onAssetUpdate && data.serverImageUrl) {
        onAssetUpdate(scene.id, { imageUrl: data.serverImageUrl });
      }

      return { 
        success: true, 
        url: data.serverImageUrl || data.imageUrl 
      };
    } catch (error) {
      console.error(`Failed to generate image for scene ${scene.id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  const generateSingleAudio = async (scene: Scene): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      const response = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: scene.narration,
          voice: audioVoice,
          speed: audioSpeed,
          format: audioFormat
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate audio');
      }

      // Get audio blob and create URL
      const audioBlob = await response.blob();
      
      // Upload audio to server for video generation
      const formData = new FormData();
      formData.append('file', audioBlob, `scene_${scene.id}_audio.${audioFormat}`);
      formData.append('sceneId', scene.id.toString());
      formData.append('assetType', 'audio');
      
      const uploadResponse = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload audio to server');
      }
      
      const uploadData = await uploadResponse.json();

      // Update the parent component immediately with the new audio
      if (onAssetUpdate) {
        onAssetUpdate(scene.id, { audioUrl: uploadData.url });
      }

      return { 
        success: true, 
        url: uploadData.url 
      };
    } catch (error) {
      console.error(`Failed to generate audio for scene ${scene.id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  const handleBatchGeneration = async (type: 'images' | 'audio' | 'all') => {
    setError(null);
    
    try {
      if (type === 'all') {
        // Handle 'all' case - do both sequentially
        if (scenesWithoutImages.length > 0) {
          await handleBatchGeneration('images');
        }
        if (scenesWithoutAudio.length > 0) {
          await handleBatchGeneration('audio');
        }
        return;
      }

      const scenesToProcess = type === 'images' ? scenesWithoutImages : scenesWithoutAudio;

      if (scenesToProcess.length === 0) {
        setError(`No scenes need ${type} generation`);
        return;
      }

      // Initialize progress
      setBatchProgress({
        type,
        total: scenesToProcess.length,
        completed: 0,
        failed: 0,
        processing: 1,
        isRunning: true,
        currentScene: scenesToProcess[0]?.id,
        results: []
      });

      console.log(`🚀 Starting batch ${type} generation for ${scenesToProcess.length} scenes`);

      // Process scenes one by one with real-time updates
      const results: Array<{ sceneId: number; success: boolean; error?: string; url?: string }> = [];
      
      for (let i = 0; i < scenesToProcess.length; i++) {
        const scene = scenesToProcess[i];
        
        // Update current scene being processed
        setBatchProgress(prev => prev ? {
          ...prev,
          currentScene: scene.id,
          processing: 1
        } : null);

        console.log(`🎯 Processing scene ${scene.id} (${i + 1}/${scenesToProcess.length})`);

        let result;
        if (type === 'images') {
          result = await generateSingleImage(scene);
        } else {
          result = await generateSingleAudio(scene);
        }

        const sceneResult = {
          sceneId: scene.id,
          success: result.success,
          error: result.error,
          url: result.url
        };

        results.push(sceneResult);

        // Update progress with real-time results
        setBatchProgress(prev => prev ? {
          ...prev,
          completed: prev.completed + (result.success ? 1 : 0),
          failed: prev.failed + (result.success ? 0 : 1),
          processing: i < scenesToProcess.length - 1 ? 1 : 0,
          currentScene: i < scenesToProcess.length - 1 ? scenesToProcess[i + 1]?.id : undefined,
          results: [...prev.results, sceneResult]
        } : null);

        // Add delay between requests to respect rate limits
        if (i < scenesToProcess.length - 1) {
          const delay = type === 'images' ? 12000 : 3000; // 12s for images, 3s for audio
          console.log(`⏳ Waiting ${delay/1000}s before next request...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // Mark as completed
      setBatchProgress(prev => prev ? {
        ...prev,
        isRunning: false,
        processing: 0,
        currentScene: undefined
      } : null);

      console.log(`✅ Batch ${type} generation completed:`, {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });

      // Don't call onBatchComplete to avoid page refresh
      // The assets are already updated in real-time via onAssetUpdate

    } catch (error) {
      console.error(`❌ Batch ${type} generation error:`, error);
      setError(error instanceof Error ? error.message : `Failed to generate ${type}`);
      
      setBatchProgress(prev => prev ? {
        ...prev,
        isRunning: false,
        processing: 0,
        currentScene: undefined
      } : null);
    }
  };

  const cancelBatch = () => {
    setBatchProgress(null);
    setError(null);
  };

  const progressPercentage = batchProgress 
    ? Math.round(((batchProgress.completed + batchProgress.failed) / batchProgress.total) * 100)
    : 0;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Batch Generation
        </CardTitle>
        <p className="text-sm text-gray-600">
          Generate assets for multiple scenes at once with real-time updates
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {!batchProgress ? (
          <div className="space-y-4">
            {/* Cost Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{scenesWithoutImages.length}</div>
                <div className="text-sm text-gray-600">Images needed</div>
                <div className="text-xs text-gray-500">{imageCreditsNeeded} credits</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{scenesWithoutAudio.length}</div>
                <div className="text-sm text-gray-600">Audio needed</div>
                <div className="text-xs text-gray-500">{audioCreditsNeeded} credits</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{totalCreditsNeeded}</div>
                <div className="text-sm text-gray-600">Total credits</div>
                <div className="text-xs text-gray-500">for all assets</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleBatchGeneration('images')}
                disabled={scenesWithoutImages.length === 0}
                className="flex items-center gap-2"
              >
                <Image className="h-4 w-4" />
                Generate All Images
                <Badge variant="secondary">{imageCreditsNeeded} credits</Badge>
              </Button>
              
              <Button
                onClick={() => handleBatchGeneration('audio')}
                disabled={scenesWithoutAudio.length === 0}
                className="flex items-center gap-2"
              >
                <Volume2 className="h-4 w-4" />
                Generate All Audio
                <Badge variant="secondary">{audioCreditsNeeded} credits</Badge>
              </Button>
              
              <Button
                onClick={() => handleBatchGeneration('all')}
                disabled={totalCreditsNeeded === 0}
                variant="default"
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Generate All Assets
                <Badge variant="secondary">{totalCreditsNeeded} credits</Badge>
              </Button>
            </div>

            {/* Settings Info */}
            <div className="text-xs text-gray-500 space-y-1 bg-blue-50 p-3 rounded-lg">
              <div className="font-medium text-blue-700 mb-1">Current Settings:</div>
              <div>• Image: {imageFormat} format, {imageStyle} style</div>
              <div>• Audio: {audioVoice} voice, {audioSpeed}x speed, {audioFormat.toUpperCase()}</div>
              <div>• Rate limits: 12s between images, 3s between audio</div>
              <div>• Assets appear in scenes immediately after generation</div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {batchProgress.isRunning ? (
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                ) : (
                  <Pause className="h-4 w-4 text-gray-600" />
                )}
                <span className="font-medium">
                  {batchProgress.isRunning ? `Generating ${batchProgress.type}...` : `${batchProgress.type} generation complete`}
                </span>
                <Badge variant={batchProgress.isRunning ? "default" : "secondary"}>
                  {batchProgress.isRunning ? "Running" : "Completed"}
                </Badge>
              </div>
              
              {batchProgress.isRunning && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelBatch}
                  className="flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </Button>
              )}
            </div>

            {/* Current Scene Processing */}
            {batchProgress.isRunning && batchProgress.currentScene && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="font-medium">Currently processing Scene {batchProgress.currentScene}</span>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress value={progressPercentage} className="w-full" />
              <div className="flex justify-between text-sm text-gray-600">
                <span>
                  {batchProgress.completed + batchProgress.failed} / {batchProgress.total} scenes
                </span>
                <span>{progressPercentage}% complete</span>
              </div>
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-green-600">{batchProgress.completed}</div>
                <div className="text-xs text-gray-600">Completed</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-600">{batchProgress.failed}</div>
                <div className="text-xs text-gray-600">Failed</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">{batchProgress.processing}</div>
                <div className="text-xs text-gray-600">Processing</div>
              </div>
            </div>

            {/* Individual Scene Results */}
            {batchProgress.results.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                <div className="text-sm font-medium">Scene Results:</div>
                {batchProgress.results.map((result) => (
                  <div
                    key={result.sceneId}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                  >
                    <span>Scene {result.sceneId}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "Success" : "Failed"}
                      </Badge>
                      {result.error && (
                        <span className="text-xs text-red-600 max-w-40 truncate" title={result.error}>
                          {result.error}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Completion Actions */}
            {!batchProgress.isRunning && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={cancelBatch}
                  className="flex-1"
                >
                  Close
                </Button>
                {batchProgress.failed > 0 && (
                  <Button
                    onClick={() => handleBatchGeneration(batchProgress.type)}
                    className="flex-1"
                  >
                    Retry Failed ({batchProgress.failed})
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
