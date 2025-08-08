import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
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

    // Get YouTube tokens from database before deleting
    const { data: tokenData, error: tokenError } = await supabase
      .from('youtube_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', user.id)
      .single();

    if (tokenError && tokenError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching tokens for revocation:', tokenError);
      // Continue with deletion even if we can't fetch tokens
    }

    // Revoke tokens with Google if we have them
    if (tokenData?.access_token) {
      try {
        // Revoke the access token
        const revokeResponse = await fetch(
          `https://oauth2.googleapis.com/revoke?token=${tokenData.access_token}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        if (!revokeResponse.ok) {
          console.warn('Failed to revoke access token with Google:', revokeResponse.status);
        }
      } catch (revokeError) {
        console.warn('Error revoking token with Google:', revokeError);
        // Continue with local deletion even if revocation fails
      }
    }

    // Delete YouTube tokens from database
    const { error: deleteError } = await supabase
      .from('youtube_tokens')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting YouTube tokens:', deleteError);
      return NextResponse.json(
        { error: 'Failed to disconnect YouTube account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'YouTube account disconnected successfully',
    });

  } catch (error) {
    console.error('YouTube disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect YouTube account' },
      { status: 500 }
    );
  }
}
