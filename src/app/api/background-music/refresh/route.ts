import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { ensureCatalogUpToDate } from '@/utils/audio-catalog-manager';
import { getLocalMusicLibrary } from '@/utils/local-music-library';

/**
 * POST /api/background-music/refresh
 * Manually refresh the background music catalog by scanning for new files
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [API] Manual catalog refresh requested');

    const directoryPath = path.join(process.cwd(), 'public', 'audio', 'background-music');
    const catalogPath = path.join(directoryPath, 'catalog.json');

    // Force update the catalog
    const catalog = await ensureCatalogUpToDate(directoryPath, catalogPath, true);

    // Also refresh the local music library cache
    const musicLibrary = getLocalMusicLibrary();
    await musicLibrary.reloadCatalog();

    // Get updated statistics
    const stats = await musicLibrary.getCatalogStats();

    console.log(`✅ [API] Catalog refreshed with ${catalog.tracks.length} tracks`);

    return NextResponse.json({
      success: true,
      message: 'Background music catalog refreshed successfully',
      data: {
        totalTracks: catalog.tracks.length,
        lastUpdated: catalog.lastUpdated,
        categories: catalog.categories,
        stats: {
          totalDuration: stats.totalDuration,
          averageDuration: Math.round(stats.totalDuration / catalog.tracks.length),
          categoryCounts: stats.categories
        }
      }
    });

  } catch (error) {
    console.error('❌ [API] Failed to refresh catalog:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to refresh background music catalog',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * GET /api/background-music/refresh
 * Get catalog refresh status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 [API] Catalog status requested');

    const musicLibrary = getLocalMusicLibrary();
    const stats = await musicLibrary.getCatalogStats();
    const categories = await musicLibrary.getCategories();

    return NextResponse.json({
      success: true,
      data: {
        totalTracks: stats.totalTracks,
        totalDuration: stats.totalDuration,
        lastUpdated: stats.lastUpdated,
        categories: {
          moods: categories.moods,
          genres: categories.genres,
          instruments: categories.instruments
        },
        stats: {
          averageDuration: stats.totalTracks > 0 ? Math.round(stats.totalDuration / stats.totalTracks) : 0,
          categoryCounts: stats.categories,
          formattedDuration: `${Math.floor(stats.totalDuration / 3600)}h ${Math.floor((stats.totalDuration % 3600) / 60)}m`
        }
      }
    });

  } catch (error) {
    console.error('❌ [API] Failed to get catalog status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get catalog status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
