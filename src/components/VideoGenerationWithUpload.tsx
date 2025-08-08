'use client';

import React, { useState } from 'react';
import { uploadScenesAssets, hasCompleteAssets } from '@/utils/asset-upload';
import VideoSettingsForm, { VideoSettings } from '@/components/VideoSettingsForm';
import { getDefaultSubtitleSettings } from '@/utils/subtitle-generator';

interface Scene {
  id: number;
  imageUrl?: string;
  audioUrl?: string;
  imageBlob?: Blob;
  audioBlob?: Blob;
  duration: number;
  narration?: string; // Add narration for subtitle support
}

interface VideoGenerationWithUploadProps {
  scenes: Scene[];
  settings: VideoSettings;
  scriptTitle: string;
  onVideoGenerated?: (video: any) => void;
  onError?: (error: string) => void;
}

export function VideoGenerationWithUpload({
  scenes,
  settings,
  scriptTitle,
  onVideoGenerated,
  onError
}: VideoGenerationWithUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generatedVideo, setGeneratedVideo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if we have scenes ready for video generation
  const readyScenes = scenes.filter(hasCompleteAssets);
  const canGenerate = readyScenes.length > 0;

  // Calculate credit cost
  const calculateCreditCost = () => {
    let cost = 15; // Base cost
    if (settings.resolution === '1440p') cost += 5;
    if (settings.resolution === '4K') cost += 10;
    if (settings.quality === 'high') cost += 3;
    if (settings.quality === 'ultra') cost += 7;
    if (settings.frameRate === 60) cost += 5;
    return cost;
  };

  const handleGenerateVideo = async () => {
    try {
      setError(null);
      setIsUploading(true);
      setUploadProgress(0);

      console.log('🚀 Starting video generation with upload-first approach...');

      // Step 1: Upload assets to server
      console.log('📤 Uploading assets to server...');
      const scenesWithServerUrls = await uploadScenesAssets(scenes);
      
      setUploadProgress(100);
      setIsUploading(false);

      // Step 2: Generate video using server URLs
      setIsGenerating(true);
      console.log('🎬 Starting video generation...');
      
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptTitle,
          scenes: scenesWithServerUrls,
          settings
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Video generation failed');
      }

      const result = await response.json();
      setGeneratedVideo(result.video);
      onVideoGenerated?.(result.video);
      
      console.log('✅ Video generated successfully!');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Video generation error:', err);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
      setIsGenerating(false);
    }
  };

  const resetGeneration = () => {
    setGeneratedVideo(null);
    setError(null);
    setUploadProgress(0);
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Video Generation</h3>
          <p className="text-sm text-gray-600 mt-1">
            Upload assets and generate your video ({calculateCreditCost()} credits)
          </p>
        </div>
        <button
          onClick={handleGenerateVideo}
          disabled={!canGenerate || isUploading || isGenerating}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {isUploading ? 'Uploading Assets...' : 
           isGenerating ? 'Generating Video...' : 
           'Generate Video'}
        </button>
      </div>

      {/* Scene Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenes.map((scene, index) => (
          <div key={scene.id} className="p-3 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">Scene {index + 1}</span>
              <span className="text-sm text-gray-500">{scene.duration}s</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${
                  scene.imageBlob || scene.imageUrl ? 'bg-green-500' : 'bg-red-500'
                }`}></span>
                <span className={scene.imageBlob || scene.imageUrl ? 'text-green-700' : 'text-red-700'}>
                  {scene.imageBlob || scene.imageUrl ? 'Image Ready' : 'Image Missing'}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${
                  scene.audioBlob || scene.audioUrl ? 'bg-green-500' : 'bg-red-500'
                }`}></span>
                <span className={scene.audioBlob || scene.audioUrl ? 'text-green-700' : 'text-red-700'}>
                  {scene.audioBlob || scene.audioUrl ? 'Audio Ready' : 'Audio Missing'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Uploading assets to server...</span>
            <span className="text-blue-600 font-medium">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            Converting blob URLs to server-accessible files...
          </p>
        </div>
      )}

      {/* Generation Progress */}
      {isGenerating && (
        <div className="flex items-center justify-center space-x-3 py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-700">Generating video with FFmpeg...</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800">Video Generation Failed</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              {error.includes('blob:') && (
                <p className="text-xs text-red-600 mt-2">
                  💡 Tip: This error occurs when blob URLs are sent to the server. The upload-first approach should prevent this.
                </p>
              )}
            </div>
          </div>
          <div className="mt-3">
            <button
              onClick={resetGeneration}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Success Display */}
      {generatedVideo && (
        <div className="space-y-6">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-green-800">Video Generated Successfully!</h4>
                <div className="mt-2 space-y-2">
                  <div className="text-sm text-green-700">
                    <p><strong>Title:</strong> {generatedVideo.title}</p>
                    <p><strong>Duration:</strong> {generatedVideo.duration}s</p>
                    <p><strong>Size:</strong> {(generatedVideo.size / 1024 / 1024).toFixed(2)}MB</p>
                    <p><strong>Format:</strong> {settings.format.toUpperCase()} • {settings.resolution} • {settings.frameRate}fps</p>
                  </div>
                  <div className="flex space-x-3 mt-3">
                    <a
                      href={generatedVideo.url}
                      download={generatedVideo.filename}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Video
                    </a>
                    <a
                      href={generatedVideo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Preview Video
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex space-x-3">
              <a
                href={`/dashboard/youtube-upload?video=${encodeURIComponent(generatedVideo.id || generatedVideo.filename)}&title=${encodeURIComponent(generatedVideo.title || scriptTitle)}&description=${encodeURIComponent(`Generated video: ${scriptTitle}\n\nDuration: ${generatedVideo.duration}s\nResolution: ${settings.resolution}\nGenerated with AI video creation platform.`)}&orientation=${encodeURIComponent(settings.orientation)}&resolution=${encodeURIComponent(settings.resolution)}&frameRate=${encodeURIComponent(settings.frameRate.toString())}&format=${encodeURIComponent(settings.format)}&quality=${encodeURIComponent(settings.quality)}`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                Upload to YouTube
              </a>
              <button
                onClick={resetGeneration}
                className="text-sm text-green-600 hover:text-green-800 font-medium"
              >
                Generate Another Video
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Info Panel */}
      {!canGenerate && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Assets Required</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Please generate images and audio for your scenes before creating a video. 
                Each scene needs both an image and audio file.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Technical Info */}
      <div className="text-xs text-gray-500 border-t border-gray-200 pt-4">
        <p><strong>Upload-First Approach:</strong> Assets are uploaded to the server before video generation to ensure compatibility and reliability.</p>
        <p className="mt-1"><strong>Ready Scenes:</strong> {readyScenes.length} of {scenes.length} scenes have both image and audio assets.</p>
      </div>
    </div>
  );
}
