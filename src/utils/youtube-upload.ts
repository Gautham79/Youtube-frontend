import { YouTubeMetadata } from './openai/types';

// YouTube API configuration
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos';

export interface YouTubeUploadParams {
  videoFile: File | Blob;
  metadata: any; // Allow flexible metadata structure
  accessToken: string;
  thumbnailFile?: File | null;
  onProgress?: (progress: number) => void;
}

export interface YouTubeUploadResponse {
  id: string;
  snippet: {
    title: string;
    description: string;
    categoryId: string;
    tags: string[];
  };
  status: {
    privacyStatus: string;
    uploadStatus: string;
  };
  thumbnailUploaded?: boolean;
}

/**
 * Upload a video to YouTube with metadata
 */
export async function uploadVideoToYouTube(params: YouTubeUploadParams): Promise<YouTubeUploadResponse> {
  const { videoFile, metadata, accessToken, onProgress } = params;

  // Validate access token
  if (!accessToken) {
    throw new Error('YouTube access token is required');
  }

  // Handle both direct metadata and nested snippet structure
  const snippet = metadata.snippet || metadata;
  const status = metadata.status || metadata;

  // Prepare video metadata
  const videoMetadata = {
    snippet: {
      title: snippet.title,
      description: snippet.description,
      tags: snippet.tags || [],
      categoryId: (snippet.categoryId || '22').toString(), // Default to "People & Blogs" if not provided
    },
    status: {
      privacyStatus: status.privacyStatus || 'private',
      selfDeclaredMadeForKids: status.selfDeclaredMadeForKids || false,
    },
  };

  // Create form data for multipart upload
  const formData = new FormData();
  formData.append('metadata', JSON.stringify(videoMetadata));
  formData.append('video', videoFile);

  try {
    const response = await fetch(`${YOUTUBE_UPLOAD_URL}?uploadType=multipart&part=snippet,status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`YouTube upload failed: ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('YouTube upload error:', error);
    throw error;
  }
}

/**
 * Upload video with resumable upload for large files
 */
export async function uploadVideoToYouTubeResumable(params: YouTubeUploadParams): Promise<YouTubeUploadResponse> {
  const { videoFile, metadata, accessToken, thumbnailFile, onProgress } = params;

  // Step 1: Initiate resumable upload
  const uploadUrl = await initiateResumableUpload(metadata, accessToken);

  // Step 2: Upload video file in chunks
  const result = await uploadVideoInChunks(videoFile, uploadUrl, onProgress);

  // Step 3: Upload thumbnail if provided
  let thumbnailUploaded = false;
  if (thumbnailFile && result.id) {
    try {
      console.log('🖼️ Attempting thumbnail upload for video:', result.id);
      await uploadThumbnailToYouTube(result.id, thumbnailFile, accessToken);
      thumbnailUploaded = true;
      console.log('✅ Thumbnail upload completed successfully');
    } catch (error) {
      console.error('❌ Thumbnail upload failed:', error);
      // Don't fail the entire upload if thumbnail fails - this is intentional
      // The video upload should still succeed even if thumbnail fails
    }
  } else {
    console.log('ℹ️ No thumbnail file provided or video ID missing');
  }

  return {
    ...result,
    thumbnailUploaded,
  };
}

async function initiateResumableUpload(metadata: any, accessToken: string): Promise<string> {
  // Handle both direct metadata and nested snippet structure
  const snippet = metadata.snippet || metadata;
  const status = metadata.status || metadata;
  
  const videoMetadata = {
    snippet: {
      title: snippet.title,
      description: snippet.description,
      tags: snippet.tags || [],
      categoryId: (snippet.categoryId || '22').toString(), // Default to "People & Blogs" if not provided
    },
    status: {
      privacyStatus: status.privacyStatus || 'private',
      selfDeclaredMadeForKids: status.selfDeclaredMadeForKids || false,
    },
  };

  const response = await fetch(`${YOUTUBE_UPLOAD_URL}?uploadType=resumable&part=snippet,status`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Type': 'video/*',
    },
    body: JSON.stringify(videoMetadata),
  });

  if (!response.ok) {
    throw new Error(`Failed to initiate upload: ${response.statusText}`);
  }

  const uploadUrl = response.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('No upload URL returned from YouTube');
  }

  return uploadUrl;
}

async function uploadVideoInChunks(
  videoFile: File | Blob,
  uploadUrl: string,
  onProgress?: (progress: number) => void
): Promise<YouTubeUploadResponse> {
  const chunkSize = 256 * 1024; // 256KB chunks
  const totalSize = videoFile.size;
  let uploadedBytes = 0;

  while (uploadedBytes < totalSize) {
    const chunk = videoFile.slice(uploadedBytes, uploadedBytes + chunkSize);
    const isLastChunk = uploadedBytes + chunkSize >= totalSize;
    const endByte = isLastChunk ? totalSize - 1 : uploadedBytes + chunkSize - 1;

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes ${uploadedBytes}-${endByte}/${totalSize}`,
        'Content-Type': 'video/*',
      },
      body: chunk,
    });

    if (response.status === 308) {
      // Continue uploading
      uploadedBytes += chunkSize;
      if (onProgress) {
        onProgress((uploadedBytes / totalSize) * 100);
      }
    } else if (response.status === 200 || response.status === 201) {
      // Upload complete
      if (onProgress) {
        onProgress(100);
      }
      return await response.json();
    } else {
      throw new Error(`Upload failed with status: ${response.status}`);
    }
  }

  throw new Error('Upload completed but no response received');
}

/**
 * Upload thumbnail to YouTube video
 */
async function uploadThumbnailToYouTube(
  videoId: string,
  thumbnailFile: File,
  accessToken: string
): Promise<void> {
  console.log('🖼️ Starting thumbnail upload for video:', videoId);
  console.log('📁 Thumbnail file details:', {
    name: thumbnailFile.name,
    type: thumbnailFile.type,
    size: thumbnailFile.size
  });

  // Validate file size (YouTube limit is 2MB)
  if (thumbnailFile.size > 2 * 1024 * 1024) {
    throw new Error('Thumbnail file size must be less than 2MB');
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
  if (!validTypes.includes(thumbnailFile.type.toLowerCase())) {
    throw new Error(`Invalid thumbnail format. Supported formats: ${validTypes.join(', ')}`);
  }

  try {
    // Convert File to ArrayBuffer for raw binary data
    const imageBuffer = await thumbnailFile.arrayBuffer();
    console.log('📁 File content length:', imageBuffer.byteLength);
    
    // Use the upload endpoint for thumbnails
    const uploadUrl = `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`;
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': thumbnailFile.type,
      },
      body: imageBuffer, // Send raw binary data
    });

    console.log('📤 Thumbnail upload response status:', response.status);
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error('❌ Thumbnail upload failed:', {
        status: response.status,
        statusText: response.statusText,
        response: responseText
      });
      
      let errorMessage = response.statusText;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        // Response is not JSON, use the text as error
        errorMessage = responseText || errorMessage;
      }
      
      throw new Error(`Thumbnail upload failed: ${errorMessage}`);
    }

    const result = await response.json();
    console.log('✅ Thumbnail uploaded successfully:', result);
    
  } catch (error) {
    console.error('💥 Thumbnail upload error:', error);
    throw error;
  }
}

/**
 * Get YouTube OAuth2 authorization URL
 */
export function getYouTubeAuthUrl(clientId: string, redirectUri: string, state?: string): string {
  const scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
  });

  if (state) {
    params.append('state', state);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Token exchange failed: ${errorData.error_description || response.statusText}`);
  }

  return await response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{
  access_token: string;
  expires_in: number;
  token_type: string;
}> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Token refresh failed: ${errorData.error_description || response.statusText}`);
  }

  return await response.json();
}

/**
 * Validate YouTube access token
 */
export async function validateYouTubeToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${YOUTUBE_API_BASE_URL}/channels?part=snippet&mine=true`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

/**
 * Get user's YouTube channel information
 */
export async function getYouTubeChannelInfo(accessToken: string): Promise<{
  id: string;
  title: string;
  description: string;
  thumbnails: any;
}> {
  const response = await fetch(`${YOUTUBE_API_BASE_URL}/channels?part=snippet&mine=true`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get channel info: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.items || data.items.length === 0) {
    throw new Error('No YouTube channel found for this account');
  }

  const channel = data.items[0];
  return {
    id: channel.id,
    title: channel.snippet.title,
    description: channel.snippet.description,
    thumbnails: channel.snippet.thumbnails,
  };
}

/**
 * Get all YouTube channels associated with the user's account
 * This includes both personal channels (mine=true) and brand channels (managedByMe=true)
 */
export async function getUserYouTubeChannels(accessToken: string): Promise<Array<{
  id: string;
  title: string;
  description: string;
  thumbnails: any;
  customUrl?: string;
  snippet: any; // Include full snippet for compatibility
}>> {
  console.log('🔍 Fetching all YouTube channels for user...');
  
  try {
    // Fetch both personal channels and managed brand channels
    const [ownChannelsResponse, managedChannelsResponse] = await Promise.all([
      // Personal channels (mine=true)
      fetch(`${YOUTUBE_API_BASE_URL}/channels?part=snippet&mine=true&maxResults=50`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }),
      // Brand channels and channels managed by the user (managedByMe=true)
      fetch(`${YOUTUBE_API_BASE_URL}/channels?part=snippet&managedByMe=true&maxResults=50`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })
    ]);

    console.log('📊 API Response Status:', {
      ownChannels: ownChannelsResponse.status,
      managedChannels: managedChannelsResponse.status
    });

    if (!ownChannelsResponse.ok) {
      throw new Error(`Failed to get personal channels: ${ownChannelsResponse.statusText}`);
    }

    const ownChannelsData = await ownChannelsResponse.json();
    console.log('👤 Personal channels found:', ownChannelsData.items?.length || 0);

    // Initialize channels array with personal channels
    const allChannels = new Map(); // Use Map to avoid duplicates
    
    // Add personal channels
    if (ownChannelsData.items && ownChannelsData.items.length > 0) {
      ownChannelsData.items.forEach((channel: any) => {
        allChannels.set(channel.id, {
          id: channel.id,
          title: channel.snippet?.title || 'Unnamed Channel',
          description: channel.snippet?.description || '',
          thumbnails: channel.snippet?.thumbnails || {},
          customUrl: channel.snippet?.customUrl,
          snippet: channel.snippet, // Include full snippet for compatibility
        });
      });
    }

    // Add managed channels (brand channels) if the API call succeeded
    if (managedChannelsResponse.ok) {
      const managedChannelsData = await managedChannelsResponse.json();
      console.log('🏢 Brand/managed channels found:', managedChannelsData.items?.length || 0);
      
      if (managedChannelsData.items && managedChannelsData.items.length > 0) {
        managedChannelsData.items.forEach((channel: any) => {
          // Only add if not already present (avoid duplicates)
          if (!allChannels.has(channel.id)) {
            allChannels.set(channel.id, {
              id: channel.id,
              title: channel.snippet?.title || 'Unnamed Channel',
              description: channel.snippet?.description || '',
              thumbnails: channel.snippet?.thumbnails || {},
              customUrl: channel.snippet?.customUrl,
              snippet: channel.snippet, // Include full snippet for compatibility
            });
          }
        });
      }
    } else {
      console.warn('⚠️ Failed to fetch managed channels:', managedChannelsResponse.statusText);
      // Don't throw error here - some accounts might not have managed channels
    }

    const channelsArray = Array.from(allChannels.values());
    console.log('✅ Total unique channels found:', channelsArray.length);
    
    // Log channel details for debugging
    channelsArray.forEach((channel, index) => {
      console.log(`📺 Channel ${index + 1}:`, {
        id: channel.id,
        title: channel.title,
        customUrl: channel.customUrl || 'No custom URL'
      });
    });

    if (channelsArray.length === 0) {
      throw new Error('No YouTube channels found for this account');
    }

    return channelsArray;

  } catch (error) {
    console.error('❌ Error fetching YouTube channels:', error);
    throw error;
  }
}
