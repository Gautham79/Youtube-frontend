import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { refreshAccessToken } from '@/utils/youtube-upload';

export async function GET(request: NextRequest) {
  try {
    // Get user from Supabase
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log('YouTube status: No user found');
      return NextResponse.json({ connected: false, reason: 'no_user' });
    }

    // Check if user has YouTube tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('youtube_tokens')
      .select('id, expires_at, access_token, refresh_token')
      .eq('user_id', user.id)
      .single();

    if (tokenError) {
      console.log('YouTube status: Token error:', tokenError);
      return NextResponse.json({ connected: false, reason: 'no_tokens' });
    }

    if (!tokenData) {
      console.log('YouTube status: No token data found');
      return NextResponse.json({ connected: false, reason: 'no_token_data' });
    }

    // Check if token is still valid (not expired)
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    
    const isValid = now < expiresAt;

    console.log('YouTube status check:', {
      userId: user.id,
      hasTokens: !!tokenData,
      expiresAt: tokenData.expires_at,
      isValid,
      timeUntilExpiry: Math.floor((expiresAt.getTime() - now.getTime()) / 1000 / 60) + ' minutes'
    });

    // If token is expired, try to refresh it
    if (!isValid && tokenData.refresh_token) {
      console.log('YouTube token expired, attempting refresh...');
      
      try {
        const clientId = process.env.YOUTUBE_CLIENT_ID;
        const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          console.error('YouTube client credentials not configured');
          return NextResponse.json({ 
            connected: false, 
            reason: 'config_missing',
            expiresAt: tokenData.expires_at 
          });
        }

        // Refresh the access token
        const refreshedTokens = await refreshAccessToken(
          tokenData.refresh_token,
          clientId,
          clientSecret
        );

        // Calculate new expiration time
        const newExpiresAt = new Date(Date.now() + (refreshedTokens.expires_in * 1000)).toISOString();

        console.log('YouTube token refresh successful:', {
          userId: user.id,
          newExpiresAt,
          expiresInSeconds: refreshedTokens.expires_in
        });

        // Update tokens in database
        const { error: updateError } = await supabase
          .from('youtube_tokens')
          .update({
            access_token: refreshedTokens.access_token,
            expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error updating refreshed tokens:', updateError);
          return NextResponse.json({ 
            connected: false, 
            reason: 'refresh_update_failed',
            expiresAt: tokenData.expires_at 
          });
        }

        // Return success with new expiration
        return NextResponse.json({ 
          connected: true,
          expiresAt: newExpiresAt,
          reason: 'refreshed'
        });

      } catch (refreshError) {
        console.error('YouTube token refresh failed:', refreshError);
        
        // If refresh fails, the refresh token might be expired too
        return NextResponse.json({ 
          connected: false, 
          reason: 'refresh_failed',
          expiresAt: tokenData.expires_at,
          error: refreshError instanceof Error ? refreshError.message : 'Token refresh failed'
        });
      }
    }

    return NextResponse.json({ 
      connected: isValid,
      expiresAt: tokenData.expires_at,
      reason: isValid ? 'valid' : 'expired'
    });
  } catch (error) {
    console.error('YouTube status check error:', error);
    return NextResponse.json({ 
      connected: false, 
      reason: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
