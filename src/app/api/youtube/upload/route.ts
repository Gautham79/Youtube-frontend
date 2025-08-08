import { NextRequest, NextResponse } from 'next/server';
import { uploadVideoToYouTubeResumable, refreshAccessToken, validateYouTubeToken } from '@/utils/youtube-upload';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const metadataStr = formData.get('metadata') as string;
    const thumbnailFile = formData.get('thumbnail') as File | null;

    if (!videoFile || !metadataStr) {
      return NextResponse.json(
        { error: 'Video file and metadata are required' },
        { status: 400 }
      );
    }

    let metadata;
    try {
      metadata = JSON.parse(metadataStr);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid metadata format' },
        { status: 400 }
      );
    }

    // Get user from Supabase
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get YouTube tokens from database
    const { data: tokenData, error: tokenError } = await supabase
      .from('youtube_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'YouTube account not connected' },
        { status: 401 }
      );
    }

    let accessToken = tokenData.access_token;

    // Check if token is expired and refresh if needed
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    
    if (now >= expiresAt) {
      try {
        const clientId = process.env.YOUTUBE_CLIENT_ID;
        const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          return NextResponse.json(
            { error: 'YouTube OAuth not configured' },
            { status: 500 }
          );
        }

        const refreshedTokens = await refreshAccessToken(
          tokenData.refresh_token,
          clientId,
          clientSecret
        );

        accessToken = refreshedTokens.access_token;

        // Update tokens in database
        await supabase
          .from('youtube_tokens')
          .update({
            access_token: accessToken,
            expires_at: new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return NextResponse.json(
          { error: 'Failed to refresh YouTube token. Please reconnect your account.' },
          { status: 401 }
        );
      }
    }

    // Validate token before upload
    const isValidToken = await validateYouTubeToken(accessToken);
    if (!isValidToken) {
      return NextResponse.json(
        { error: 'Invalid YouTube token. Please reconnect your account.' },
        { status: 401 }
      );
    }

    // Upload video to YouTube
    const uploadResult = await uploadVideoToYouTubeResumable({
      videoFile,
      metadata,
      accessToken,
      thumbnailFile,
      onProgress: (progress) => {
        // Progress updates could be sent via WebSocket or Server-Sent Events
        console.log(`Upload progress: ${progress}%`);
      },
    });

    return NextResponse.json({
      success: true,
      videoId: uploadResult.id,
      title: uploadResult.snippet.title,
      uploadStatus: uploadResult.status.uploadStatus,
      privacyStatus: uploadResult.status.privacyStatus,
      thumbnailUploaded: uploadResult.thumbnailUploaded || false,
    });
  } catch (error) {
    console.error('YouTube upload error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'YouTube API quota exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('upload failed')) {
        return NextResponse.json(
          { error: 'Video upload failed. Please check your file and try again.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to upload video to YouTube' },
      { status: 500 }
    );
  }
}
