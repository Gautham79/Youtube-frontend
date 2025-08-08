import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { imageUrl, filename } = body;

    // Validate input
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Convert relative URL to absolute URL if needed
    let fullImageUrl = imageUrl;
    if (imageUrl.startsWith('/')) {
      // Get the base URL from the request
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const host = request.headers.get('host') || 'localhost:3000';
      fullImageUrl = `${protocol}://${host}${imageUrl}`;
      
      console.log('🔄 Converting relative URL to absolute:', {
        originalUrl: imageUrl,
        fullUrl: fullImageUrl,
        protocol,
        host
      });
    }

    // Fetch the image from the URL
    console.log('📥 Fetching image from URL:', fullImageUrl);
    const imageResponse = await fetch(fullImageUrl);
    
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/png';

    // Return the image as a blob
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename || 'image.png'}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Image download error:', error);
    
    return NextResponse.json(
      { error: 'Failed to download image. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/images/download',
    method: 'POST',
    description: 'Download images by proxying through the server to handle CORS',
    parameters: {
      imageUrl: 'Required: URL of the image to download',
      filename: 'Optional: Filename for the downloaded image'
    }
  });
}
