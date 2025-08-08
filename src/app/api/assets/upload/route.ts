import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sceneId = formData.get('sceneId') as string;
    const assetType = formData.get('assetType') as string; // 'image' or 'audio'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!sceneId || !assetType) {
      return NextResponse.json({ error: 'Scene ID and asset type are required' }, { status: 400 });
    }

    // Validate file type
    if (assetType === 'image' && !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid image file type' }, { status: 400 });
    }

    if (assetType === 'audio' && !file.type.startsWith('audio/')) {
      return NextResponse.json({ error: 'Invalid audio file type' }, { status: 400 });
    }

    // Create storage directory
    const storageDir = path.join(process.cwd(), 'public', 'uploaded-assets', user.id);
    await mkdir(storageDir, { recursive: true });

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || (assetType === 'image' ? 'png' : 'mp3');
    const filename = `${assetType}_scene_${sceneId}_${uuidv4()}.${fileExtension}`;
    const filePath = path.join(storageDir, filename);

    // Save file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);

    // Return public URL
    const publicUrl = `/uploaded-assets/${user.id}/${filename}`;

    console.log('✅ Asset uploaded successfully:', {
      sceneId,
      assetType,
      filename,
      size: buffer.length,
      publicUrl
    });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      size: buffer.length,
      type: assetType
    });

  } catch (error) {
    console.error('Asset upload error:', error);
    return NextResponse.json({
      error: 'Failed to upload asset',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
