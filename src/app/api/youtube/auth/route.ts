import { NextRequest, NextResponse } from 'next/server';
import { getYouTubeAuthUrl } from '@/utils/youtube-upload';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: 'YouTube OAuth not configured' },
        { status: 500 }
      );
    }

    // Get the referer URL to preserve context
    const referer = request.headers.get('referer');
    let state = undefined;
    
    if (referer && referer.includes('/dashboard/youtube-upload')) {
      // Include the original URL in state to preserve video data
      state = JSON.stringify({
        originalUrl: referer
      });
    }

    // Generate YouTube auth URL with state parameter
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube'
    ].join(' ');

    let authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent`;

    if (state) {
      authUrl += `&state=${encodeURIComponent(state)}`;
    }

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('YouTube auth URL generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
