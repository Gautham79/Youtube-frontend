"use client";

import { useState, useEffect, Suspense, useReducer } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from 'next/navigation';
import Navbar from "@/app/(site)/Navbar";
import Footer from "@/app/(site)/Footer";
import Link from "next/link";
import { ArrowLeft, FileText, Sparkles, Clock, Users, Play, Download, Copy, Edit3, Image, Loader2, Save, Trash2, Plus, Upload, Volume2, Pause } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDefaultSubtitleSettings } from '@/utils/subtitle-types';
import VideoSettingsForm, { VideoSettings } from '@/components/VideoSettingsForm';
import BatchGenerationPanel from '@/components/BatchGenerationPanel';

interface ScriptScene {
  id: number;
  narration: string;
  duration: string;
  imagePrompt: string;
  sceneType: 'intro' | 'explanation' | 'demo' | 'transition' | 'conclusion';
  keyPoints: string[];
  wordCount?: number; // Optional word count for duration calculation
  charactersInScene?: string[]; // Characters that appear in this scene
}

interface GeneratedScript {
  title: string;
  totalDuration: string;
  scenes: ScriptScene[];
  estimatedWords: number;
  targetAudience: string;
  videoStyle: string;
  characters?: Array<{
    name: string;
    age: string;
    appearance: string;
    clothing: string;
    personality?: string;
  }>;
  characterConsistency?: boolean;
}

// Combined state for script and assets to ensure atomic updates
interface ScriptState {
  script: GeneratedScript | null;
  assets: Record<number, { imageUrl?: string; audioUrl?: string }>;
}

// Action types for the reducer
type ScriptAction =
  | { type: 'SET_SCRIPT'; payload: GeneratedScript }
  | { type: 'UPDATE_SCENE'; payload: { sceneId: number; scene: ScriptScene } }
  | { type: 'DELETE_SCENE'; payload: { sceneId: number } }
  | { type: 'MOVE_SCENE'; payload: { sceneId: number; direction: 'up' | 'down' } }
  | { type: 'INSERT_SCENE'; payload: { sceneId: number } }
  | { type: 'UPDATE_ASSETS'; payload: { sceneId: number; assets: { imageUrl?: string; audioUrl?: string } } }
  | { type: 'CLEAR_SCRIPT' };

// Reducer function to handle all script and asset state changes atomically
function scriptReducer(state: ScriptState, action: ScriptAction): ScriptState {
  switch (action.type) {
    case 'SET_SCRIPT':
      return {
        ...state,
        script: action.payload
      };

    case 'UPDATE_SCENE': {
      if (!state.script) return state;
      
      const updatedScenes = state.script.scenes.map(scene => 
        scene.id === action.payload.sceneId ? action.payload.scene : scene
      );
      
      return {
        ...state,
        script: {
          ...state.script,
          scenes: updatedScenes
        }
      };
    }

    case 'DELETE_SCENE': {
      if (!state.script) return state;
      
      const updatedScenes = state.script.scenes
        .filter(scene => scene.id !== action.payload.sceneId)
        .map((scene, index) => ({ ...scene, id: index + 1 }));
      
      // Remove assets for deleted scene and renumber remaining assets
      const updatedAssets: Record<number, { imageUrl?: string; audioUrl?: string }> = {};
      Object.entries(state.assets).forEach(([sceneIdStr, assets]) => {
        const sceneId = parseInt(sceneIdStr);
        if (sceneId !== action.payload.sceneId) {
          // Renumber assets to match new scene IDs
          const newSceneId = sceneId > action.payload.sceneId ? sceneId - 1 : sceneId;
          updatedAssets[newSceneId] = assets;
        }
      });
      
      return {
        script: {
          ...state.script,
          scenes: updatedScenes
        },
        assets: updatedAssets
      };
    }

    case 'MOVE_SCENE': {
      if (!state.script) return state;
      
      const scenes = [...state.script.scenes];
      const currentIndex = scenes.findIndex(scene => scene.id === action.payload.sceneId);
      const newIndex = action.payload.direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      if (newIndex >= 0 && newIndex < scenes.length) {
        [scenes[currentIndex], scenes[newIndex]] = [scenes[newIndex], scenes[currentIndex]];
        
        // Update IDs to match new positions
        const updatedScenes = scenes.map((scene, index) => ({ ...scene, id: index + 1 }));
        
        // Swap assets to match new scene positions
        const updatedAssets = { ...state.assets };
        const oldId1 = currentIndex + 1;
        const oldId2 = newIndex + 1;
        const assets1 = updatedAssets[oldId1];
        const assets2 = updatedAssets[oldId2];
        
        if (assets1) updatedAssets[oldId2] = assets1;
        else delete updatedAssets[oldId2];
        
        if (assets2) updatedAssets[oldId1] = assets2;
        else delete updatedAssets[oldId1];
        
        return {
          script: {
            ...state.script,
            scenes: updatedScenes
          },
          assets: updatedAssets
        };
      }
      
      return state;
    }

    case 'INSERT_SCENE': {
      if (!state.script) return state;
      
      const scenes = [...state.script.scenes];
      const currentIndex = scenes.findIndex(scene => scene.id === action.payload.sceneId);
      
      if (currentIndex === -1) return state;
      
      // Create a new scene with default values
      const newScene: ScriptScene = {
        id: 0, // Temporary ID, will be updated when we renumber
        narration: "Enter your narration here...",
        duration: "10 seconds",
        imagePrompt: "Describe the image for this scene...",
        sceneType: 'explanation',
        keyPoints: [],
        wordCount: 20
      };
      
      // Insert the new scene ABOVE the current scene
      scenes.splice(currentIndex, 0, newScene);
      
      // Renumber all scenes to maintain sequential IDs starting from 1
      const updatedScenes = scenes.map((scene, index) => ({ ...scene, id: index + 1 }));
      
      // ATOMIC ASSET REMAPPING: Use scene ID comparison for correct asset shifting
      const insertedSceneId = action.payload.sceneId; // The ID of the scene we clicked on (where we want to insert)
      const updatedAssets: Record<number, { imageUrl?: string; audioUrl?: string }> = {};
      
      console.log('🔄 INSERT_SCENE: Asset remapping debug:', {
        insertedSceneId,
        currentIndex,
        originalAssets: Object.keys(state.assets),
        scenesBeforeInsertion: scenes.map(s => s.id)
      });
      
      // Process each existing asset and determine its new scene ID
      Object.entries(state.assets).forEach(([oldSceneIdStr, assets]) => {
        const oldSceneId = parseInt(oldSceneIdStr);
        
        let newSceneId: number;
        if (oldSceneId < insertedSceneId) {
          // Scene was before the insertion point - keeps its original ID
          newSceneId = oldSceneId;
        } else {
          // Scene was at or after the insertion point - ID increases by 1
          newSceneId = oldSceneId + 1;
        }
        
        console.log(`📦 Asset remapping: Scene ${oldSceneId} → Scene ${newSceneId}`);
        updatedAssets[newSceneId] = assets;
      });
      
      console.log('✅ INSERT_SCENE: Final asset mapping:', {
        before: Object.keys(state.assets),
        after: Object.keys(updatedAssets),
        newSceneHasAssets: !!updatedAssets[insertedSceneId]
      });
      
      // The newly inserted scene has no assets initially
      // (This is automatically handled since we don't add any assets for insertedSceneId)
      
      return {
        script: {
          ...state.script,
          scenes: updatedScenes
        },
        assets: updatedAssets
      };
    }

    case 'UPDATE_ASSETS': {
      return {
        ...state,
        assets: {
          ...state.assets,
          [action.payload.sceneId]: {
            ...state.assets[action.payload.sceneId],
            ...action.payload.assets
          }
        }
      };
    }

    case 'CLEAR_SCRIPT':
      return {
        script: null,
        assets: {}
      };

    default:
      return state;
  }
}

function SceneCard({ 
  scene, 
  onUpdate, 
  onDelete, 
  isFirst, 
  isLast, 
  onMoveUp, 
  onMoveDown,
  onInsertAbove,
  onCreditsUpdate,
  imageFormat,
  imageStyle,
  audioVoice,
  audioSpeed,
  audioFormat,
  creditCosts,
  onAssetUpdate,
  existingAssets,
  scriptCharacters,
  characterConsistency
}: {
  scene: ScriptScene;
  onUpdate: (scene: ScriptScene) => void;
  onDelete: () => void;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onInsertAbove: () => void;
  onCreditsUpdate: (newCredits: number) => void;
  imageFormat: string;
  imageStyle: string;
  audioVoice: string;
  audioSpeed: number;
  audioFormat: string;
  creditCosts: {
    script: number;
    image: number;
    audio: number;
    idea: number;
    video: number;
    thumbnail: number;
    metadata: number;
  };
  onAssetUpdate: (sceneId: number, assets: { imageUrl?: string; audioUrl?: string }) => void;
  existingAssets?: { imageUrl?: string; audioUrl?: string };
  scriptCharacters?: Array<{
    name: string;
    age: string;
    appearance: string;
    clothing: string;
    personality?: string;
  }>;
  characterConsistency?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedScene, setEditedScene] = useState(scene);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // 🔄 SYNC ASSETS: Load existing assets when component mounts or scene ID changes
  useEffect(() => {
    console.log('🔄 SceneCard asset sync for scene', scene.id, ':', {
      existingAssets,
      currentLocalImage: generatedImage,
      currentLocalAudio: generatedAudio
    });

    if (existingAssets?.imageUrl && existingAssets.imageUrl !== generatedImage) {
      console.log('📷 Loading existing image for scene', scene.id, ':', existingAssets.imageUrl);
      setGeneratedImage(existingAssets.imageUrl);
      setImageError(null);
    }

    if (existingAssets?.audioUrl && existingAssets.audioUrl !== generatedAudio) {
      console.log('🎵 Loading existing audio for scene', scene.id, ':', existingAssets.audioUrl);
      setGeneratedAudio(existingAssets.audioUrl);
      setAudioError(null);
    }

    // Clear assets if they don't exist in global state
    if (!existingAssets?.imageUrl && generatedImage) {
      console.log('🗑️ Clearing local image for scene', scene.id, '- not in global state');
      setGeneratedImage(null);
    }

    if (!existingAssets?.audioUrl && generatedAudio) {
      console.log('🗑️ Clearing local audio for scene', scene.id, '- not in global state');
      setGeneratedAudio(null);
    }
  }, [scene.id, existingAssets?.imageUrl, existingAssets?.audioUrl]);

  const getSceneTypeColor = (type: string) => {
    switch (type) {
      case 'intro': return 'bg-blue-100 text-blue-800';
      case 'explanation': return 'bg-green-100 text-green-800';
      case 'demo': return 'bg-purple-100 text-purple-800';
      case 'transition': return 'bg-yellow-100 text-yellow-800';
      case 'conclusion': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSceneTypeIcon = (type: string) => {
    switch (type) {
      case 'intro': return '🎬';
      case 'explanation': return '📚';
      case 'demo': return '🎯';
      case 'transition': return '🔄';
      case 'conclusion': return '🎉';
      default: return '🎥';
    }
  };

  const handleSave = () => {
    onUpdate(editedScene);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedScene(scene);
    setIsEditing(false);
  };

  const handleGenerateImage = async () => {
    console.log('🚀 handleGenerateImage called with imageFormat:', imageFormat);
    
    if (!scene.imagePrompt.trim()) {
      setImageError('Please provide an image prompt first');
      return;
    }

    try {
      setIsGeneratingImage(true);
      setImageError(null);

      // Determine image size based on format
      let imageSize = '1024x1024'; // default square
      if (imageFormat === 'landscape') {
        imageSize = '1792x1024'; // 16:9 landscape for YouTube
      } else if (imageFormat === 'portrait') {
        imageSize = '1024x1792'; // 9:16 portrait for YouTube Shorts
      }

      // Use the original prompt from the script generation (which now includes detailed descriptions)
      let enhancedPrompt = scene.imagePrompt.trim();
      
      console.log('🎨 Generating image with script-generated prompt:', {
        original: scene.imagePrompt.trim(),
        style: imageStyle,
        format: imageFormat,
        size: imageSize,
        characterConsistency: characterConsistency,
        charactersInScene: scene.charactersInScene,
        scriptCharacters: scriptCharacters
      });

      // Prepare character consistency data
      const requestBody: any = {
        prompt: enhancedPrompt,
        size: imageSize,
        quality: 'standard',
        format: imageFormat,
        imageStyle: imageStyle
      };

      // Debug log to verify imageStyle is being sent
      console.log('🔍 Request body being sent to API:', {
        ...requestBody,
        prompt: requestBody.prompt.substring(0, 100) + '...',
        imageStyleValue: imageStyle,
        imageStyleType: typeof imageStyle
      });

      // Add character consistency data if enabled and available
      if (characterConsistency && scriptCharacters && scriptCharacters.length > 0) {
        requestBody.characterRegistry = scriptCharacters;
        
        // Include characters that appear in this scene
        if (scene.charactersInScene && scene.charactersInScene.length > 0) {
          requestBody.charactersInScene = scene.charactersInScene;
        }
        
        console.log('🎭 Adding character consistency data to request:', {
          characterRegistry: scriptCharacters.length,
          charactersInScene: scene.charactersInScene?.length || 0
        });
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
        if (response.status === 402) {
          setImageError(`Insufficient credits. You need ${data.required} credits but only have ${data.available}.`);
        } else {
          throw new Error(data.error || 'Failed to generate image');
        }
        return;
      }

      console.log('✅ Image generation response:', {
        imageUrl: data.imageUrl,
        serverImageUrl: data.serverImageUrl,
        uploadSuccess: data.uploadSuccess,
        revisedPrompt: data.revisedPrompt,
        remainingCredits: data.remainingCredits,
        timestamp: data.generatedAt
      });

      // Set the display image (DALL-E URL for preview)
      setGeneratedImage(data.imageUrl);
      
      // Handle server upload result
      if (data.uploadSuccess && data.serverImageUrl) {
        // Server upload was successful - use server URL for video generation
        console.log('✅ Server upload successful, using server URL for video generation');
        onAssetUpdate(scene.id, { imageUrl: data.serverImageUrl });
      } else {
        // Server upload failed - show warning but still display the image
        console.warn('⚠️ Server upload failed, video generation may not work');
        setImageError('Image generated successfully, but server upload failed. Video generation may not work with this image. You can try uploading manually or regenerating the image.');
      }
      
      onCreditsUpdate(data.remainingCredits);
      
    } catch (error) {
      console.error('Failed to generate image:', error);
      setImageError('Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!generatedImage) return;

    try {
      setIsDownloading(true);
      
      // Use a proxy approach to handle CORS issues
      const response = await fetch('/api/images/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: generatedImage,
          filename: `scene_${scene.id}_image.png`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to download image');
      }

      const blob = await response.blob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scene_${scene.id}_image.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Failed to download image:', error);
      setImageError('Failed to download image. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUploadImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setImageError('Please select a valid image file.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setImageError('Image file size must be less than 10MB.');
      return;
    }

    // Create object URL for preview
    const imageUrl = URL.createObjectURL(file);
    setGeneratedImage(imageUrl);
    setImageError(null);
    
    // Update parent component with the uploaded image URL
    onAssetUpdate(scene.id, { imageUrl: imageUrl });
  };

  const handleGenerateAudio = async () => {
    if (!scene.narration.trim()) {
      setAudioError('Please provide narration text first');
      return;
    }

    try {
      setIsGeneratingAudio(true);
      setAudioError(null);

      console.log('🎵 Generating audio with settings:', {
        voice: audioVoice,
        speed: audioSpeed,
        format: audioFormat,
        textLength: scene.narration.length
      });

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
        if (response.status === 402) {
          setAudioError(`Insufficient credits. You need ${data.required} credits but only have ${data.available}.`);
        } else {
          throw new Error(data.error || 'Failed to generate audio');
        }
        return;
      }

      // Get audio blob and create URL
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Get metadata from headers
      const remainingCredits = response.headers.get('X-Remaining-Credits');
      const audioDuration = response.headers.get('X-Audio-Duration');
      
      console.log('✅ Audio generated successfully:', {
        audioUrl,
        audioDuration,
        remainingCredits,
        voice: audioVoice,
        speed: audioSpeed
      });

      // Upload audio to server for video generation
      console.log('📤 Uploading audio to server for video generation...');
      
      try {
        // Upload to our server
        const formData = new FormData();
        formData.append('file', audioBlob, `scene_${scene.id}_audio.${audioFormat}`);
        formData.append('sceneId', scene.id.toString());
        formData.append('assetType', 'audio');
        
        const uploadResponse = await fetch('/api/assets/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Failed to upload audio to server: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
        }
        
        const uploadData = await uploadResponse.json();
        console.log('✅ Audio uploaded to server:', uploadData.url);
        
        // Set both the display URL (blob) and server URL for video generation
        setGeneratedAudio(audioUrl); // For display and playback
        onAssetUpdate(scene.id, { audioUrl: uploadData.url }); // Server URL for video generation
        
      } catch (uploadError) {
        console.error('❌ Failed to upload audio to server:', uploadError);
        
        // Still show the audio to the user for preview, but warn about video generation
        setGeneratedAudio(audioUrl);
        setAudioError(`Audio generated but upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}. Video generation may not work with this audio.`);
        
        // Don't set asset URL since upload failed - this will prevent video generation with blob URLs
        console.warn('⚠️ Audio upload failed, video generation will not work with this audio');
        return;
      }
      
      // Update credits
      if (remainingCredits) {
        onCreditsUpdate(parseInt(remainingCredits));
      }
      
    } catch (error) {
      console.error('Failed to generate audio:', error);
      setAudioError('Failed to generate audio. Please try again.');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handlePlayAudio = () => {
    if (!generatedAudio) return;

    if (isPlayingAudio && audioElement) {
      audioElement.pause();
      setIsPlayingAudio(false);
    } else {
      const audio = new Audio(generatedAudio);
      audio.onended = () => setIsPlayingAudio(false);
      audio.play();
      setAudioElement(audio);
      setIsPlayingAudio(true);
    }
  };

  const handleDownloadAudio = () => {
    if (!generatedAudio) return;

    const a = document.createElement('a');
    a.href = generatedAudio;
    a.download = `scene_${scene.id}_audio.${audioFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Cleanup audio element on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  return (
    <Card className="p-6 border-l-4 border-l-indigo-500">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getSceneTypeIcon(scene.sceneType)}</span>
            <span className="font-semibold text-gray-900">Scene {scene.id}</span>
          </div>
          <Badge className={getSceneTypeColor(scene.sceneType)}>
            {scene.sceneType}
          </Badge>
          <Badge variant="outline">
            {scene.duration}
          </Badge>
          {scene.wordCount && (
            <Badge variant="outline" className="text-xs">
              {scene.wordCount} words
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!isFirst && (
            <Button variant="ghost" size="sm" onClick={onMoveUp} title="Move scene up">
              ↑
            </Button>
          )}
          {!isLast && (
            <Button variant="ghost" size="sm" onClick={onMoveDown} title="Move scene down">
              ↓
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onInsertAbove}
            title="Insert scene above"
            className="text-green-600 hover:text-green-700"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsEditing(!isEditing)}
            title="Edit scene"
          >
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onDelete}
            className="text-red-600 hover:text-red-700"
            title="Delete scene"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Narration
            </label>
            <textarea
              value={editedScene.narration}
              onChange={(e) => setEditedScene({ ...editedScene, narration: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none"
              rows={4}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image Prompt
            </label>
            <textarea
              value={editedScene.imagePrompt}
              onChange={(e) => setEditedScene({ ...editedScene, imagePrompt: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Key Points
            </label>
            <div className="space-y-2">
              {editedScene.keyPoints.map((point, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={point}
                    onChange={(e) => {
                      const newKeyPoints = [...editedScene.keyPoints];
                      newKeyPoints[index] = e.target.value;
                      setEditedScene({ ...editedScene, keyPoints: newKeyPoints });
                    }}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter a key point..."
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newKeyPoints = editedScene.keyPoints.filter((_, i) => i !== index);
                      setEditedScene({ ...editedScene, keyPoints: newKeyPoints });
                    }}
                    className="text-red-600 hover:text-red-700 p-2"
                    title="Remove key point"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {/* Add new key point button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newKeyPoints = [...editedScene.keyPoints, ''];
                  setEditedScene({ ...editedScene, keyPoints: newKeyPoints });
                }}
                className="w-full border-dashed"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Key Point
              </Button>
              
              {editedScene.keyPoints.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  No key points yet. Click "Add Key Point" to add important topics for this scene.
                </p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm">
              Save Changes
            </Button>
            <Button variant="outline" onClick={handleCancel} size="sm">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">📝 Narration</h4>
            <p className="text-gray-600 leading-relaxed">{scene.narration}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">🎨 Image Prompt</h4>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg italic">
              {scene.imagePrompt}
            </p>
          </div>
          
          {scene.keyPoints.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">🎯 Key Points</h4>
              <ul className="space-y-1">
                {scene.keyPoints.map((point, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-indigo-500 mt-1">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Generated Image Display */}
          {generatedImage && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">🖼️ Generated Image</h4>
              <div className="relative">
                <img 
                  src={generatedImage} 
                  alt="Generated scene image"
                  className="w-full max-w-md rounded-lg border border-gray-200"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadImage}
                    disabled={isDownloading}
                    className="bg-white/80 hover:bg-white"
                    title="Download image"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setGeneratedImage(null)}
                    className="bg-white/80 hover:bg-white"
                    title="Remove image"
                  >
                    ✕
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Image Error Display */}
          {imageError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{imageError}</p>
            </div>
          )}

          {/* Generated Audio Display */}
          {generatedAudio && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">🎵 Generated Audio</h4>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePlayAudio}
                      className="p-2"
                    >
                      {isPlayingAudio ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <div className="text-sm text-gray-600">
                      <div className="font-medium">Scene {scene.id} Audio</div>
                      <div className="text-xs text-gray-500">
                        Voice: {audioVoice} • Speed: {audioSpeed}x • Format: {audioFormat.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDownloadAudio}
                      className="p-2"
                      title="Download audio"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setGeneratedAudio(null)}
                      className="p-2"
                      title="Remove audio"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audio Error Display */}
          {audioError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{audioError}</p>
            </div>
          )}
          
          <div className="flex gap-2 pt-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerateImage}
              disabled={isGeneratingImage || !scene.imagePrompt.trim()}
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Image className="w-4 h-4 mr-1" />
                  Generate Image ({creditCosts.image} credits)
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerateAudio}
              disabled={isGeneratingAudio || !scene.narration.trim()}
            >
              {isGeneratingAudio ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 mr-1" />
                  Generate Audio ({creditCosts.audio} credits)
                </>
              )}
            </Button>
            
            {/* Upload Image Button */}
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadImage}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id={`upload-${scene.id}`}
              />
              <Button variant="outline" size="sm" asChild>
                <label htmlFor={`upload-${scene.id}`} className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-1" />
                  Upload Image
                </label>
              </Button>
            </div>
            
            <Button variant="outline" size="sm">
              <Copy className="w-4 h-4 mr-1" />
              Copy Scene
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function ScriptGenerationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
            <div className="text-lg text-gray-600">Loading...</div>
          </div>
        </div>
        <Footer />
      </div>
    }>
      <ScriptGenerationContent />
    </Suspense>
  );
}

function ScriptGenerationContent() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  
  // Get idea from URL params (when coming from idea generation)
  const ideaFromParams = searchParams.get('idea');
  const titleFromParams = searchParams.get('title');
  
  const [idea, setIdea] = useState(ideaFromParams || '');
  const [videoLength, setVideoLength] = useState('1 minute');
  const [videoStyle, setVideoStyle] = useState('tutorial');
  const [targetAudience, setTargetAudience] = useState('intermediate');
  const [imageFormat, setImageFormat] = useState('landscape');
  const [imageStyle, setImageStyle] = useState('realistic');
  const [audioVoice, setAudioVoice] = useState('alloy');
  const [audioSpeed, setAudioSpeed] = useState(1.0);
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [characterConsistency, setCharacterConsistency] = useState(false);
  // Video settings using VideoSettingsForm
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    resolution: '1080p',
    frameRate: 30,
    format: 'mp4',
    quality: 'high',
    orientation: 'landscape',
    transition: 'fade',
    transitionDuration: 1,
    subtitles: getDefaultSubtitleSettings(),
    animation: {
      type: 'none',
      intensity: 'subtle'
    },
    backgroundMusic: {
      enabled: false,
      volume: 30,
      fadeIn: 2,
      fadeOut: 3,
      startOffset: 0,
      loop: true,
      source: 'youtube'
    }
  });
  
  // Use reducer for atomic script and asset state management
  const [scriptState, dispatch] = useReducer(scriptReducer, {
    script: null,
    assets: {}
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<any>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [creditCosts, setCreditCosts] = useState({
    script: 10,
    image: 5,
    audio: 3,
    idea: 1,
    video: 15,
    thumbnail: 2,
    metadata: 2
  });

  // Extract values from reducer state for easier access
  const generatedScript = scriptState.script;
  const sceneAssets = scriptState.assets;

  // Helper function to get scene information for video length
  const getSceneInfo = (length: string) => {
    if (length === 'flexible') {
      return 'AI will determine optimal scene count (max 60 scenes)';
    }
    
    const durationMap: { [key: string]: { seconds: number; words: number; scenes: number } } = {
      '30 seconds': { seconds: 30, words: 80, scenes: 5 },
      '45 seconds': { seconds: 45, words: 120, scenes: 8 },
      '1 minute': { seconds: 60, words: 160, scenes: 11 },
      '2 minutes': { seconds: 120, words: 320, scenes: 21 },
      '3 minutes': { seconds: 180, words: 480, scenes: 32 },
      '5 minutes': { seconds: 300, words: 800, scenes: 53 }
    };
    
    const info = durationMap[length];
    if (!info) return 'Duration info not available';
    
    return `~${info.scenes} scenes, ${info.words} words`;
  };

  // Load user credits and credit costs
  useEffect(() => {
    if (user) {
      // Fetch current credits
      fetch('/api/credits')
        .then(res => res.json())
        .then(data => {
          const credits = data.credits?.currentBalance || 0;
          setUserCredits(credits);
        })
        .catch(console.error);

      // Fetch credit costs from user's plan
      fetch('/api/credits/spend?action=script')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.plan?.costs) {
            setCreditCosts(data.plan.costs);
          }
        })
        .catch(console.error);
    }
  }, [user]);

  // Set initial idea if coming from idea generation
  useEffect(() => {
    if (ideaFromParams) {
      setIdea(ideaFromParams);
    }
  }, [ideaFromParams]);

  const handleGenerateScript = async () => {
    if (!idea.trim()) {
      setError('Please enter an idea for your video');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch('/api/script/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idea: idea.trim(),
          videoLength,
          videoStyle,
          targetAudience,
          title: titleFromParams || undefined,
          characterConsistency
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          setError(`Insufficient credits. You need ${data.required} credits but only have ${data.available}.`);
        } else {
          throw new Error(data.error || 'Failed to generate script');
        }
        return;
      }

      dispatch({ type: 'SET_SCRIPT', payload: data.script });
      setUserCredits(data.remainingCredits);
      
    } catch (error) {
      console.error('Failed to generate script:', error);
      setError('Failed to generate script. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateScene = (sceneId: number, updatedScene: ScriptScene) => {
    dispatch({ type: 'UPDATE_SCENE', payload: { sceneId, scene: updatedScene } });
  };

  const handleDeleteScene = (sceneId: number) => {
    dispatch({ type: 'DELETE_SCENE', payload: { sceneId } });
  };

  const handleMoveScene = (sceneId: number, direction: 'up' | 'down') => {
    dispatch({ type: 'MOVE_SCENE', payload: { sceneId, direction } });
  };

  const handleInsertScene = (sceneId: number) => {
    dispatch({ type: 'INSERT_SCENE', payload: { sceneId } });
  };

  const handleExportScript = () => {
    if (!generatedScript) return;
    
    const scriptText = `# ${generatedScript.title}

**Duration:** ${generatedScript.totalDuration}
**Target Audience:** ${generatedScript.targetAudience}
**Style:** ${generatedScript.videoStyle}
**Estimated Words:** ${generatedScript.estimatedWords}

---

${generatedScript.scenes.map(scene => `
## Scene ${scene.id}: ${scene.sceneType.charAt(0).toUpperCase() + scene.sceneType.slice(1)} (${scene.duration})

**Narration:**
${scene.narration}

**Image Prompt:**
${scene.imagePrompt}

**Key Points:**
${scene.keyPoints.map(point => `- ${point}`).join('\n')}

---
`).join('\n')}`;

    const blob = new Blob([scriptText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedScript.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_script.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerateVideo = async () => {
    if (!generatedScript) return;

    try {
      setIsGeneratingVideo(true);
      setVideoError(null);

      // Calculate video credit cost
      let videoCreditCost = creditCosts.video;
      if (videoSettings.resolution === '1440p') videoCreditCost += 5;
      if (videoSettings.resolution === '4K') videoCreditCost += 10;
      if (videoSettings.quality === 'high') videoCreditCost += 3;
      if (videoSettings.quality === 'ultra') videoCreditCost += 7;
      if (videoSettings.frameRate === 60) videoCreditCost += 5;

      // Prepare scenes data for video generation using actual generated assets
      const scenesData = generatedScript.scenes.map(scene => {
        const assets = sceneAssets[scene.id] || {};
        return {
          id: scene.id,
          imageUrl: assets.imageUrl || null,
          audioUrl: assets.audioUrl || null,
          duration: parseFloat(scene.duration.replace(/[^0-9.]/g, '')) || 10 // Extract seconds from duration string
        };
      });

      // Check if we have at least some assets
      const scenesWithAssets = scenesData.filter(scene => scene.imageUrl && scene.audioUrl);
      
      if (scenesWithAssets.length === 0) {
        setVideoError('Please generate both images and audio for at least one scene before creating a video.');
        return;
      }

      console.log('📊 Scene assets status before upload:', {
        totalScenes: scenesData.length,
        scenesWithBothAssets: scenesWithAssets.length,
        sceneAssets: scenesData.map(scene => ({
          sceneId: scene.id,
          hasImage: !!scene.imageUrl,
          hasAudio: !!scene.audioUrl,
          imageType: scene.imageUrl?.startsWith('blob:') ? 'blob' : 
                     scene.imageUrl?.startsWith('/') ? 'server' : 'unknown',
          audioType: scene.audioUrl?.startsWith('blob:') ? 'blob' : 
                     scene.audioUrl?.startsWith('/') ? 'server' : 'unknown'
        }))
      });

      // Check if we have any blob URLs that need uploading
      const hasBlobs = scenesData.some(scene => 
        scene.imageUrl?.startsWith('blob:') || scene.audioUrl?.startsWith('blob:')
      );

      let finalScenesData = scenesData;

      if (hasBlobs) {
        console.log('📤 Found blob URLs, uploading assets first...');
        
        // Import the upload utility
        const { uploadScenesAssets } = await import('@/utils/asset-upload');
        
        // Convert scenes data to the format expected by uploadScenesAssets
        const scenesForUpload = scenesData.map(scene => ({
          id: scene.id,
          imageUrl: scene.imageUrl,
          audioUrl: scene.audioUrl,
          duration: scene.duration
        }));
        
        try {
          // Upload all blob assets to server
          const uploadedScenes = await uploadScenesAssets(scenesForUpload);
          
          console.log('✅ Assets uploaded successfully:', {
            uploadedScenes: uploadedScenes.map(scene => ({
              id: scene.id,
              imageUrl: scene.imageUrl?.substring(0, 50) + '...',
              audioUrl: scene.audioUrl?.substring(0, 50) + '...'
            }))
          });
          
          finalScenesData = uploadedScenes;
          
        } catch (uploadError) {
          console.error('❌ Failed to upload assets:', uploadError);
          setVideoError(`Failed to upload assets: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
          return;
        }
      }

      // Verify all assets are now server URLs
      const allServerUrls = finalScenesData.every(scene => 
        scene.imageUrl?.startsWith('/') && scene.audioUrl?.startsWith('/')
      );

      if (!allServerUrls) {
        console.error('❌ Not all assets are server URLs after upload');
        setVideoError('Some assets failed to upload properly. Please try again.');
        return;
      }

      console.log('🎬 Generating video with server assets:', {
        title: generatedScript.title,
        scenes: finalScenesData.length,
        settings: videoSettings,
        estimatedCost: videoCreditCost,
        allAssetsAreServerUrls: allServerUrls
      });

      // Add narration to scenes for subtitle generation
      const scenesWithNarration = finalScenesData.map(scene => {
        const scriptScene = generatedScript.scenes.find(s => s.id === scene.id);
        return {
          ...scene,
          narration: scriptScene?.narration || ''
        };
      });

      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scriptTitle: generatedScript.title,
          scenes: scenesWithNarration,
          settings: {
            resolution: videoSettings.resolution,
            frameRate: videoSettings.frameRate,
            format: videoSettings.format,
            quality: videoSettings.quality,
            transition: videoSettings.transition,
            transitionDuration: videoSettings.transitionDuration,
            subtitles: videoSettings.subtitles,
            animation: videoSettings.animation,
            orientation: videoSettings.orientation,
            backgroundMusic: videoSettings.backgroundMusic
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          setVideoError(`Insufficient credits. You need ${data.required} credits but only have ${data.available}.`);
        } else {
          console.error('❌ Video generation API error:', data);
          setVideoError(data.error || 'Failed to generate video');
        }
        return;
      }

      console.log('✅ Video generated successfully:', data.video);

      setGeneratedVideo(data.video);
      setUserCredits(data.remainingCredits);
      
    } catch (error) {
      console.error('Failed to generate video:', error);
      setVideoError('Failed to generate video. Please try again.');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleDownloadVideo = () => {
    if (!generatedVideo) return;

    const a = document.createElement('a');
    a.href = generatedVideo.url;
    a.download = generatedVideo.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePreviewVideo = () => {
    if (!generatedVideo) return;
    window.open(generatedVideo.url, '_blank');
  };

  const handleDeleteVideo = () => {
    setGeneratedVideo(null);
    setVideoError(null);
  };

  // Calculate video credit cost dynamically
  const calculateVideoCreditCost = () => {
    let cost = creditCosts.video;
    if (videoSettings.resolution === '1440p') cost += 5;
    if (videoSettings.resolution === '4K') cost += 10;
    if (videoSettings.quality === 'high') cost += 3;
    if (videoSettings.quality === 'ultra') cost += 7;
    if (videoSettings.frameRate === 60) cost += 5;
    return cost;
  };

  // Check if video generation is possible
  const canGenerateVideo = () => {
    return generatedScript && generatedScript.scenes.length > 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
            <div className="text-lg text-gray-600">Loading...</div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-lg text-gray-600 mb-4">Please log in to access script generation.</div>
            <Link 
              href="/auth/login" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Go to Login
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Script Generation</h1>
          </div>
          <p className="text-gray-600">
            Transform your ideas into engaging video scripts with AI-powered narration and image prompts
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Welcome Card - Show when no script is generated */}
        {!generatedScript && (
          <div className="mb-8">
            <Card className="p-12 text-center">
              <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-12 h-12 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Ready to Generate Your Script?
              </h3>
              <p className="text-gray-600 mb-6">
                Enter your video idea and settings below, then click "Generate Script" to create a detailed script with narration and image prompts.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">Scene-by-Scene</h4>
                  <p className="text-sm text-gray-600">Detailed breakdown with narration for each scene</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Image className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">Image Prompts</h4>
                  <p className="text-sm text-gray-600">DALL-E prompts for visual content generation</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Edit3 className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">Fully Editable</h4>
                  <p className="text-sm text-gray-600">Customize every scene to match your vision</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Panel - Settings & Credits */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Your Credits</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600 mb-2">{userCredits}</div>
                <div className="text-sm text-gray-600 mb-4">Credits remaining</div>
                <div className="text-xs text-gray-500">
                  Script generation costs 10 credits
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video Length
                  </label>
                  <select
                    value={videoLength}
                    onChange={(e) => setVideoLength(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="30 seconds">30 seconds</option>
                    <option value="45 seconds">45 seconds</option>
                    <option value="1 minute">1 minute</option>
                    <option value="2 minutes">2 minutes</option>
                    <option value="3 minutes">3 minutes</option>
                    <option value="5 minutes">5 minutes</option>
                    <option value="flexible">Flexible (AI decides) - Up to 60 scenes</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {getSceneInfo(videoLength)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video Style
                  </label>
                  <select
                    value={videoStyle}
                    onChange={(e) => setVideoStyle(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="tutorial">Tutorial</option>
                    <option value="review">Review</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="educational">Educational</option>
                    <option value="comparison">Comparison</option>
                    <option value="reaction">Reaction</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Audience
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="general">General Audience</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image Format
                  </label>
                  <select
                    value={imageFormat}
                    onChange={(e) => setImageFormat(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="landscape">Landscape (16:9) - YouTube Standard</option>
                    <option value="portrait">Portrait (9:16) - YouTube Shorts</option>
                    <option value="square">Square (1:1) - Social Media</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {imageFormat === 'landscape' && 'Best for regular YouTube videos (1792x1024)'}
                    {imageFormat === 'portrait' && 'Best for YouTube Shorts and mobile (1024x1792)'}
                    {imageFormat === 'square' && 'Best for social media posts (1024x1024)'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image Style
                  </label>
                  <select
                    value={imageStyle}
                    onChange={(e) => setImageStyle(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="realistic">Realistic</option>
                    <option value="animation">Animation / Cartoon</option>
                    <option value="oil-painting">Oil Painting</option>
                    <option value="watercolor">Watercolor</option>
                    <option value="pixel-art">Pixel Art</option>
                    <option value="sketch">Pencil Sketch</option>
                    <option value="digital-art">Digital Art</option>
                    <option value="minimalist">Minimalist</option>
                    <option value="vintage">Vintage / Retro</option>
                    <option value="cyberpunk">Cyberpunk / Futuristic</option>
                    <option value="fantasy">Fantasy / Magical</option>
                    <option value="comic-book">Comic Book Style</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose an artistic style for generated images
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={characterConsistency}
                      onChange={(e) => setCharacterConsistency(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Character Consistency
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Maintain consistent character appearance across scenes for stories with recurring characters
                  </p>
                  {characterConsistency && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-700">
                        ✨ When enabled, the AI will create a character registry and ensure characters look the same throughout your video. Perfect for storytelling content!
                      </p>
                    </div>
                  )}
                </div>

                {/* Audio Settings Divider */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                    🎵 Audio Settings
                  </h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Audio Voice
                  </label>
                  <select
                    value={audioVoice}
                    onChange={(e) => setAudioVoice(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="alloy">Alloy (Neutral, balanced)</option>
                    <option value="echo">Echo (Male, clear)</option>
                    <option value="fable">Fable (British, expressive)</option>
                    <option value="onyx">Onyx (Deep male, authoritative)</option>
                    <option value="nova">Nova (Female, energetic)</option>
                    <option value="shimmer">Shimmer (Soft female, gentle)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose a voice for audio generation
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Speaking Speed
                  </label>
                  <select
                    value={audioSpeed}
                    onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value={0.75}>Slow (0.75x)</option>
                    <option value={1.0}>Normal (1.0x)</option>
                    <option value={1.25}>Fast (1.25x)</option>
                    <option value={1.5}>Very Fast (1.5x)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Adjust the speaking pace for narration
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Audio Format
                  </label>
                  <select
                    value={audioFormat}
                    onChange={(e) => setAudioFormat(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="mp3">MP3 (Recommended for web)</option>
                    <option value="wav">WAV (High quality for editing)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose audio format for downloads
                  </p>
                </div>

              </div>
            </Card>

            <Button 
              onClick={handleGenerateScript}
              disabled={isGenerating || !idea.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Script...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Script (10 credits)
                </>
              )}
            </Button>

            {/* Video Error Display */}
            {videoError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{videoError}</p>
              </div>
            )}

            {/* Generated Video Display */}
            {generatedVideo && (
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  🎬 Generated Video
                </h3>
                
                <div className="space-y-4">
                  {/* Video Thumbnail/Preview */}
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                      <div className="text-center">
                        <Play className="w-12 h-12 text-indigo-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Video Preview</p>
                      </div>
                    </div>
                  </div>

                  {/* Video Information */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900 truncate" title={generatedVideo.title}>
                      {generatedVideo.title}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>
                        <span className="font-medium">Duration:</span> {Math.floor(generatedVideo.duration / 60)}:{(generatedVideo.duration % 60).toString().padStart(2, '0')}
                      </div>
                      <div>
                        <span className="font-medium">Size:</span> {(generatedVideo.size / (1024 * 1024)).toFixed(1)} MB
                      </div>
                      <div>
                        <span className="font-medium">Format:</span> {generatedVideo.settings.format.toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium">Quality:</span> {generatedVideo.settings.resolution}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Generated {new Date(generatedVideo.generatedAt).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {generatedVideo.scenesCount} scenes • {generatedVideo.settings.frameRate} fps
                    </div>
                  </div>

                  {/* Video Actions */}
                  <div className="space-y-2">
                    <Button 
                      onClick={handleDownloadVideo}
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Video
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handlePreviewVideo}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleDeleteVideo}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* YouTube Upload and Regenerate Actions */}
                  <div className="pt-2 border-t border-gray-200 space-y-2">
                    <a
                      href={`/dashboard/youtube-upload?video=${encodeURIComponent(generatedVideo.id || generatedVideo.filename)}&title=${encodeURIComponent(generatedVideo.title || generatedScript?.title || 'Generated Video')}&scriptData=${encodeURIComponent(JSON.stringify(generatedScript))}`}
                      className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      Upload to YouTube
                    </a>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setGeneratedVideo(null);
                        setVideoError(null);
                      }}
                      className="w-full"
                    >
                      🔄 Regenerate with Different Settings
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Tips Card */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">💡 Tips</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Be specific about your topic and target audience</p>
                <p>• Include key points you want to cover</p>
                <p>• Mention any specific style or tone preferences</p>
                <p>• The AI will create scene-by-scene breakdowns</p>
                <p>• You can edit and customize the generated script</p>
                <p>• Scene durations are calculated based on word count (160 words/minute)</p>
              </div>
            </Card>

            {/* Video Settings Card */}
            {generatedScript && (
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  🎬 Video Settings
                </h3>
                <VideoSettingsForm
                  settings={videoSettings}
                  onSettingsChange={setVideoSettings}
                  className=""
                />
                
                {/* Generate Video Button */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <Button 
                    onClick={handleGenerateVideo}
                    disabled={isGeneratingVideo || !canGenerateVideo()}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:opacity-50"
                  >
                    {isGeneratingVideo ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Video...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Generate Video ({calculateVideoCreditCost()} credits)
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Right Panel - Video Idea Input and Generated Script */}
          <div className="lg:col-span-3 space-y-6">
            {/* Video Idea Input - Always visible */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Video Idea</h3>
                  <p className="text-sm text-gray-600">Describe your video concept, topic, or the idea you want to turn into a script</p>
                </div>
              </div>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Enter your video idea, topic, or concept here...

For example:
- A tutorial on how to use React hooks for beginners
- A review of the latest iPhone comparing it to Android alternatives
- An explanation of cryptocurrency and blockchain technology
- A cooking video showing how to make authentic Italian pasta

The more detailed your idea, the better the AI can create a tailored script for you."
                className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                rows={generatedScript ? 6 : 12}
              />
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm text-gray-500">
                  {idea.length} characters
                </div>
                {ideaFromParams && (
                  <div className="text-sm text-green-600 flex items-center gap-1">
                    <span>✓</span>
                    Idea imported from idea generation
                  </div>
                )}
              </div>
            </Card>

            {/* Generated Script - Show when available */}
            {generatedScript && (
              <div className="space-y-6">
                {/* Script Header */}
                <Card className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {generatedScript.title}
                      </h2>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {generatedScript.totalDuration}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {generatedScript.targetAudience}
                        </span>
                        <span>{generatedScript.estimatedWords} words</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleExportScript}>
                        <Download className="w-4 h-4 mr-1" />
                        Export
                      </Button>
                      <Button variant="outline">
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800">
                      {generatedScript.scenes.length} scenes
                    </Badge>
                    <Badge className="bg-green-100 text-green-800">
                      {generatedScript.videoStyle}
                    </Badge>
                  </div>
                </Card>

                {/* Batch Generation Panel */}
                <BatchGenerationPanel 
                  scenes={generatedScript.scenes.map(scene => ({
                    id: scene.id,
                    imagePrompt: scene.imagePrompt,
                    narration: scene.narration,
                    imageUrl: sceneAssets[scene.id]?.imageUrl,
                    audioUrl: sceneAssets[scene.id]?.audioUrl,
                    charactersInScene: scene.charactersInScene
                  }))}
                  onAssetUpdate={(sceneId, assets) => {
                    dispatch({ type: 'UPDATE_ASSETS', payload: { sceneId, assets } });
                  }}
                  imageFormat={imageFormat}
                  imageStyle={imageStyle}
                  audioVoice={audioVoice}
                  audioSpeed={audioSpeed}
                  audioFormat={audioFormat}
                  scriptCharacters={generatedScript.characters}
                  characterConsistency={generatedScript.characterConsistency}
                />

                {/* Scenes */}
                <div className="space-y-4">
                  {generatedScript.scenes.map((scene, index) => (
                    <SceneCard
                      key={scene.id}
                      scene={scene}
                      onUpdate={(updatedScene) => handleUpdateScene(scene.id, updatedScene)}
                      onDelete={() => handleDeleteScene(scene.id)}
                      isFirst={index === 0}
                      isLast={index === generatedScript.scenes.length - 1}
                      onMoveUp={() => handleMoveScene(scene.id, 'up')}
                      onMoveDown={() => handleMoveScene(scene.id, 'down')}
                      onInsertAbove={() => handleInsertScene(scene.id)}
                      onCreditsUpdate={setUserCredits}
                      imageFormat={imageFormat}
                      imageStyle={imageStyle}
                      audioVoice={audioVoice}
                      audioSpeed={audioSpeed}
                      audioFormat={audioFormat}
                      creditCosts={creditCosts}
                      onAssetUpdate={(sceneId, assets) => {
                        dispatch({ type: 'UPDATE_ASSETS', payload: { sceneId, assets } });
                      }}
                      existingAssets={sceneAssets[scene.id]}
                      scriptCharacters={generatedScript.characters}
                      characterConsistency={generatedScript.characterConsistency}
                    />
                  ))}
                </div>

                {/* Add Scene Button */}
                <Card className="p-6 border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        // Add a new scene at the end
                        const newScene: ScriptScene = {
                          id: generatedScript.scenes.length + 1,
                          narration: "Enter your narration here...",
                          duration: "10 seconds",
                          imagePrompt: "Describe the image for this scene...",
                          sceneType: 'explanation',
                          keyPoints: [],
                          wordCount: 20
                        };
                        
                        dispatch({ 
                          type: 'SET_SCRIPT', 
                          payload: {
                            ...generatedScript,
                            scenes: [...generatedScript.scenes, newScene]
                          }
                        });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add New Scene
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
