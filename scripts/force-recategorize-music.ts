#!/usr/bin/env npx tsx

import path from 'path';
import fs from 'fs';
import { analyzeFilename, updateCatalogCategories, saveCatalog } from '../src/utils/audio-catalog-manager';
import type { AudioCatalog } from '../src/utils/audio-catalog-manager';

async function forceRecategorizeMusic() {
  console.log('🔄 [Recategorize] Starting forced recategorization of all music tracks...');

  const directoryPath = path.join(process.cwd(), 'public', 'audio', 'background-music');
  const catalogPath = path.join(directoryPath, 'catalog.json');

  try {
    // Load existing catalog
    if (!fs.existsSync(catalogPath)) {
      console.error('❌ [Recategorize] No catalog file found');
      return;
    }

    const catalogData = fs.readFileSync(catalogPath, 'utf-8');
    const catalog = JSON.parse(catalogData) as AudioCatalog;

    console.log(`📖 [Recategorize] Loaded catalog with ${catalog.tracks.length} tracks`);

    // Re-categorize each track
    let updatedCount = 0;
    for (const track of catalog.tracks) {
      const filename = path.basename(track.filePath);
      console.log(`🎵 [Recategorize] Processing: ${filename}`);
      
      // Get new categorization
      const analysis = analyzeFilename(filename);
      
      // Update track with new categories
      const oldMoods = [...track.mood];
      const oldGenres = [...track.genre];
      const oldInstruments = [...track.instrument];
      
      track.mood = analysis.moods;
      track.genre = analysis.genres;
      track.instrument = analysis.instruments;
      
      // Log changes
      const moodsChanged = JSON.stringify(oldMoods) !== JSON.stringify(track.mood);
      const genresChanged = JSON.stringify(oldGenres) !== JSON.stringify(track.genre);
      const instrumentsChanged = JSON.stringify(oldInstruments) !== JSON.stringify(track.instrument);
      
      if (moodsChanged || genresChanged || instrumentsChanged) {
        console.log(`  ✅ Updated categories:`);
        if (moodsChanged) console.log(`    Moods: ${oldMoods.join(', ') || 'none'} → ${track.mood.join(', ') || 'none'}`);
        if (genresChanged) console.log(`    Genres: ${oldGenres.join(', ') || 'none'} → ${track.genre.join(', ') || 'none'}`);
        if (instrumentsChanged) console.log(`    Instruments: ${oldInstruments.join(', ') || 'none'} → ${track.instrument.join(', ') || 'none'}`);
        updatedCount++;
      } else {
        console.log(`  ⚪ No changes needed`);
      }
    }

    // Update catalog categories
    updateCatalogCategories(catalog);

    // Save updated catalog
    await saveCatalog(catalog, catalogPath);

    console.log(`🎉 [Recategorize] Recategorization complete!`);
    console.log(`  📊 Updated ${updatedCount} tracks`);
    console.log(`  📋 Categories: ${catalog.categories.moods.length} moods, ${catalog.categories.genres.length} genres, ${catalog.categories.instruments.length} instruments`);
    console.log(`  🎵 Moods: ${catalog.categories.moods.join(', ')}`);
    console.log(`  🎼 Genres: ${catalog.categories.genres.join(', ')}`);
    console.log(`  🎹 Instruments: ${catalog.categories.instruments.join(', ')}`);

  } catch (error) {
    console.error('❌ [Recategorize] Failed to recategorize music:', error);
    process.exit(1);
  }
}

// Run the script
forceRecategorizeMusic();
