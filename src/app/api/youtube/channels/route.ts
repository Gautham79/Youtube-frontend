import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserYouTubeChannels } from '@/utils/youtube-upload';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Get YouTube tokens from database
    const { data: tokenData, error: tokenError } = await supabase
      .from('youtube_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'YouTube account not connected' },
        { status: 404 }
      );
    }

    // Check if token is expired and refresh if needed
    let accessToken = tokenData.access_token;
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now >= expiresAt) {
      // Token is expired, need to refresh
      const { refreshAccessToken } = await import('@/utils/youtube-upload');
      
      try {
        const refreshedTokens = await refreshAccessToken(
          tokenData.refresh_token,
          process.env.YOUTUBE_CLIENT_ID!,
          process.env.YOUTUBE_CLIENT_SECRET!
        );

        accessToken = refreshedTokens.access_token;
        
        // Update the database with new tokens
        const newExpiresAt = new Date(now.getTime() + refreshedTokens.expires_in * 1000);
        
        await supabase
          .from('youtube_tokens')
          .update({
            access_token: accessToken,
            expires_at: newExpiresAt.toISOString(),
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

    // Fetch user's YouTube channels
    const channels = await getUserYouTubeChannels(accessToken);

    return NextResponse.json({
      success: true,
      channels: channels,
    });

  } catch (error) {
    console.error('YouTube channels fetch error:', error);
    
    // Handle specific YouTube API errors
    if (error instanceof Error) {
      if (error.message.includes('Failed to get channels')) {
        return NextResponse.json(
          { error: 'Failed to fetch YouTube channels. Please check your connection.' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('No YouTube channels found')) {
        return NextResponse.json(
          { error: 'No YouTube channels found for this account.' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch YouTube channels' },
      { status: 500 }
    );
  }
}
