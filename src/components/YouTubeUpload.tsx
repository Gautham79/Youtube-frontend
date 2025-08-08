'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, Youtube, CheckCircle, AlertCircle, ExternalLink, Users, Unlink } from 'lucide-react';

interface YouTubeUploadProps {
  videoFile?: File;
  videoUrl?: string;
  defaultTitle?: string;
  defaultDescription?: string;
  isConnected: boolean;
  onConnectYouTube: () => void;
  onDisconnectYouTube?: () => void;
}

interface UploadResult {
  success: boolean;
  videoId?: string;
  title?: string;
  uploadStatus?: string;
  privacyStatus?: string;
  error?: string;
}

interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnails: any;
  customUrl?: string;
}

export default function YouTubeUpload({ 
  videoFile, 
  videoUrl,
  defaultTitle = '', 
  defaultDescription = '',
  isConnected,
  onConnectYouTube,
  onDisconnectYouTube
}: YouTubeUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(videoFile || null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  
  // Channel selection state
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [channelsError, setChannelsError] = useState<string>('');
  
  // Disconnect state
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectResult, setDisconnectResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  
  // Form state
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('22'); // People & Blogs
  const [privacy, setPrivacy] = useState('private');
  const [madeForKids, setMadeForKids] = useState('false');


  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Fetch user's YouTube channels
  const fetchChannels = async () => {
    setIsLoadingChannels(true);
    setChannelsError('');
    
    try {
      const response = await fetch('/api/youtube/channels');
      const result = await response.json();
      
      if (response.ok && result.success) {
        setChannels(result.channels);
        // Auto-select the first channel if none selected
        if (result.channels.length > 0 && !selectedChannelId) {
          setSelectedChannelId(result.channels[0].id);
        }
      } else {
        setChannelsError(result.error || 'Failed to fetch channels');
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
      setChannelsError('Network error occurred while fetching channels');
    } finally {
      setIsLoadingChannels(false);
    }
  };

  // Disconnect from YouTube
  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setDisconnectResult(null);
    
    try {
      const response = await fetch('/api/youtube/disconnect', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setDisconnectResult({
          success: true,
          message: result.message || 'YouTube account disconnected successfully',
        });
        
        // Reset state
        setChannels([]);
        setSelectedChannelId('');
        setChannelsError('');
        
        // Call parent callback if provided
        if (onDisconnectYouTube) {
          onDisconnectYouTube();
        }
      } else {
        setDisconnectResult({
          success: false,
          error: result.error || 'Failed to disconnect YouTube account',
        });
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      setDisconnectResult({
        success: false,
        error: 'Network error occurred while disconnecting',
      });
    } finally {
      setIsDisconnecting(false);
      setShowDisconnectConfirm(false);
    }
  };

  // Fetch channels when connected
  useEffect(() => {
    if (isConnected && channels.length === 0) {
      fetchChannels();
    }
  }, [isConnected]);

  const uploadToYouTube = async () => {
    if (!selectedFile) {
      alert('Please select a video file');
      return;
    }

    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('video', selectedFile);
      
      const metadata = {
        snippet: {
          title: title.trim(),
          description: description.trim(),
          tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
          categoryId: category,
          channelId: selectedChannelId, // Include selected channel
        },
        status: {
          privacyStatus: privacy,
          selfDeclaredMadeForKids: madeForKids === 'true',
        },
      };
      
      formData.append('metadata', JSON.stringify(metadata));

      const response = await fetch('/api/youtube/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
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
      setUploadResult({
        success: false,
        error: 'Network error occurred',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Convert video URL to File object
  const convertUrlToFile = async (url: string, filename: string): Promise<File> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  };

  // Load video from URL if provided
  React.useEffect(() => {
    if (videoUrl && !selectedFile) {
      setIsLoadingVideo(true);
      const filename = `video_${Date.now()}.mp4`;
      convertUrlToFile(videoUrl, filename)
        .then(file => {
          setSelectedFile(file);
        })
        .catch(error => {
          console.error('Failed to load video from URL:', error);
        })
        .finally(() => {
          setIsLoadingVideo(false);
        });
    }
  }, [videoUrl, selectedFile]);


  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-6 w-6 text-red-600" />
          Upload to YouTube
        </CardTitle>
        <CardDescription>
          Upload your generated video directly to your YouTube channel
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!isConnected ? (
          <div className="text-center space-y-4">
            <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg">
              <Youtube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Connect Your YouTube Account
              </h3>
              <p className="text-gray-600 mb-4">
                Connect your YouTube account to upload videos directly from this platform
              </p>
              <Button onClick={onConnectYouTube} className="bg-red-600 hover:bg-red-700">
                <Youtube className="h-4 w-4 mr-2" />
                Connect YouTube
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">YouTube account connected</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDisconnectConfirm(true)}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>

            {/* Disconnect Confirmation Dialog */}
            {showDisconnectConfirm && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  <div className="space-y-3">
                    <p className="text-yellow-800 font-medium">
                      Are you sure you want to disconnect your YouTube account?
                    </p>
                    <p className="text-yellow-700 text-sm">
                      This will remove your YouTube connection and you'll need to reconnect to upload videos.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowDisconnectConfirm(false)}
                        disabled={isDisconnecting}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleDisconnect}
                        disabled={isDisconnecting}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isDisconnecting ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                            Disconnecting...
                          </>
                        ) : (
                          <>
                            <Unlink className="h-3 w-3 mr-2" />
                            Disconnect
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Disconnect Result */}
            {disconnectResult && (
              <Alert className={disconnectResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                {disconnectResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  {disconnectResult.success ? (
                    <p className="text-green-800">{disconnectResult.message}</p>
                  ) : (
                    <p className="text-red-800">{disconnectResult.error}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Channel Selection */}
            <div className="space-y-2">
              <Label htmlFor="channel-select" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Select Channel
              </Label>
              {isLoadingChannels ? (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
                  <span className="text-sm text-gray-600">Loading channels...</span>
                </div>
              ) : channelsError ? (
                <div className="space-y-2">
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {channelsError}
                    </AlertDescription>
                  </Alert>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchChannels}
                    className="w-full"
                  >
                    Retry Loading Channels
                  </Button>
                </div>
              ) : channels.length > 0 ? (
                <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{channel.title}</span>
                          {channel.customUrl && (
                            <span className="text-xs text-gray-500">
                              ({channel.customUrl})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    No YouTube channels found for this account.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* File Selection */}
            <div className="space-y-2">
              <Label htmlFor="video-file">Video File</Label>
              {selectedFile ? (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">{selectedFile.name}</span>
                  <Badge variant="secondary">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </Badge>
                </div>
              ) : (
                <Input
                  id="video-file"
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                />
              )}
            </div>

            {/* Video Metadata */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter video title"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500">{title.length}/100 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  placeholder="Enter video description"
                  rows={4}
                  maxLength={5000}
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
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
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
                  <Select value={privacy} onValueChange={setPrivacy}>
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

              <div className="space-y-2">
                <Label htmlFor="made-for-kids">Made for Kids</Label>
                <Select value={madeForKids} onValueChange={setMadeForKids}>
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

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading to YouTube...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
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

            {/* Upload Button */}
            <Button
              onClick={uploadToYouTube}
              disabled={!selectedFile || !title.trim() || isUploading}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload to YouTube
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
