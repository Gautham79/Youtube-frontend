// Utility functions for handling asset uploads in the frontend

export interface AssetUploadResult {
  sceneId: string;
  type: 'image' | 'audio';
  url: string;
  filename: string;
  size: number;
}

export interface SceneAssets {
  sceneId: string;
  imageBlob?: Blob;
  audioBlob?: Blob;
  imageUrl?: string;
  audioUrl?: string;
}

/**
 * Convert a blob URL to a File object
 */
export async function blobUrlToFile(blobUrl: string, filename: string): Promise<File> {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
}

/**
 * Convert a blob to a File object
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}

/**
 * Upload a single asset to the server
 */
export async function uploadSingleAsset(
  file: File,
  sceneId: string,
  assetType: 'image' | 'audio'
): Promise<AssetUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sceneId', sceneId);
  formData.append('assetType', assetType);

  const response = await fetch('/api/assets/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Upload failed');
  }

  const result = await response.json();
  return {
    sceneId,
    type: assetType,
    url: result.url,
    filename: result.filename,
    size: result.size,
  };
}

/**
 * Upload multiple assets in batch
 */
export async function uploadAssetsBatch(sceneAssets: SceneAssets[]): Promise<AssetUploadResult[]> {
  const formData = new FormData();
  
  console.log('📦 [Asset Upload] Starting batch upload for', sceneAssets.length, 'scenes');

  // Add all files to form data with proper naming convention
  for (const scene of sceneAssets) {
    if (scene.imageBlob) {
      const imageFile = blobToFile(scene.imageBlob, `image_${scene.sceneId}.png`);
      formData.append(`image_${scene.sceneId}`, imageFile);
      console.log(`📷 [Asset Upload] Added image for scene ${scene.sceneId}`);
    }

    if (scene.audioBlob) {
      const audioFile = blobToFile(scene.audioBlob, `audio_${scene.sceneId}.mp3`);
      formData.append(`audio_${scene.sceneId}`, audioFile);
      console.log(`🎵 [Asset Upload] Added audio for scene ${scene.sceneId}`);
    }
  }

  console.log('📤 [Asset Upload] Sending batch upload request...');

  const response = await fetch('/api/assets/batch-upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('❌ [Asset Upload] Batch upload failed:', error);
    throw new Error(error.details || error.error || 'Batch upload failed');
  }

  const result = await response.json();
  console.log('✅ [Asset Upload] Batch upload successful:', result.totalUploaded, 'assets uploaded');
  
  return result.assets;
}

/**
 * Upload assets for scenes and return updated scene data with server URLs
 */
export async function uploadScenesAssets(scenes: any[]): Promise<any[]> {
  console.log('🚀 [Asset Upload] Processing', scenes.length, 'scenes for asset upload');

  // Prepare scene assets for upload - handle both blob objects and blob URLs
  const sceneAssets: SceneAssets[] = [];
  
  for (const scene of scenes) {
    const sceneId = scene.id.toString();
    let imageBlob: Blob | undefined;
    let audioBlob: Blob | undefined;

    // Handle image assets
    if (scene.imageBlob) {
      imageBlob = scene.imageBlob;
      console.log(`📷 [Asset Upload] Scene ${sceneId}: Found image blob`);
    } else if (scene.imageUrl?.startsWith('blob:')) {
      try {
        console.log(`📷 [Asset Upload] Scene ${sceneId}: Converting blob URL to blob`);
        const response = await fetch(scene.imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch blob: ${response.status} ${response.statusText}`);
        }
        imageBlob = await response.blob();
        console.log(`✅ [Asset Upload] Scene ${sceneId}: Image blob URL converted successfully (${imageBlob.size} bytes)`);
      } catch (error) {
        console.error(`❌ [Asset Upload] Scene ${sceneId}: Failed to convert image blob URL:`, error);
      }
    } else if (scene.imageUrl?.startsWith('/')) {
      console.log(`✅ [Asset Upload] Scene ${sceneId}: Image already on server (${scene.imageUrl})`);
    } else if (scene.imageUrl) {
      console.warn(`⚠️ [Asset Upload] Scene ${sceneId}: Unknown image URL format: ${scene.imageUrl}`);
    }

    // Handle audio assets
    if (scene.audioBlob) {
      audioBlob = scene.audioBlob;
      console.log(`🎵 [Asset Upload] Scene ${sceneId}: Found audio blob`);
    } else if (scene.audioUrl?.startsWith('blob:')) {
      try {
        console.log(`🎵 [Asset Upload] Scene ${sceneId}: Converting blob URL to blob`);
        const response = await fetch(scene.audioUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch blob: ${response.status} ${response.statusText}`);
        }
        audioBlob = await response.blob();
        console.log(`✅ [Asset Upload] Scene ${sceneId}: Audio blob URL converted successfully (${audioBlob.size} bytes)`);
      } catch (error) {
        console.error(`❌ [Asset Upload] Scene ${sceneId}: Failed to convert audio blob URL:`, error);
      }
    } else if (scene.audioUrl?.startsWith('/')) {
      console.log(`✅ [Asset Upload] Scene ${sceneId}: Audio already on server (${scene.audioUrl})`);
    } else if (scene.audioUrl) {
      console.warn(`⚠️ [Asset Upload] Scene ${sceneId}: Unknown audio URL format: ${scene.audioUrl}`);
    }

    // Add to upload list if we have blobs to upload
    if (imageBlob || audioBlob) {
      sceneAssets.push({
        sceneId,
        imageBlob,
        audioBlob,
      });
    }
  }

  console.log(`📊 [Asset Upload] Found ${sceneAssets.length} scenes with assets to upload`);

  if (sceneAssets.length === 0) {
    console.warn('⚠️ [Asset Upload] No blob assets found to upload');
    return scenes;
  }

  // Upload assets using individual uploads for better error handling
  const uploadedAssets: AssetUploadResult[] = [];
  
  for (const sceneAsset of sceneAssets) {
    const sceneId = sceneAsset.sceneId;
    
    try {
      // Upload image if present
      if (sceneAsset.imageBlob) {
        console.log(`📤 [Asset Upload] Uploading image for scene ${sceneId}...`);
        const imageFile = blobToFile(sceneAsset.imageBlob, `image_scene_${sceneId}.png`);
        const imageResult = await uploadSingleAsset(imageFile, sceneId, 'image');
        uploadedAssets.push(imageResult);
        console.log(`✅ [Asset Upload] Image uploaded for scene ${sceneId}: ${imageResult.url}`);
      }

      // Upload audio if present
      if (sceneAsset.audioBlob) {
        console.log(`📤 [Asset Upload] Uploading audio for scene ${sceneId}...`);
        const audioFile = blobToFile(sceneAsset.audioBlob, `audio_scene_${sceneId}.mp3`);
        const audioResult = await uploadSingleAsset(audioFile, sceneId, 'audio');
        uploadedAssets.push(audioResult);
        console.log(`✅ [Asset Upload] Audio uploaded for scene ${sceneId}: ${audioResult.url}`);
      }
    } catch (error) {
      console.error(`❌ [Asset Upload] Failed to upload assets for scene ${sceneId}:`, error);
      throw new Error(`Failed to upload assets for scene ${sceneId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Create lookup maps for uploaded assets
  const imageUrlMap = new Map<string, string>();
  const audioUrlMap = new Map<string, string>();

  uploadedAssets.forEach(asset => {
    if (asset.type === 'image') {
      imageUrlMap.set(asset.sceneId, asset.url);
    } else if (asset.type === 'audio') {
      audioUrlMap.set(asset.sceneId, asset.url);
    }
  });

  // Update scenes with server URLs
  const updatedScenes = scenes.map(scene => {
    const sceneId = scene.id.toString();
    const uploadedImageUrl = imageUrlMap.get(sceneId);
    const uploadedAudioUrl = audioUrlMap.get(sceneId);

    // Use uploaded URLs if available, otherwise keep existing server URLs
    const finalImageUrl = uploadedImageUrl || 
                          (scene.imageUrl?.startsWith('/') ? scene.imageUrl : null);
    const finalAudioUrl = uploadedAudioUrl || 
                          (scene.audioUrl?.startsWith('/') ? scene.audioUrl : null);

    return {
      ...scene,
      imageUrl: finalImageUrl,
      audioUrl: finalAudioUrl,
    };
  });

  console.log('✅ [Asset Upload] Updated', updatedScenes.length, 'scenes with server URLs');
  console.log('📊 [Asset Upload] Upload summary:', {
    totalUploaded: uploadedAssets.length,
    imageUploads: uploadedAssets.filter(a => a.type === 'image').length,
    audioUploads: uploadedAssets.filter(a => a.type === 'audio').length,
  });
  
  return updatedScenes;
}

/**
 * Check if a scene has both image and audio assets (either as blobs or URLs)
 */
export function hasCompleteAssets(scene: any): boolean {
  const hasImage = scene.imageBlob || scene.imageUrl;
  const hasAudio = scene.audioBlob || scene.audioUrl;
  return !!(hasImage && hasAudio);
}

/**
 * Get scenes that are ready for video generation (have both image and audio)
 */
export function getReadyScenes(scenes: any[]): any[] {
  return scenes.filter(hasCompleteAssets);
}

/**
 * Progress callback type for upload operations
 */
export type UploadProgressCallback = (progress: {
  completed: number;
  total: number;
  currentAsset?: string;
  percentage: number;
}) => void;

/**
 * Upload assets with progress tracking
 */
export async function uploadAssetsWithProgress(
  sceneAssets: SceneAssets[],
  onProgress?: UploadProgressCallback
): Promise<AssetUploadResult[]> {
  const totalAssets = sceneAssets.reduce((count, scene) => {
    return count + (scene.imageBlob ? 1 : 0) + (scene.audioBlob ? 1 : 0);
  }, 0);

  let completedAssets = 0;
  const results: AssetUploadResult[] = [];

  for (const scene of sceneAssets) {
    if (scene.imageBlob) {
      onProgress?.({
        completed: completedAssets,
        total: totalAssets,
        currentAsset: `Image for scene ${scene.sceneId}`,
        percentage: Math.round((completedAssets / totalAssets) * 100),
      });

      const imageFile = blobToFile(scene.imageBlob, `image_${scene.sceneId}.png`);
      const imageResult = await uploadSingleAsset(imageFile, scene.sceneId, 'image');
      results.push(imageResult);
      completedAssets++;
    }

    if (scene.audioBlob) {
      onProgress?.({
        completed: completedAssets,
        total: totalAssets,
        currentAsset: `Audio for scene ${scene.sceneId}`,
        percentage: Math.round((completedAssets / totalAssets) * 100),
      });

      const audioFile = blobToFile(scene.audioBlob, `audio_${scene.sceneId}.mp3`);
      const audioResult = await uploadSingleAsset(audioFile, scene.sceneId, 'audio');
      results.push(audioResult);
      completedAssets++;
    }
  }

  onProgress?.({
    completed: completedAssets,
    total: totalAssets,
    percentage: 100,
  });

  return results;
}
