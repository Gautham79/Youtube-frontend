import fs from 'fs';
import path from 'path';
import { parseFile } from 'music-metadata';

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  genre: string[];
  mood: string[];
  instrument: string[];
  filePath: string;
  previewUrl: string;
  downloadUrl: string;
  attribution: boolean;
  monetizable: boolean;
  thumbnailUrl: string;
  fileSize: string;
  bitrate: string;
  addedAt: string;
}

export interface AudioCatalog {
  version: string;
  lastUpdated: string;
  tracks: AudioTrack[];
  categories: {
    moods: string[];
    genres: string[];
    instruments: string[];
  };
}

// Audio file extensions we support
const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.aac', '.m4a', '.ogg', '.flac'];

// Keywords for smart categorization
const MOOD_KEYWORDS = {
  calm: ['calm', 'peaceful', 'relax', 'soft', 'gentle', 'quiet', 'serene', 'tranquil', 'meditation'],
  energetic: ['energetic', 'upbeat', 'fast', 'dynamic', 'active', 'powerful', 'intense', 'driving'],
  happy: ['happy', 'cheerful', 'joyful', 'positive', 'bright', 'sunny', 'fun', 'playful'],
  dramatic: ['dramatic', 'epic', 'cinematic', 'intense', 'powerful', 'emotional', 'suspense'],
  romantic: ['romantic', 'love', 'tender', 'intimate', 'sweet', 'gentle', 'warm'],
  sad: ['sad', 'melancholy', 'emotional', 'dark', 'somber', 'moody', 'blue'],
  inspiring: ['inspiring', 'motivational', 'uplifting', 'hopeful', 'triumphant', 'success'],
  scary: ['scary', 'horror', 'dark', 'spooky', 'eerie', 'haunting', 'sinister'],
  peaceful: ['peaceful', 'ambient', 'nature', 'zen', 'spa', 'healing', 'soothing']
};

const GENRE_KEYWORDS = {
  ambient: ['ambient', 'atmospheric', 'soundscape', 'drone', 'meditation'],
  electronic: ['electronic', 'synth', 'digital', 'edm', 'techno', 'house'],
  classical: ['classical', 'orchestra', 'symphony', 'baroque', 'piano', 'violin'],
  jazz: ['jazz', 'swing', 'blues', 'bebop', 'smooth', 'lounge'],
  rock: ['rock', 'guitar', 'metal', 'punk', 'alternative'],
  pop: ['pop', 'mainstream', 'commercial', 'radio'],
  cinematic: ['cinematic', 'film', 'movie', 'score', 'soundtrack'],
  corporate: ['corporate', 'business', 'professional', 'presentation'],
  folk: ['folk', 'acoustic', 'country', 'traditional'],
  world: ['world', 'ethnic', 'cultural', 'traditional']
};

const INSTRUMENT_KEYWORDS = {
  piano: ['piano', 'keyboard', 'keys'],
  guitar: ['guitar', 'acoustic', 'electric'],
  strings: ['strings', 'violin', 'cello', 'orchestra'],
  drums: ['drums', 'percussion', 'beat'],
  synthesizer: ['synth', 'synthesizer', 'electronic'],
  brass: ['brass', 'trumpet', 'horn'],
  bass: ['bass', 'bassline'],
  vocals: ['vocal', 'voice', 'singing'],
  saxophone: ['sax', 'saxophone'],
  bells: ['bells', 'chimes']
};

/**
 * Extract audio metadata from a file
 */
export async function extractAudioMetadata(filePath: string): Promise<{
  duration: number;
  title?: string;
  artist?: string;
  genre?: string;
  bitrate?: number;
  fileSize: number;
} | null> {
  try {
    console.log(`🎵 [AudioCatalog] Extracting metadata from: ${filePath}`);
    
    // Get file stats
    const stats = fs.statSync(filePath);
    
    // Parse audio metadata
    const metadata = await parseFile(filePath);
    
    const result = {
      duration: Math.round(metadata.format.duration || 0),
      title: metadata.common.title,
      artist: metadata.common.artist,
      genre: metadata.common.genre?.[0],
      bitrate: metadata.format.bitrate,
      fileSize: stats.size
    };
    
    console.log(`✅ [AudioCatalog] Metadata extracted:`, {
      duration: result.duration,
      title: result.title,
      fileSize: `${(result.fileSize / 1024 / 1024).toFixed(1)}MB`
    });
    
    return result;
  } catch (error) {
    console.error(`❌ [AudioCatalog] Failed to extract metadata from ${filePath}:`, error);
    return null;
  }
}

/**
 * Analyze filename and extract categorization hints
 */
export function analyzeFilename(filename: string): {
  moods: string[];
  genres: string[];
  instruments: string[];
  title: string;
} {
  const cleanName = filename.toLowerCase().replace(/[_-]/g, ' ');
  const words = cleanName.split(/\s+/);
  
  const moods: string[] = [];
  const genres: string[] = [];
  const instruments: string[] = [];
  
  // Check for mood keywords
  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    if (keywords.some(keyword => cleanName.includes(keyword))) {
      moods.push(mood);
    }
  }
  
  // Check for genre keywords
  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    if (keywords.some(keyword => cleanName.includes(keyword))) {
      genres.push(genre);
    }
  }
  
  // Check for instrument keywords
  for (const [instrument, keywords] of Object.entries(INSTRUMENT_KEYWORDS)) {
    if (keywords.some(keyword => cleanName.includes(keyword))) {
      instruments.push(instrument);
    }
  }
  
  // Enhanced categorization based on track patterns
  const enhancedCategories = enhancedCategorization(cleanName);
  moods.push(...enhancedCategories.moods);
  genres.push(...enhancedCategories.genres);
  instruments.push(...enhancedCategories.instruments);
  
  // Generate a clean title from filename
  const title = filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
    .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
    .trim();
  
  return { 
    moods: [...new Set(moods)], // Remove duplicates
    genres: [...new Set(genres)], 
    instruments: [...new Set(instruments)], 
    title 
  };
}

/**
 * Enhanced categorization based on track patterns and context
 */
function enhancedCategorization(cleanName: string): {
  moods: string[];
  genres: string[];
  instruments: string[];
} {
  const moods: string[] = [];
  const genres: string[] = [];
  const instruments: string[] = [];
  
  // Artist-based categorization
  if (cleanName.includes('everet almond')) {
    // Everet Almond tends to make emotional, cinematic music
    genres.push('cinematic', 'ambient');
    moods.push('dramatic', 'inspiring');
  }
  
  if (cleanName.includes('mini vandals')) {
    // The Mini Vandals make atmospheric, ambient music
    genres.push('ambient', 'electronic');
    moods.push('calm', 'peaceful');
  }
  
  if (cleanName.includes('ryan stasik')) {
    // Ryan Stasik makes electronic, upbeat music
    genres.push('electronic', 'pop');
    moods.push('energetic', 'happy');
  }
  
  // Title-based smart categorization
  if (cleanName.includes('love') || cleanName.includes('heart')) {
    moods.push('romantic');
  }
  
  if (cleanName.includes('dance') || cleanName.includes('viral')) {
    moods.push('energetic');
    genres.push('electronic');
  }
  
  if (cleanName.includes('rain') || cleanName.includes('floating') || cleanName.includes('drift')) {
    moods.push('calm', 'peaceful');
    genres.push('ambient');
  }
  
  if (cleanName.includes('rush') || cleanName.includes('fast') || cleanName.includes('circuit')) {
    moods.push('energetic');
    genres.push('electronic');
  }
  
  if (cleanName.includes('giving up') || cleanName.includes('changes') || cleanName.includes('return')) {
    moods.push('sad', 'dramatic');
  }
  
  if (cleanName.includes('station') || cleanName.includes('kyoto') || cleanName.includes('ghibli')) {
    moods.push('peaceful', 'calm');
    genres.push('ambient', 'cinematic');
  }
  
  if (cleanName.includes('bass') || cleanName.includes('drum')) {
    instruments.push('bass', 'drums');
    genres.push('electronic');
  }
  
  if (cleanName.includes('wall') || cleanName.includes('scale') || cleanName.includes('slope')) {
    moods.push('dramatic', 'inspiring');
    genres.push('cinematic');
  }
  
  // Fallback categorization - ensure every track has at least some categories
  if (moods.length === 0) {
    // Default mood based on artist style
    if (cleanName.includes('everet almond')) {
      moods.push('inspiring');
    } else if (cleanName.includes('mini vandals')) {
      moods.push('calm');
    } else if (cleanName.includes('ryan stasik')) {
      moods.push('energetic');
    } else {
      moods.push('bright'); // Generic fallback
    }
  }
  
  if (genres.length === 0) {
    // Default genre based on artist style
    if (cleanName.includes('everet almond')) {
      genres.push('cinematic');
    } else if (cleanName.includes('mini vandals')) {
      genres.push('ambient');
    } else if (cleanName.includes('ryan stasik')) {
      genres.push('electronic');
    } else {
      genres.push('ambient'); // Generic fallback
    }
  }
  
  return { moods, genres, instruments };
}

/**
 * Generate a unique ID from filename
 */
export function generateTrackId(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format bitrate in human readable format
 */
export function formatBitrate(bitrate?: number): string {
  if (!bitrate) return 'Unknown';
  return `${Math.round(bitrate / 1000)}kbps`;
}

/**
 * Scan the audio directory and find all audio files
 */
export async function scanAudioDirectory(directoryPath: string): Promise<string[]> {
  try {
    console.log(`📁 [AudioCatalog] Scanning directory: ${directoryPath}`);
    
    if (!fs.existsSync(directoryPath)) {
      console.log(`⚠️ [AudioCatalog] Directory does not exist: ${directoryPath}`);
      return [];
    }
    
    const files = fs.readdirSync(directoryPath);
    const audioFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return SUPPORTED_AUDIO_EXTENSIONS.includes(ext);
    });
    
    console.log(`✅ [AudioCatalog] Found ${audioFiles.length} audio files`);
    return audioFiles;
  } catch (error) {
    console.error(`❌ [AudioCatalog] Failed to scan directory:`, error);
    return [];
  }
}

/**
 * Load existing catalog or create a new one
 */
export async function loadCatalog(catalogPath: string): Promise<AudioCatalog> {
  try {
    if (fs.existsSync(catalogPath)) {
      const catalogData = fs.readFileSync(catalogPath, 'utf-8');
      const catalog = JSON.parse(catalogData) as AudioCatalog;
      console.log(`📖 [AudioCatalog] Loaded existing catalog with ${catalog.tracks.length} tracks`);
      return catalog;
    }
  } catch (error) {
    console.error(`❌ [AudioCatalog] Failed to load catalog:`, error);
  }
  
  // Return default catalog structure
  console.log(`📝 [AudioCatalog] Creating new catalog`);
  return {
    version: '1.0',
    lastUpdated: new Date().toISOString().split('T')[0],
    tracks: [],
    categories: {
      moods: ['calm', 'energetic', 'happy', 'dramatic', 'romantic', 'sad', 'inspiring', 'scary', 'peaceful'],
      genres: ['ambient', 'electronic', 'classical', 'jazz', 'rock', 'pop', 'cinematic', 'corporate', 'folk', 'world'],
      instruments: ['piano', 'guitar', 'strings', 'drums', 'synthesizer', 'brass', 'bass', 'vocals', 'saxophone', 'bells']
    }
  };
}

/**
 * Save catalog to file
 */
export async function saveCatalog(catalog: AudioCatalog, catalogPath: string): Promise<void> {
  try {
    // Update timestamp
    catalog.lastUpdated = new Date().toISOString().split('T')[0];
    
    // Ensure directory exists
    const catalogDir = path.dirname(catalogPath);
    if (!fs.existsSync(catalogDir)) {
      fs.mkdirSync(catalogDir, { recursive: true });
    }
    
    // Write catalog file
    fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
    console.log(`💾 [AudioCatalog] Saved catalog with ${catalog.tracks.length} tracks`);
  } catch (error) {
    console.error(`❌ [AudioCatalog] Failed to save catalog:`, error);
    throw error;
  }
}

/**
 * Create a track entry from file metadata
 */
export async function createTrackFromFile(
  filename: string,
  directoryPath: string
): Promise<AudioTrack | null> {
  try {
    const filePath = path.join(directoryPath, filename);
    const metadata = await extractAudioMetadata(filePath);
    
    if (!metadata) {
      return null;
    }
    
    const analysis = analyzeFilename(filename);
    const trackId = generateTrackId(filename);
    
    // Use metadata title if available, otherwise use analyzed title
    const title = metadata.title || analysis.title;
    const artist = metadata.artist || 'Local Music Library';
    
    // Combine metadata genre with analyzed genres
    const genres = [...analysis.genres];
    if (metadata.genre && !genres.includes(metadata.genre.toLowerCase())) {
      genres.push(metadata.genre.toLowerCase());
    }
    
    const track: AudioTrack = {
      id: trackId,
      title,
      artist,
      duration: metadata.duration,
      genre: genres,
      mood: analysis.moods,
      instrument: analysis.instruments,
      filePath: `/audio/background-music/${filename}`,
      previewUrl: `/audio/background-music/${filename}`,
      downloadUrl: `/audio/background-music/${filename}`,
      attribution: false,
      monetizable: true,
      thumbnailUrl: '/audio/background-music/thumbnails/default.jpg',
      fileSize: formatFileSize(metadata.fileSize),
      bitrate: formatBitrate(metadata.bitrate),
      addedAt: new Date().toISOString()
    };
    
    console.log(`✅ [AudioCatalog] Created track entry: ${title}`);
    return track;
  } catch (error) {
    console.error(`❌ [AudioCatalog] Failed to create track from file ${filename}:`, error);
    return null;
  }
}

/**
 * Update catalog with new files from directory
 */
export async function updateCatalogFromDirectory(
  directoryPath: string,
  catalogPath: string
): Promise<AudioCatalog> {
  console.log(`🔄 [AudioCatalog] Starting catalog update from directory: ${directoryPath}`);
  
  // Load existing catalog
  const catalog = await loadCatalog(catalogPath);
  
  // Scan directory for audio files
  const audioFiles = await scanAudioDirectory(directoryPath);
  
  // Get existing track file paths for comparison
  const existingFiles = new Set(
    catalog.tracks.map(track => path.basename(track.filePath))
  );
  
  // Find new files that aren't in the catalog
  const newFiles = audioFiles.filter(filename => !existingFiles.has(filename));
  
  console.log(`📊 [AudioCatalog] Found ${newFiles.length} new files to process`);
  
  // Process new files
  let addedCount = 0;
  for (const filename of newFiles) {
    const track = await createTrackFromFile(filename, directoryPath);
    if (track) {
      catalog.tracks.push(track);
      addedCount++;
    }
  }
  
  // Remove tracks for files that no longer exist
  const removedTracks = catalog.tracks.filter(track => {
    const filename = path.basename(track.filePath);
    return !audioFiles.includes(filename);
  });
  
  if (removedTracks.length > 0) {
    catalog.tracks = catalog.tracks.filter(track => {
      const filename = path.basename(track.filePath);
      return audioFiles.includes(filename);
    });
    console.log(`🗑️ [AudioCatalog] Removed ${removedTracks.length} tracks for missing files`);
  }
  
  // Update categories based on all tracks
  updateCatalogCategories(catalog);
  
  // Save updated catalog
  await saveCatalog(catalog, catalogPath);
  
  console.log(`🎉 [AudioCatalog] Catalog update complete: ${addedCount} added, ${removedTracks.length} removed, ${catalog.tracks.length} total`);
  
  return catalog;
}

/**
 * Update catalog categories based on existing tracks
 */
export function updateCatalogCategories(catalog: AudioCatalog): void {
  const allMoods = new Set<string>();
  const allGenres = new Set<string>();
  const allInstruments = new Set<string>();
  
  // Collect all unique categories from tracks
  catalog.tracks.forEach(track => {
    track.mood.forEach(mood => allMoods.add(mood));
    track.genre.forEach(genre => allGenres.add(genre));
    track.instrument.forEach(instrument => allInstruments.add(instrument));
  });
  
  // Update catalog categories
  catalog.categories.moods = Array.from(allMoods).sort();
  catalog.categories.genres = Array.from(allGenres).sort();
  catalog.categories.instruments = Array.from(allInstruments).sort();
  
  console.log(`📋 [AudioCatalog] Updated categories:`, {
    moods: catalog.categories.moods.length,
    genres: catalog.categories.genres.length,
    instruments: catalog.categories.instruments.length
  });
}

/**
 * Check if catalog needs updating based on directory modification time
 */
export function shouldUpdateCatalog(directoryPath: string, catalogPath: string): boolean {
  try {
    if (!fs.existsSync(catalogPath)) {
      return true; // No catalog exists
    }
    
    if (!fs.existsSync(directoryPath)) {
      return false; // No directory to scan
    }
    
    const catalogStats = fs.statSync(catalogPath);
    const directoryStats = fs.statSync(directoryPath);
    
    // Check if directory was modified after catalog
    return directoryStats.mtime > catalogStats.mtime;
  } catch (error) {
    console.error(`❌ [AudioCatalog] Failed to check update status:`, error);
    return true; // Default to updating on error
  }
}

/**
 * Main function to ensure catalog is up to date
 */
export async function ensureCatalogUpToDate(
  directoryPath: string,
  catalogPath: string,
  forceUpdate: boolean = false
): Promise<AudioCatalog> {
  if (forceUpdate || shouldUpdateCatalog(directoryPath, catalogPath)) {
    console.log(`🔄 [AudioCatalog] Catalog needs updating`);
    return await updateCatalogFromDirectory(directoryPath, catalogPath);
  } else {
    console.log(`✅ [AudioCatalog] Catalog is up to date`);
    return await loadCatalog(catalogPath);
  }
}
