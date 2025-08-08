'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from 'next/navigation';
import Navbar from "@/app/(site)/Navbar";
import Footer from "@/app/(site)/Footer";
import Link from "next/link";
import { ArrowLeft, Youtube, Upload, Play, Download, Settings, Eye, Calendar, Globe, Lock, Users, Tag, FileText, Image as ImageIcon, Loader2, CheckCircle, AlertCircle, ExternalLink, Sparkles, TrendingUp, Clock, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { 
  checkVideoAvailability, 
  extractVideoFilename, 
  getVideoServeUrl, 
  formatFileSize, 
  formatDuration, 
  downloadVideo, 
  previewVideo,
  VideoAvailability
} from "@/utils/video-utils";

interface VideoData {
  id: string;
  title: string;
  url: string;
  filename: string;
  duration: number;
  size: number;
  settings: {
    resolution: string;
    frameRate: number;
    format: string;
    quality: string;
  };
  generatedAt: string;
  scenesCount: number;
}

interface UploadResult {
  success: boolean;
  videoId?: string;
  title?: string;
  uploadStatus?: string;
  privacyStatus?: string;
  error?: string;
}

function YouTubeUploadContent() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  
  // Get video data from URL params
  const videoParam = searchParams.get('video');
  const titleParam = searchParams.get('title');
  const descriptionParam = searchParams.get('description');
  const scriptDataParam = searchParams.get('scriptData');
  const orientationParam = searchParams.get('orientation');
  const resolutionParam = searchParams.get('resolution');
  const frameRateParam = searchParams.get('frameRate');
  const formatParam = searchParams.get('format');
  const qualityParam = searchParams.get('quality');
  
  // State management
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [scriptData, setScriptData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [videoAvailability, setVideoAvailability] = useState<VideoAvailability | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  
  // Channel selection state
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);
  
  // Metadata generation state
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [generatedMetadata, setGeneratedMetadata] = useState<any>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState(titleParam || '');
  const [description, setDescription] = useState(descriptionParam || '');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('22'); // People & Blogs
  const [privacy, setPrivacy] = useState('private');
  const [madeForKids, setMadeForKids] = useState('false');
  const [language, setLanguage] = useState('en');
  const [publishTime, setPublishTime] = useState('now');
  const [customThumbnail, setCustomThumbnail] = useState<File | null>(null);
  
  // Thumbnail dimension selection
  const [thumbnailDimensions, setThumbnailDimensions] = useState('1280x720');
  
  // AI Thumbnail generation state
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  const [generatedThumbnails, setGeneratedThumbnails] = useState<any[]>([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState<any | null>(null);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  
  // SEO and optimization state
  const [showSEOSuggestions, setShowSEOSuggestions] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  // Load video data if video parameter is provided
  useEffect(() => {
    if (videoParam) {
      setIsLoadingVideo(true);
      setVideoError(null);
      
      const loadVideoData = async () => {
        try {
          // Extract filename from video parameter
          const filename = extractVideoFilename(videoParam);
          
          // Check if video exists using simple availability check
          const availability = await checkVideoAvailability(filename);
          setVideoAvailability(availability);
          
          if (availability.exists && availability.url) {
            // Use default values since we're not extracting metadata
            const videoData: VideoData = {
              id: videoParam,
              title: titleParam || 'Generated Video',
              url: availability.url,
              filename: filename,
              duration: 120, // Default duration
              size: availability.size || 25 * 1024 * 1024,
              settings: {
                resolution: resolutionParam || '1080p',
                frameRate: frameRateParam ? parseInt(frameRateParam) : 30,
                format: formatParam || 'mp4',
                quality: qualityParam || 'high'
              },
              generatedAt: new Date().toISOString(),
              scenesCount: 8
            };
            
            setVideoData(videoData);
            if (!title && videoData.title) {
              setTitle(videoData.title);
            }

            console.log('✅ Video loaded successfully:', {
              filename: filename,
              size: `${(videoData.size / 1024 / 1024).toFixed(2)}MB`,
              resolution: videoData.settings.resolution
            });
          } else {
            // Video doesn't exist or isn't accessible
            setVideoError(availability.error || 'Video file not found');
            setVideoData(null);
          }
        } catch (error) {
          console.error('Failed to load video data:', error);
          setVideoError('Failed to load video data');
          setVideoData(null);
        } finally {
          setIsLoadingVideo(false);
        }
      };
      
      loadVideoData();
    }
  }, [videoParam, titleParam, title]);

  // Parse script data from URL parameters
  useEffect(() => {
    if (scriptDataParam) {
      try {
        const parsedScript = JSON.parse(decodeURIComponent(scriptDataParam));
        setScriptData(parsedScript);
        console.log('📝 Script data loaded:', parsedScript);
      } catch (error) {
        console.error('Failed to parse script data:', error);
      }
    }
  }, [scriptDataParam]);

  // Check YouTube connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/youtube/status');
        const data = await response.json();
        
        console.log('YouTube connection status:', data);
        setIsConnected(data.connected);
        
        if (!data.connected) {
          console.log('YouTube not connected. Reason:', data.reason);
          if (data.reason === 'expired') {
            console.log('YouTube tokens expired. User needs to reconnect.');
          } else if (data.reason === 'refresh_failed') {
            console.log('YouTube token refresh failed. User needs to reconnect.');
          }
        } else if (data.reason === 'refreshed') {
          console.log('YouTube tokens were automatically refreshed');
          // Show a subtle notification that tokens were refreshed
          setTimeout(() => {
            console.log('✅ YouTube connection refreshed automatically');
          }, 1000);
        }
      } catch (error) {
        console.error('Failed to check YouTube connection:', error);
        setIsConnected(false);
      }
    };

    if (user) {
      checkConnection();
    }
  }, [user]);

  // Load channels when YouTube is connected
  useEffect(() => {
    const loadChannels = async () => {
      if (!isConnected) {
        setChannels([]);
        setSelectedChannelId('');
        return;
      }

      setIsLoadingChannels(true);
      setChannelError(null);

      try {
        const response = await fetch('/api/youtube/channels');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load channels');
        }

        setChannels(data.channels || []);
        
        // Auto-select first channel if available
        if (data.channels && data.channels.length > 0) {
          setSelectedChannelId(data.channels[0].id);
        }

        console.log('✅ Channels loaded successfully:', data.channels);
      } catch (error) {
        console.error('Failed to load channels:', error);
        setChannelError(error instanceof Error ? error.message : 'Failed to load channels');
        setChannels([]);
        setSelectedChannelId('');
      } finally {
        setIsLoadingChannels(false);
      }
    };

    loadChannels();
  }, [isConnected]);

  // Check connection status after OAuth success
  useEffect(() => {
    const youtubeSuccess = searchParams.get('youtube_success');
    
    if (youtubeSuccess === 'true') {
      // Recheck connection status after OAuth
      const recheckConnection = async () => {
        try {
          const response = await fetch('/api/youtube/status');
          const data = await response.json();
          setIsConnected(data.connected);
          
          if (data.connected) {
            // Show success message
            setTimeout(() => {
              alert('YouTube connected successfully! You can now upload your video.');
            }, 500);
          }
        } catch (error) {
          console.error('Failed to recheck YouTube connection:', error);
        }
      };

      recheckConnection();
    }
  }, [searchParams]);

  // Handle upload context from OAuth callback
  useEffect(() => {
    const uploadContextParam = searchParams.get('uploadContext');
    const youtubeSuccess = searchParams.get('youtube_success');
    
    if (youtubeSuccess && uploadContextParam) {
      try {
        const uploadContext = JSON.parse(decodeURIComponent(uploadContextParam));
        
        // Restore form state from upload context
        if (uploadContext.title) setTitle(uploadContext.title);
        if (uploadContext.description) setDescription(uploadContext.description);
        if (uploadContext.tags) setTags(uploadContext.tags);
        if (uploadContext.category) setCategory(uploadContext.category);
        if (uploadContext.privacy) setPrivacy(uploadContext.privacy);
        if (uploadContext.madeForKids) setMadeForKids(uploadContext.madeForKids);
        
        console.log('✅ Upload context restored after OAuth:', uploadContext);
        
        // Show success message
        setTimeout(() => {
          alert('YouTube connected successfully! You can now upload your video.');
        }, 500);
        
      } catch (error) {
        console.error('Failed to parse upload context:', error);
      }
    }
  }, [searchParams]);

  // Generate AI-powered metadata
  const generateMetadata = async () => {
    if (!scriptData || !videoData) {
      setMetadataError('Script data and video data are required for metadata generation');
      return;
    }

    setIsGeneratingMetadata(true);
    setMetadataError(null);

    try {
      const response = await fetch('/api/youtube/metadata/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
          body: JSON.stringify({
            script: scriptData,
            videoDetails: {
              duration: videoData.duration,
              resolution: videoData.settings.resolution,
              format: videoData.settings.format,
              orientation: orientationParam || 'landscape',
              fileSize: videoData.size
            },
            youtubeStrategy: {
              optimizeFor: 'search',
              targetAudience: scriptData.targetAudience || 'general'
            }
          }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          setMetadataError(`Insufficient credits. You need ${data.required} credits but only have ${data.available}.`);
        } else {
          throw new Error(data.error || 'Failed to generate metadata');
        }
        return;
      }

      setGeneratedMetadata(data.metadata);
      
      // Auto-fill form with generated metadata
      if (data.metadata.title) setTitle(data.metadata.title);
      if (data.metadata.description) setDescription(data.metadata.description);
      if (data.metadata.tags) {
        // Handle both string and array formats
        const tagsString = Array.isArray(data.metadata.tags) 
          ? data.metadata.tags.join(', ')
          : data.metadata.tags;
        setTags(tagsString);
      }
      if (data.metadata.category) setCategory(data.metadata.category);

      console.log('✅ Metadata generated successfully:', data.metadata);
      
    } catch (error) {
      console.error('Failed to generate metadata:', error);
      setMetadataError('Failed to generate metadata. Please try again.');
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  // Generate AI thumbnails
  const generateThumbnails = async () => {
    if (!scriptData || !videoData || !title.trim()) {
      setThumbnailError('Script data, video data, and title are required for thumbnail generation');
      return;
    }

    setIsGeneratingThumbnails(true);
    setThumbnailError(null);
    setGeneratedThumbnails([]);

    try {
      const response = await fetch('/api/youtube/thumbnails/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: scriptData,
          videoDetails: {
            duration: videoData.duration,
            resolution: videoData.settings.resolution,
            format: videoData.settings.format,
            orientation: orientationParam || 'landscape',
            fileSize: videoData.size
          },
          title: title.trim(),
          thumbnailDimensions: thumbnailDimensions
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          setThumbnailError(`Insufficient credits. You need ${data.required} credits but only have ${data.available}.`);
        } else {
          throw new Error(data.error || 'Failed to generate thumbnails');
        }
        return;
      }

      setGeneratedThumbnails(data.thumbnails);
      console.log('✅ Thumbnails generated successfully:', data.thumbnails);
      
    } catch (error) {
      console.error('Failed to generate thumbnails:', error);
      setThumbnailError('Failed to generate thumbnails. Please try again.');
    } finally {
      setIsGeneratingThumbnails(false);
    }
  };

  // Generate SEO suggestions
  const generateSEOSuggestions = async () => {
    if (!title.trim()) return;
    
    setShowSEOSuggestions(true);
    
    // Mock SEO suggestions - in real implementation, use AI or SEO APIs
    const mockTitleSuggestions = [
      `${title} | Complete Guide`,
      `${title} - Everything You Need to Know`,
      `${title} Tutorial for Beginners`,
      `How to ${title} - Step by Step`,
      `${title} Explained Simply`
    ];
    
    const mockTagSuggestions = [
      'tutorial', 'howto', 'guide', 'tips', 'tricks',
      'beginner', 'advanced', 'explained', 'review',
      'educational', 'learning', 'stepbystep'
    ];
    
    setTitleSuggestions(mockTitleSuggestions);
    setTagSuggestions(mockTagSuggestions);
  };

  const connectYouTube = async () => {
    try {
      const response = await fetch('/api/youtube/auth');
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Failed to connect YouTube:', error);
    }
  };

  const handleThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert('Thumbnail file size must be less than 2MB.');
        return;
      }
      
      setCustomThumbnail(file);
      // Clear AI thumbnail selection when uploading custom
      setSelectedThumbnail(null);
    }
  };

  const selectThumbnail = (thumbnail: any) => {
    setSelectedThumbnail(thumbnail);
    // Clear custom thumbnail when selecting AI thumbnail
    setCustomThumbnail(null);
  };

  const uploadToYouTube = async () => {
    if (!videoData) {
      alert('No video data available');
      return;
    }

    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    // Check if YouTube is connected first
    if (!isConnected) {
      alert('Please connect your YouTube account first using the "Connect YouTube Account" button above.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    // Start progress simulation for immediate user feedback
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90; // Stop at 90% until actual upload completes
        }
        return prev + Math.random() * 10; // Simulate progress
      });
    }, 500);

    try {
      // Convert video URL to File object
      setUploadProgress(5);
      const response = await fetch(videoData.url);
      const blob = await response.blob();
      const videoFile = new File([blob], videoData.filename, { type: blob.type });

      setUploadProgress(15);
      const formData = new FormData();
      formData.append('video', videoFile);
      
      const metadata = {
        snippet: {
          title: title.trim(),
          description: description.trim(),
          tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
          categoryId: category,
          defaultLanguage: language,
          channelId: selectedChannelId, // Include selected channel ID
        },
        status: {
          privacyStatus: privacy,
          selfDeclaredMadeForKids: madeForKids === 'true',
          publishAt: publishTime === 'now' ? undefined : publishTime,
        },
      };
      
      formData.append('metadata', JSON.stringify(metadata));

      // Add thumbnail if provided (either custom upload or AI-generated)
      if (customThumbnail) {
        formData.append('thumbnail', customThumbnail);
      } else if (selectedThumbnail) {
        // Convert AI thumbnail URL to File object
        try {
          const thumbnailResponse = await fetch(selectedThumbnail.url);
          const thumbnailBlob = await thumbnailResponse.blob();
          const thumbnailFile = new File([thumbnailBlob], `ai-thumbnail-${selectedThumbnail.concept.toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' });
          formData.append('thumbnail', thumbnailFile);
        } catch (error) {
          console.error('Failed to process AI thumbnail:', error);
          // Continue without thumbnail if conversion fails
        }
      }

      setUploadProgress(25);

      // Create XMLHttpRequest for better progress tracking
      const uploadPromise = new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            // Map the upload progress to 25-95% range (leaving 5% for processing)
            const mappedProgress = 25 + (percentComplete * 0.7);
            setUploadProgress(Math.min(mappedProgress, 95));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              resolve(result);
            } catch (error) {
              reject(new Error('Invalid response format'));
            }
          } else {
            try {
              const errorResult = JSON.parse(xhr.responseText);
              reject(new Error(errorResult.error || 'Upload failed'));
            } catch (error) {
              reject(new Error(`Upload failed with status: ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error occurred'));
        });

        xhr.addEventListener('timeout', () => {
          reject(new Error('Upload timeout'));
        });

        xhr.open('POST', '/api/youtube/upload');
        xhr.timeout = 300000; // 5 minutes timeout
        xhr.send(formData);
      });

      const result = await uploadPromise;

      // Complete the progress
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        setUploadResult({
          success: true,
          videoId: result.videoId,
          title: result.title,
          uploadStatus: result.uploadStatus,
          privacyStatus: result.privacyStatus,
        });
      } else {
        setUploadResult({
          success: false,
          error: result.error || 'Upload failed',
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      clearInterval(progressInterval);
      setUploadResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      });
    } finally {
      clearInterval(progressInterval);
      setIsUploading(false);
      // Keep progress at 100% if successful, reset to 0 if failed
      setTimeout(() => {
        if (!uploadResult?.success) {
          setUploadProgress(0);
        }
      }, 2000);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
            <div className="text-lg text-gray-600 mb-4">Please log in to upload to YouTube.</div>
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
            href="/dashboard/script" 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Script
          </Link>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Youtube className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-900">Upload to YouTube</h1>
          </div>
          <p className="text-gray-600">
            Optimize your video metadata and upload directly to your YouTube channel
          </p>
        </div>

        {isLoadingVideo ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
              <div className="text-gray-600">Loading video data...</div>
            </div>
          </div>
        ) : videoError ? (
          <div className="flex items-center justify-center py-12">
            <Card className="max-w-md">
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Video Not Found</h3>
                  <p className="text-gray-600 mb-4">{videoError}</p>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => window.location.reload()} 
                      variant="outline"
                      className="w-full"
                    >
                      Retry Loading
                    </Button>
                    <Link href="/dashboard/script">
                      <Button variant="default" className="w-full">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Script Generation
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Video Preview */}
            <div className="lg:col-span-1 space-y-6">
              {/* Video Preview */}
              {videoData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Play className="h-5 w-5" />
                      Video Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Video Thumbnail/Player */}
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                        <div className="text-center">
                          <Play className="w-12 h-12 text-indigo-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Video Preview</p>
                        </div>
                      </div>
                    </div>

                    {/* Video Details */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{formatDuration(videoData.duration)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Download className="w-4 h-4 text-gray-400" />
                          <span>{formatFileSize(videoData.size)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-gray-400" />
                          <span>{videoData.settings.resolution}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-gray-400" />
                          <span>{videoData.settings.frameRate} fps</span>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500">
                          <p><strong>Format:</strong> {videoData.settings.format.toUpperCase()}</p>
                          <p><strong>Quality:</strong> {videoData.settings.quality}</p>
                          <p><strong>Scenes:</strong> {videoData.scenesCount}</p>
                          <p><strong>Generated:</strong> {new Date(videoData.generatedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => previewVideo(videoData.filename)}
                        disabled={!videoAvailability?.exists}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview Video
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => downloadVideo(videoData.filename, videoData.title)}
                        disabled={!videoAvailability?.exists}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Video
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* YouTube Connection Status */}
            <Card className={isConnected ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Youtube className="h-5 w-5" />
                  YouTube Account
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isConnected ? (
                  <div>
                    <div className="flex items-center gap-2 text-green-600 mb-4">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">YouTube Connected</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Your YouTube account is connected and ready for uploads.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        if (confirm('Are you sure you want to disconnect your YouTube account? You will need to reconnect to upload videos.')) {
                          try {
                            const response = await fetch('/api/youtube/disconnect', {
                              method: 'POST',
                            });
                            const result = await response.json();
                            
                            if (response.ok && result.success) {
                              setIsConnected(false);
                              alert('YouTube account disconnected successfully');
                            } else {
                              alert('Failed to disconnect: ' + (result.error || 'Unknown error'));
                            }
                          } catch (error) {
                            console.error('Disconnect error:', error);
                            alert('Failed to disconnect YouTube account');
                          }
                        }
                      }}
                    >
                      Disconnect Account
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 text-orange-600 mb-4">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">YouTube Account Required</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Connect your YouTube account to upload videos directly from this platform.
                    </p>
                    <Button 
                      onClick={connectYouTube}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Youtube className="h-4 w-4 mr-2" />
                      Connect YouTube Account
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

              {/* Channel Selection */}
              {isConnected && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Select Channel
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingChannels ? (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading channels...</span>
                      </div>
                    ) : channelError ? (
                      <div className="space-y-3">
                        <Alert className="border-red-200 bg-red-50">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-800">
                            {channelError}
                          </AlertDescription>
                        </Alert>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Retry loading channels
                            setIsLoadingChannels(true);
                            setChannelError(null);
                            fetch('/api/youtube/channels')
                              .then(response => response.json())
                              .then(data => {
                                if (data.channels) {
                                  setChannels(data.channels);
                                  if (data.channels.length > 0) {
                                    setSelectedChannelId(data.channels[0].id);
                                  }
                                } else {
                                  throw new Error(data.error || 'Failed to load channels');
                                }
                              })
                              .catch(error => {
                                setChannelError(error.message);
                              })
                              .finally(() => {
                                setIsLoadingChannels(false);
                              });
                          }}
                        >
                          Retry Loading Channels
                        </Button>
                      </div>
                    ) : channels.length > 0 ? (
                      <div className="space-y-3">
                        <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a channel" />
                          </SelectTrigger>
                          <SelectContent>
                            {channels.map((channel) => (
                              <SelectItem key={channel.id} value={channel.id}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {channel.snippet?.title || channel.title || 'Unnamed Channel'}
                                  </span>
                                  {channel.snippet?.customUrl && (
                                    <span className="text-xs text-gray-500">
                                      ({channel.snippet.customUrl})
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {selectedChannelId && (
                          <div className="text-xs text-gray-600">
                            <p>
                              <strong>Selected:</strong>{' '}
                              {channels.find(c => c.id === selectedChannelId)?.snippet?.title || 
                               channels.find(c => c.id === selectedChannelId)?.title || 
                               'Unnamed Channel'}
                            </p>
                            {channels.find(c => c.id === selectedChannelId)?.snippet?.description && (
                              <p className="mt-1 line-clamp-2">
                                {channels.find(c => c.id === selectedChannelId)?.snippet.description}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center space-y-2">
                        <AlertCircle className="h-8 w-8 text-gray-400 mx-auto" />
                        <p className="text-sm text-gray-600">No channels found</p>
                        <p className="text-xs text-gray-500">
                          Make sure your YouTube account has at least one channel.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Uploading to YouTube...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} />
                      <p className="text-xs text-gray-500">
                        Please don't close this page while uploading
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Upload Result */}
              {uploadResult && (
                <Alert className={uploadResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  {uploadResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription>
                    {uploadResult.success ? (
                      <div className="space-y-2">
                        <p className="font-medium text-green-800">
                          Video uploaded successfully!
                        </p>
                        <div className="space-y-1 text-sm text-green-700">
                          <p><strong>Title:</strong> {uploadResult.title}</p>
                          <p><strong>Status:</strong> {uploadResult.uploadStatus}</p>
                          <p><strong>Privacy:</strong> {uploadResult.privacyStatus}</p>
                          {uploadResult.videoId && (
                            <a
                              href={`https://www.youtube.com/watch?v=${uploadResult.videoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                            >
                              View on YouTube <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-red-800">{uploadResult.error}</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Right Column - Metadata Form */}
            <div className="lg:col-span-2">
              {/* AI Metadata Generation - Prominent Header */}
              {scriptData && (
                <Card className="mb-6 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-purple-900">
                          AI-Powered Metadata Generation
                        </h3>
                        <p className="text-sm text-purple-700">
                          Generate optimized YouTube metadata based on your script content
                        </p>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={generateMetadata}
                      disabled={isGeneratingMetadata}
                      size="lg"
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3"
                    >
                      {isGeneratingMetadata ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generating AI Metadata...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          Generate AI Metadata (2 credits)
                        </>
                      )}
                    </Button>

                    {/* Metadata Error */}
                    {metadataError && (
                      <Alert className="mt-4 border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          {metadataError}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Success Message */}
                    {generatedMetadata && (
                      <Alert className="mt-4 border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          <div className="flex items-center justify-between">
                            <span>AI metadata generated successfully! Check the form fields below.</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setGeneratedMetadata(null)}
                              className="ml-2"
                            >
                              Dismiss
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Upload Form */}
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  <TabsTrigger value="seo">SEO & Optimization</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Video Information</CardTitle>
                      <CardDescription>
                        Basic information about your video
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                          id="title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Enter video title"
                          maxLength={100}
                          disabled={!isConnected}
                        />
                        <p className="text-xs text-gray-500">{title.length}/100 characters</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Enter video description"
                          rows={6}
                          maxLength={5000}
                          disabled={!isConnected}
                        />
                        <p className="text-xs text-gray-500">{description.length}/5000 characters</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tags">Tags</Label>
                        <Input
                          id="tags"
                          value={tags}
                          onChange={(e) => setTags(e.target.value)}
                          placeholder="Enter tags separated by commas"
                          disabled={!isConnected}
                        />
                        <p className="text-xs text-gray-500">
                          Separate tags with commas. Use relevant keywords to help people find your video.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Select value={category} onValueChange={setCategory} disabled={!isConnected}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Film & Animation</SelectItem>
                              <SelectItem value="2">Autos & Vehicles</SelectItem>
                              <SelectItem value="10">Music</SelectItem>
                              <SelectItem value="15">Pets & Animals</SelectItem>
                              <SelectItem value="17">Sports</SelectItem>
                              <SelectItem value="19">Travel & Events</SelectItem>
                              <SelectItem value="20">Gaming</SelectItem>
                              <SelectItem value="22">People & Blogs</SelectItem>
                              <SelectItem value="23">Comedy</SelectItem>
                              <SelectItem value="24">Entertainment</SelectItem>
                              <SelectItem value="25">News & Politics</SelectItem>
                              <SelectItem value="26">Howto & Style</SelectItem>
                              <SelectItem value="27">Education</SelectItem>
                              <SelectItem value="28">Science & Technology</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="privacy">Privacy</Label>
                          <Select value={privacy} onValueChange={setPrivacy} disabled={!isConnected}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="private">Private</SelectItem>
                              <SelectItem value="unlisted">Unlisted</SelectItem>
                              <SelectItem value="public">Public</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Advanced Settings</CardTitle>
                      <CardDescription>
                        Additional settings for your video upload
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="language">Language</Label>
                          <Select value={language} onValueChange={setLanguage} disabled={!isConnected}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="es">Spanish</SelectItem>
                              <SelectItem value="fr">French</SelectItem>
                              <SelectItem value="de">German</SelectItem>
                              <SelectItem value="it">Italian</SelectItem>
                              <SelectItem value="pt">Portuguese</SelectItem>
                              <SelectItem value="ru">Russian</SelectItem>
                              <SelectItem value="ja">Japanese</SelectItem>
                              <SelectItem value="ko">Korean</SelectItem>
                              <SelectItem value="zh">Chinese</SelectItem>
                              <SelectItem value="hi">Hindi</SelectItem>
                              <SelectItem value="ar">Arabic</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="made-for-kids">Made for Kids</Label>
                          <Select value={madeForKids} onValueChange={setMadeForKids} disabled={!isConnected}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="false">No, it's not made for kids</SelectItem>
                              <SelectItem value="true">Yes, it's made for kids</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="publish-time">Publish Time</Label>
                        <Select value={publishTime} onValueChange={setPublishTime} disabled={!isConnected}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="now">Publish immediately</SelectItem>
                            <SelectItem value="schedule">Schedule for later</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Custom Thumbnail Upload */}
                      <div className="space-y-2">
                        <Label htmlFor="thumbnail">Custom Thumbnail</Label>
                        <Input
                          id="thumbnail"
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailUpload}
                          disabled={!isConnected}
                        />
                        <p className="text-xs text-gray-500">
                          Upload a custom thumbnail (JPG, PNG, max 2MB, recommended 1280x720)
                        </p>
                        {customThumbnail && (
                          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <ImageIcon className="h-4 w-4" />
                            <span className="text-sm">{customThumbnail.name}</span>
                            <Badge variant="secondary">
                              {(customThumbnail.size / (1024 * 1024)).toFixed(1)} MB
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* AI Thumbnail Generation in Advanced Tab */}
                      {scriptData && (
                        <div className="space-y-4 p-4 border border-blue-200 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-blue-600" />
                            <h4 className="font-medium text-blue-900">AI Thumbnail Generation</h4>
                          </div>
                          <p className="text-sm text-blue-700">
                            Generate eye-catching thumbnails using DALL-E based on your video content
                          </p>
                          
                          <div className="flex items-center gap-4">
                            <div className="space-y-2 flex-1">
                              <Label htmlFor="thumbnail-dimensions-advanced">Thumbnail Dimensions</Label>
                              <Select value={thumbnailDimensions} onValueChange={setThumbnailDimensions}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1280x720">1280x720 (16:9 - Recommended)</SelectItem>
                                  <SelectItem value="1920x1080">1920x1080 (16:9 - HD)</SelectItem>
                                  <SelectItem value="1080x1080">1080x1080 (1:1 - Square)</SelectItem>
                                  <SelectItem value="1080x1350">1080x1350 (4:5 - Portrait)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button 
                              onClick={generateThumbnails}
                              disabled={isGeneratingThumbnails || !title.trim() || !isConnected}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {isGeneratingThumbnails ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  Generate (3 credits)
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Thumbnail Error */}
                          {thumbnailError && (
                            <Alert className="border-red-200 bg-red-50">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-800">
                                {thumbnailError}
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Generated Thumbnails */}
                          {generatedThumbnails.length > 0 && (
                            <div className="space-y-3">
                              <h5 className="font-medium text-gray-900">Generated Thumbnails</h5>
                              <div className="grid grid-cols-1 gap-4">
                                {generatedThumbnails.map((thumbnail, index) => (
                                  <div 
                                    key={index}
                                    className={`relative rounded-lg border-2 transition-all ${
                                      selectedThumbnail?.url === thumbnail.url 
                                        ? 'border-blue-500 ring-2 ring-blue-200' 
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                                      <img 
                                        src={thumbnail.url} 
                                        alt={thumbnail.concept}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="p-3 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <h6 className="font-medium text-sm text-gray-900">{thumbnail.concept}</h6>
                                        {selectedThumbnail?.url === thumbnail.url && (
                                          <CheckCircle className="h-4 w-4 text-blue-600" />
                                        )}
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant={selectedThumbnail?.url === thumbnail.url ? "default" : "outline"}
                                          onClick={() => selectThumbnail(thumbnail)}
                                          className="flex-1"
                                        >
                                          {selectedThumbnail?.url === thumbnail.url ? "Selected" : "Select"}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = thumbnail.url;
                                            link.download = `thumbnail-${thumbnail.concept.toLowerCase().replace(/\s+/g, '-')}.png`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                          }}
                                        >
                                          <Download className="h-3 w-3 mr-1" />
                                          Download
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {selectedThumbnail && (
                                <Alert className="border-blue-200 bg-blue-50">
                                  <CheckCircle className="h-4 w-4 text-blue-600" />
                                  <AlertDescription className="text-blue-800">
                                    Selected thumbnail: <strong>{selectedThumbnail.concept}</strong>
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="seo" className="space-y-6">
                  {/* SEO Suggestions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        SEO Optimization
                      </CardTitle>
                      <CardDescription>
                        Improve your video's discoverability with SEO suggestions
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button 
                        onClick={generateSEOSuggestions}
                        variant="outline"
                        disabled={!title.trim() || !isConnected}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Generate SEO Suggestions
                      </Button>

                      {showSEOSuggestions && (
                        <div className="space-y-4">
                          {titleSuggestions.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-medium text-gray-900">Title Suggestions</h4>
                              <div className="space-y-1">
                                {titleSuggestions.map((suggestion, index) => (
                                  <button
                                    key={index}
                                    onClick={() => setTitle(suggestion)}
                                    className="block w-full text-left p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border"
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {tagSuggestions.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-medium text-gray-900">Tag Suggestions</h4>
                              <div className="flex flex-wrap gap-2">
                                {tagSuggestions.map((tag, index) => (
                                  <button
                                    key={index}
                                    onClick={() => {
                                      const currentTags = tags.split(',').map(t => t.trim()).filter(t => t);
                                      if (!currentTags.includes(tag)) {
                                        setTags(currentTags.length > 0 ? `${tags}, ${tag}` : tag);
                                      }
                                    }}
                                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full border"
                                  >
                                    + {tag}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Upload Button */}
              <Card className="mt-6">
                <CardContent className="pt-6">
                  {isConnected && videoData ? (
                    <>
                      <Button
                        onClick={uploadToYouTube}
                        disabled={!title.trim() || isUploading}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-3"
                        size="lg"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Uploading to YouTube...
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 mr-2" />
                            Upload to YouTube
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Make sure all required fields are filled before uploading
                      </p>
                    </>
                  ) : !isConnected ? (
                    <div className="text-center space-y-4">
                      <div className="flex items-center justify-center gap-2 text-orange-600">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-medium">YouTube Connection Required</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Please connect your YouTube account using the "Connect YouTube Account" button above to enable video uploads.
                      </p>
                    </div>
                  ) : !videoData ? (
                    <div className="text-center space-y-4">
                      <div className="flex items-center justify-center gap-2 text-blue-600">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-medium">No Video Selected</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Please select a video to upload. You can generate a video from the script page or provide a video URL parameter.
                      </p>
                      <Link href="/dashboard/script">
                        <Button variant="outline">
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Go to Script Generation
                        </Button>
                      </Link>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}

export default function YouTubeUploadPage() {
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
      <YouTubeUploadContent />
    </Suspense>
  );
}
