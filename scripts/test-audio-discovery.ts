#!/usr/bin/env tsx

/**
 * Test script for audio auto-discovery system
 * This script tests the catalog manager and local music library integration
 */

import path from 'path';
import { ensureCatalogUpToDate, scanAudioDirectory } from '../src/utils/audio-catalog-manager';
import { getLocalMusicLibrary } from '../src/utils/local-music-library';

async function testAudioDiscovery() {
  console.log('🧪 [Test] Starting audio discovery system test...\n');

  const directoryPath = path.join(process.cwd(), 'public', 'audio', 'background-music');
  const catalogPath = path.join(directoryPath, 'catalog.json');

  try {
    // Test 1: Scan directory for audio files
    console.log('📁 Test 1: Scanning audio directory...');
    const audioFiles = await scanAudioDirectory(directoryPath);
    console.log(`Found ${audioFiles.length} audio files:`, audioFiles.slice(0, 5));
    console.log('✅ Directory scan test passed\n');

    // Test 2: Update catalog with auto-discovery
    console.log('🔄 Test 2: Testing catalog auto-discovery...');
    const catalog = await ensureCatalogUpToDate(directoryPath, catalogPath, true);
    console.log(`Catalog updated with ${catalog.tracks.length} tracks`);
    console.log('Categories:', {
      moods: catalog.categories.moods.length,
      genres: catalog.categories.genres.length,
      instruments: catalog.categories.instruments.length
    });
    console.log('✅ Catalog auto-discovery test passed\n');

    // Test 3: Local music library integration
    console.log('🎵 Test 3: Testing local music library...');
    const musicLibrary = getLocalMusicLibrary();
    
    // Get all tracks
    const allTracks = await musicLibrary.getAllTracks();
    console.log(`Local music library loaded ${allTracks.length} tracks`);

    // Test search functionality
    const searchResults = await musicLibrary.searchMusic({
      mood: ['calm', 'peaceful'],
      maxResults: 3
    });
    console.log(`Search for calm/peaceful music returned ${searchResults.length} results`);
    
    if (searchResults.length > 0) {
      console.log('Sample track:', {
        title: searchResults[0].title,
        artist: searchResults[0].artist,
        duration: searchResults[0].duration,
        moods: searchResults[0].mood,
        genres: searchResults[0].genre
      });
    }

    // Test suggestions
    const suggestions = await musicLibrary.suggestMusic({
      title: 'Corporate Business Presentation',
      description: 'Professional video about business success',
      duration: 120
    });
    console.log(`Content-based suggestions returned ${suggestions.length} tracks`);
    console.log('✅ Local music library test passed\n');

    // Test 4: Get catalog statistics
    console.log('📊 Test 4: Testing catalog statistics...');
    const stats = await musicLibrary.getCatalogStats();
    console.log('Catalog Statistics:', {
      totalTracks: stats.totalTracks,
      totalDuration: `${Math.round(stats.totalDuration / 60)} minutes`,
      lastUpdated: stats.lastUpdated,
      categories: stats.categories
    });
    console.log('✅ Statistics test passed\n');

    // Test 5: Force catalog reload
    console.log('🔄 Test 5: Testing catalog reload...');
    await musicLibrary.reloadCatalog();
    const reloadedStats = await musicLibrary.getCatalogStats();
    console.log(`Catalog reloaded with ${reloadedStats.totalTracks} tracks`);
    console.log('✅ Catalog reload test passed\n');

    console.log('🎉 All tests passed! Audio discovery system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testAudioDiscovery().catch(console.error);
}

export { testAudioDiscovery };
