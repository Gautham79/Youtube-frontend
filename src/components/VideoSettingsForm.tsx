'use client';

import React, { useState } from 'react';
import { SubtitleSettings, getDefaultSubtitleSettings } from '@/utils/subtitle-types';
import { AnimationSettings, getDefaultAnimationSettings, getAvailableAnimations, getAnimationDescription } from '@/utils/video-animations';
import { BackgroundMusicSettings } from '@/utils/youtube-music-api';
import BackgroundMusicSelector from '@/components/BackgroundMusicSelector';

export interface VideoSettings {
  resolution: '720p' | '1080p' | '1440p' | '4K';
  frameRate: 24 | 30 | 60;
  format: 'mp4' | 'webm';
  quality: 'standard' | 'high' | 'ultra';
  orientation: 'landscape' | 'portrait' | 'square';
  transition: 'none' | 'fade' | 'slide' | 'zoom';
  transitionDuration: 0.5 | 1 | 1.5 | 2;
  subtitles?: SubtitleSettings;
  animation?: AnimationSettings;
  backgroundMusic?: BackgroundMusicSettings;
}

interface VideoSettingsFormProps {
  settings: VideoSettings;
  onSettingsChange: (settings: VideoSettings) => void;
  className?: string;
}

export default function VideoSettingsForm({ 
  settings, 
  onSettingsChange, 
  className = '' 
}: VideoSettingsFormProps) {
  // Default background music settings
  const getDefaultBackgroundMusicSettings = (): BackgroundMusicSettings => ({
    enabled: false,
    volume: 30,
    fadeIn: 2,
    fadeOut: 3,
    startOffset: 0,
    loop: true,
    source: 'youtube'
  });

  const [localSettings, setLocalSettings] = useState<VideoSettings>({
    ...settings,
    orientation: settings.orientation || 'landscape',
    subtitles: settings.subtitles || getDefaultSubtitleSettings(),
    animation: settings.animation || getDefaultAnimationSettings(),
    backgroundMusic: settings.backgroundMusic || getDefaultBackgroundMusicSettings()
  });

  const handleChange = (key: keyof VideoSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleSubtitleChange = (key: keyof SubtitleSettings, value: any) => {
    const newSubtitles = { 
      ...localSettings.subtitles!, 
      [key]: value 
    };
    const newSettings = { 
      ...localSettings, 
      subtitles: newSubtitles 
    };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleSubtitleStyleChange = (key: string, value: any) => {
    const newStyle = { 
      ...localSettings.subtitles!.style!, 
      [key]: value 
    };
    const newSubtitles = { 
      ...localSettings.subtitles!, 
      style: newStyle 
    };
    const newSettings = { 
      ...localSettings, 
      subtitles: newSubtitles 
    };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Video Quality Settings */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Video Quality</h4>
        
        {/* Resolution & Format - Full Width */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resolution & Format
          </label>
          <select
            value={`${localSettings.resolution}-${localSettings.orientation}`}
            onChange={(e) => {
              const [resolution, orientation] = e.target.value.split('-');
              handleChange('resolution', resolution);
              handleChange('orientation', orientation);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <optgroup label="Landscape (16:9) - YouTube Standard">
              <option value="720p-landscape">720p HD Landscape</option>
              <option value="1080p-landscape">1080p Full HD Landscape</option>
              <option value="1440p-landscape">1440p 2K Landscape</option>
              <option value="4K-landscape">4K Ultra HD Landscape</option>
            </optgroup>
            <optgroup label="Portrait (9:16) - YouTube Shorts">
              <option value="720p-portrait">720p HD Portrait</option>
              <option value="1080p-portrait">1080p Full HD Portrait</option>
              <option value="1440p-portrait">1440p 2K Portrait</option>
              <option value="4K-portrait">4K Ultra HD Portrait</option>
            </optgroup>
            <optgroup label="Square (1:1) - Social Media">
              <option value="720p-square">720p HD Square</option>
              <option value="1080p-square">1080p Full HD Square</option>
              <option value="1440p-square">1440p 2K Square</option>
              <option value="4K-square">4K Ultra HD Square</option>
            </optgroup>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {localSettings.orientation === 'landscape' && 'Standard widescreen format, ideal for desktop viewing'}
            {localSettings.orientation === 'portrait' && 'Vertical format, perfect for mobile and social media'}
            {localSettings.orientation === 'square' && 'Square format, great for Instagram and social posts'}
          </p>
        </div>

        {/* Frame Rate, Quality, Format - Each on its own row */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Frame Rate
            </label>
            <select
              value={localSettings.frameRate}
              onChange={(e) => handleChange('frameRate', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={24}>24 fps (Cinematic)</option>
              <option value={30}>30 fps (Standard)</option>
              <option value={60}>60 fps (Smooth)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quality
            </label>
            <select
              value={localSettings.quality}
              onChange={(e) => handleChange('quality', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="standard">Standard</option>
              <option value="high">High</option>
              <option value="ultra">Ultra</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Format
            </label>
            <select
              value={localSettings.format}
              onChange={(e) => handleChange('format', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="mp4">MP4</option>
              <option value="webm">WebM</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transition Settings */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Transitions</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transition Type
            </label>
            <select
              value={localSettings.transition}
              onChange={(e) => handleChange('transition', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">None</option>
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
              <option value="zoom">Zoom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration
            </label>
            <select
              value={localSettings.transitionDuration}
              onChange={(e) => handleChange('transitionDuration', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={localSettings.transition === 'none'}
            >
              <option value={0.5}>0.5 seconds</option>
              <option value={1}>1 second</option>
              <option value={1.5}>1.5 seconds</option>
              <option value={2}>2 seconds</option>
            </select>
          </div>
        </div>
      </div>

      {/* Animation Settings */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Scene Animations</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Animation Type
            </label>
            <select
              value={localSettings.animation?.type || 'none'}
              onChange={(e) => {
                const newAnimation = { 
                  ...localSettings.animation!, 
                  type: e.target.value as any 
                };
                handleChange('animation', newAnimation);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {getAvailableAnimations().map(({ type, description }) => (
                <option key={type} value={type}>
                  {description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Animation Intensity
            </label>
            <select
              value={localSettings.animation?.intensity || 'subtle'}
              onChange={(e) => {
                const newAnimation = { 
                  ...localSettings.animation!, 
                  intensity: e.target.value as any 
                };
                handleChange('animation', newAnimation);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={localSettings.animation?.type === 'none'}
            >
              <option value="subtle">Subtle</option>
              <option value="moderate">Moderate</option>
              <option value="strong">Strong</option>
            </select>
          </div>
        </div>
      </div>

      {/* Subtitle Settings */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Subtitles</h4>
        
        {/* Enable/Disable Subtitles */}
        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={localSettings.subtitles?.enabled || false}
              onChange={(e) => handleSubtitleChange('enabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Enable Subtitles
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Add embedded subtitles to your video using the script narration
          </p>
        </div>

        {/* Subtitle Position and Style */}
        {localSettings.subtitles?.enabled && (
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <div className="space-y-4">
              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                <select
                  value={localSettings.subtitles.position}
                  onChange={(e) => handleSubtitleChange('position', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bottom">Bottom</option>
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                </select>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Font Size
                </label>
                <select
                  value={localSettings.subtitles.style?.fontSize || 32}
                  onChange={(e) => handleSubtitleStyleChange('fontSize', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={24}>Small (24px)</option>
                  <option value={32}>Medium (32px)</option>
                  <option value={48}>Large (48px)</option>
                  <option value={64}>Extra Large (64px)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Background Music Settings */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Background Music</h4>
        <BackgroundMusicSelector
          settings={localSettings.backgroundMusic!}
          onSettingsChange={(musicSettings) => handleChange('backgroundMusic', musicSettings)}
          videoContent={{
            title: 'Video Title',
            description: 'Video Description',
            duration: 120
          }}
        />
      </div>

      {/* Settings Summary */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-3">Settings Summary</h4>
        <div className="text-sm text-blue-700 space-y-2">
          <div className="flex justify-between">
            <span>Resolution:</span>
            <span>{localSettings.resolution} {localSettings.orientation}</span>
          </div>
          <div className="flex justify-between">
            <span>Quality:</span>
            <span>{localSettings.quality} • {localSettings.frameRate} fps • {localSettings.format.toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>Transitions:</span>
            <span>{localSettings.transition === 'none' ? 'Disabled' : `${localSettings.transition} (${localSettings.transitionDuration}s)`}</span>
          </div>
          <div className="flex justify-between">
            <span>Animation:</span>
            <span>{localSettings.animation?.type === 'none' ? 'Disabled' : `${localSettings.animation?.intensity} intensity`}</span>
          </div>
          <div className="flex justify-between">
            <span>Subtitles:</span>
            <span>{localSettings.subtitles?.enabled ? `Enabled (${localSettings.subtitles.position})` : 'Disabled'}</span>
          </div>
          <div className="flex justify-between">
            <span>Background Music:</span>
            <span>{localSettings.backgroundMusic?.enabled ? `Enabled (${localSettings.backgroundMusic.volume}%)` : 'Disabled'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
