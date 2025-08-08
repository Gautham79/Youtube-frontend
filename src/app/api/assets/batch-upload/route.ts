import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

interface UploadedAsset {
  sceneId: string;
  type: 'image' | 'audio';
  url: string;
  filename: string;
  size: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const uploadedAssets: UploadedAsset[] = [];
    
    // Create user-specific storage directory
    const storageDir = path.join(process.cwd(), 'public', 'uploaded-assets', user.id);
    await mkdir(storageDir, { recursive: true });

    console.log('📦 [Batch Upload] Starting batch asset upload for user:', user.id);

    // Process all files in the form data
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const [type, sceneId] = key.split('_'); // Expected format: "image_1" or "audio_1"
        
        if (!type || !sceneId) {
          console.warn(`⚠️ [Batch Upload] Invalid key format: ${key}`);
          continue;
        }

        if (type !== 'image' && type !== 'audio') {
          console.warn(`⚠️ [Batch Upload] Invalid asset type: ${type}`);
          continue;
        }

        // Validate file type
        if (type === 'image' && !value.type.startsWith('image/')) {
          console.error(`❌ [Batch Upload] Invalid image file type for ${key}: ${value.type}`);
          continue;
        }

        if (type === 'audio' && !value.type.startsWith('audio/')) {
          console.error(`❌ [Batch Upload] Invalid audio file type for ${key}: ${value.type}`);
          continue;
        }

        try {
          // Generate unique filename
          const fileExtension = value.name.split('.').pop() || (type === 'image' ? 'png' : 'mp3');
          const filename = `${type}_scene_${sceneId}_${uuidv4()}.${fileExtension}`;
          const filePath = path.join(storageDir, filename);

          // Save file
          const arrayBuffer = await value.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          await writeFile(filePath, buffer);

          // Create public URL
          const publicUrl = `/uploaded-assets/${user.id}/${filename}`;

          uploadedAssets.push({
            sceneId,
            type: type as 'image' | 'audio',
            url: publicUrl,
            filename,
            size: buffer.length
          });

          console.log(`✅ [Batch Upload] Uploaded ${type} for scene ${sceneId}:`, {
            filename,
            size: buffer.length,
            url: publicUrl
          });

        } catch (fileError) {
          console.error(`❌ [Batch Upload] Failed to upload ${key}:`, fileError);
          return NextResponse.json({
            error: `Failed to upload ${key}`,
            details: fileError instanceof Error ? fileError.message : 'Unknown error'
          }, { status: 500 });
        }
      }
    }

    if (uploadedAssets.length === 0) {
      return NextResponse.json({
        error: 'No valid assets were uploaded',
        details: 'Please ensure files are properly formatted and named (e.g., image_1, audio_1)'
      }, { status: 400 });
    }

    console.log(`✅ [Batch Upload] Successfully uploaded ${uploadedAssets.length} assets`);

    return NextResponse.json({
      success: true,
      assets: uploadedAssets,
      totalUploaded: uploadedAssets.length,
      message: `Successfully uploaded ${uploadedAssets.length} assets`
    });

  } catch (error) {
    console.error('❌ [Batch Upload] Batch upload error:', error);
    return NextResponse.json({
      error: 'Failed to upload assets',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
