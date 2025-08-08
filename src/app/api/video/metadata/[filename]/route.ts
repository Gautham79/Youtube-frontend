import { NextRequest, NextResponse } from 'next/server';
import { getVideoMetadata, formatVideoMetadata } from '@/utils/video-metadata';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Extracting metadata for video: ${filename}`);

    // Extract video metadata using ffprobe
    const metadata = await getVideoMetadata(filename);
    
    // Format metadata for display
    const formattedMetadata = formatVideoMetadata(metadata);

    console.log(`✅ Successfully extracted metadata for ${filename}:`, {
      dimensions: `${metadata.width}x${metadata.height}`,
      orientation: metadata.orientation,
      duration: formattedMetadata.duration,
      size: formattedMetadata.size
    });

    return NextResponse.json({
      success: true,
      metadata: {
        // Raw metadata
        raw: metadata,
        // Formatted for display
        formatted: formattedMetadata,
        // Key properties for easy access
        width: metadata.width,
        height: metadata.height,
        orientation: metadata.orientation,
        duration: metadata.duration,
        aspectRatio: metadata.aspectRatio,
        size: metadata.size,
        frameRate: metadata.frameRate,
        codec: metadata.codec,
        format: metadata.format,
        bitrate: metadata.bitrate
      }
    });

  } catch (error) {
    console.error('❌ Error extracting video metadata:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract video metadata',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
