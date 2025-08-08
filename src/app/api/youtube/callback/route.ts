import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/utils/youtube-upload';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard?youtube_error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard?youtube_error=no_code', request.url)
      );
    }

    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(
        new URL('/dashboard?youtube_error=config_missing', request.url)
      );
    }

    // Exchange code for tokens
    const tokenData = await exchangeCodeForToken(code, clientId, clientSecret, redirectUri);

    // Get user from Supabase
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(
        new URL('/dashboard?youtube_error=auth_required', request.url)
      );
    }

    // Calculate expiration time with proper validation and logging
    const now = Date.now();
    const expiresInSeconds = tokenData.expires_in || 3600; // Default to 1 hour if not provided
    const expiresAtTimestamp = now + (expiresInSeconds * 1000);
    const expiresAtISO = new Date(expiresAtTimestamp).toISOString();

    // Enhanced logging for debugging
    console.log('YouTube token exchange successful:', {
      userId: user.id,
      expiresInSeconds,
      currentTime: new Date(now).toISOString(),
      expiresAt: expiresAtISO,
      timeUntilExpiry: Math.floor(expiresInSeconds / 60) + ' minutes'
    });

    // Validate that expiration is in the future
    if (expiresAtTimestamp <= now) {
      console.error('Invalid expiration time calculated:', {
        expiresInSeconds,
        expiresAtTimestamp,
        now,
        tokenData
      });
      // Force a valid expiration (1 hour from now)
      const fallbackExpiration = new Date(now + (60 * 60 * 1000)).toISOString();
      console.log('Using fallback expiration:', fallbackExpiration);
    }

    // Store tokens in database - use upsert with proper conflict resolution
    const { error: insertError } = await supabase
      .from('youtube_tokens')
      .upsert({
        user_id: user.id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAtTimestamp <= now ? new Date(now + (60 * 60 * 1000)).toISOString() : expiresAtISO,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (insertError) {
      console.error('Error storing YouTube tokens:', insertError);
      return NextResponse.redirect(
        new URL('/dashboard?youtube_error=storage_failed', request.url)
      );
    }

    // Check if there's upload context in the state parameter
    let redirectUrl = '/dashboard/youtube-upload?youtube_success=true';
    
    if (state) {
      try {
        const stateData = JSON.parse(state);
        if (stateData.uploadContext) {
          // Redirect back to upload page with context to resume upload
          redirectUrl = `/dashboard/youtube-upload?youtube_success=true&uploadContext=${encodeURIComponent(stateData.uploadContext)}`;
        } else if (stateData.originalUrl) {
          // Preserve original URL parameters
          const originalParams = new URLSearchParams(stateData.originalUrl.split('?')[1] || '');
          originalParams.set('youtube_success', 'true');
          redirectUrl = `/dashboard/youtube-upload?${originalParams.toString()}`;
        }
      } catch (error) {
        console.error('Error parsing state parameter:', error);
        // Fall back to dashboard redirect
      }
    }

    return NextResponse.redirect(
      new URL(redirectUrl, request.url)
    );
  } catch (error) {
    console.error('YouTube callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard?youtube_error=callback_failed', request.url)
    );
  }
}
