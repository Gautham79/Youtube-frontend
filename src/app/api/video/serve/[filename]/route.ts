import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename } = await params;
    
    // Validate filename to prevent directory traversal
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Check if filename has valid video extension
    const validExtensions = ['.mp4', '.webm', '.mov', '.avi'];
    const hasValidExtension = validExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    
    if (!hasValidExtension) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const videoPath = path.join(process.cwd(), 'public', 'generated-videos', filename);
    
    // Check if file exists
    try {
      const stats = await stat(videoPath);
      
      if (!stats.isFile()) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      // Read the file
      const fileBuffer = await readFile(videoPath);
      
      // Determine MIME type based on extension
      let mimeType = 'video/mp4';
      if (filename.toLowerCase().endsWith('.webm')) {
        mimeType = 'video/webm';
      } else if (filename.toLowerCase().endsWith('.mov')) {
        mimeType = 'video/quicktime';
      } else if (filename.toLowerCase().endsWith('.avi')) {
        mimeType = 'video/x-msvideo';
      }

      // Set appropriate headers for video streaming
      const headers = new Headers({
        'Content-Type': mimeType,
        'Content-Length': stats.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
        'Content-Disposition': `inline; filename="${filename}"`,
      });

      // Handle range requests for video streaming
      const range = request.headers.get('range');
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
        const chunksize = (end - start) + 1;
        
        const chunk = fileBuffer.slice(start, end + 1);
        
        headers.set('Content-Range', `bytes ${start}-${end}/${stats.size}`);
        headers.set('Content-Length', chunksize.toString());
        
        return new NextResponse(chunk, {
          status: 206,
          headers,
        });
      }

      return new NextResponse(fileBuffer, {
        status: 200,
        headers,
      });

    } catch (fileError) {
      console.error('File access error:', fileError);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

  } catch (error) {
    console.error('Video serving error:', error);
    return NextResponse.json({
      error: 'Failed to serve video',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Also handle HEAD requests for video metadata
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new NextResponse(null, { status: 401 });
    }

    const { filename } = await params;
    
    // Validate filename
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new NextResponse(null, { status: 400 });
    }

    const videoPath = path.join(process.cwd(), 'public', 'generated-videos', filename);
    
    try {
      const stats = await stat(videoPath);
      
      if (!stats.isFile()) {
        return new NextResponse(null, { status: 404 });
      }

      // Determine MIME type
      let mimeType = 'video/mp4';
      if (filename.toLowerCase().endsWith('.webm')) {
        mimeType = 'video/webm';
      } else if (filename.toLowerCase().endsWith('.mov')) {
        mimeType = 'video/quicktime';
      } else if (filename.toLowerCase().endsWith('.avi')) {
        mimeType = 'video/x-msvideo';
      }

      return new NextResponse(null, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': stats.size.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      });

    } catch (fileError) {
      return new NextResponse(null, { status: 404 });
    }

  } catch (error) {
    console.error('Video HEAD request error:', error);
    return new NextResponse(null, { status: 500 });
  }
}
