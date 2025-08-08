import { promises as fs } from 'fs';
import path from 'path';
import { 
  ensureCatalogUpToDate, 
  AudioCatalog, 
  AudioTrack 
} from './audio-catalog-manager';

export interface LocalAudioTrack {
  id: string;
  title: string;
  artist: string;
  duration: number; // seconds
  genre: string[];
  mood: string[];
  instrument: string[];
  filePath: string; // e.g., "/audio/background-music/peaceful-morning.mp3"
  previewUrl: string; // Same as filePath for local files
  downloadUrl: string; // Same as filePath for local files
  attribution: boolean;
  monetizable: boolean;
  thumbnailUrl?: string;
  fileSize?: string;
  bitrate?: string;
}

export interface MusicSearchParams {
  mood?: string[];
  genre?: string[];
  instrument?: string[];
  duration?: { min: number; max: number };
  attribution?: boolean;
  maxResults?: number;
}

export interface BackgroundMusicSettings {
  enabled: boolean;
  source: 'local' | 'freesound' | 'upload';
  trackId?: string;
  trackUrl?: string;
  trackTitle?: string;
  trackArtist?: string;
  volume: number; // 0-100, relative to narration
  fadeIn: number; // seconds
  fadeOut: number; // seconds
  loop: boolean;
  startOffset: number; // start music at specific time
  // Local-specific
  mood?: string[];
  genre?: string[];
  attribution?: boolean;
}

// Local music library moods and genres
export const LOCAL_MUSIC_MOODS = [
  'angry', 'bright', 'calm', 'dark', 'dramatic', 'energetic', 
  'epic', 'funky', 'happy', 'inspiring', 'peaceful', 'romantic', 
  'sad', 'scary', 'sexy', 'uplifting'
] as const;

export const LOCAL_MUSIC_GENRES = [
  'alternative', 'ambient', 'blues', 'classical', 'country', 
  'dance', 'electronic', 'folk', 'funk', 'hip-hop', 'jazz', 
  'latin', 'pop', 'reggae', 'rock', 'soul', 'world', 'cinematic', 'lounge', 'new-age'
] as const;

export const LOCAL_MUSIC_INSTRUMENTS = [
  'bass', 'drums', 'guitar', 'keyboard', 'piano', 'strings', 
  'synthesizer', 'vocals', 'brass', 'woodwinds', 'saxophone', 'bells'
] as const;

export type LocalMusicMood = typeof LOCAL_MUSIC_MOODS[number];
export type LocalMusicGenre = typeof LOCAL_MUSIC_GENRES[number];
export type LocalMusicInstrument = typeof LOCAL_MUSIC_INSTRUMENTS[number];

class LocalMusicLibrary {
  private catalog: AudioCatalog | null = null;
  private catalogPath: string;
  private directoryPath: string;

  constructor() {
    this.catalogPath = path.join(process.cwd(), 'public', 'audio', 'background-music', 'catalog.json');
    this.directoryPath = path.join(process.cwd(), 'public', 'audio', 'background-music');
  }

  /**
   * Load the music catalog with auto-discovery
   */
  private async loadCatalog(): Promise<AudioCatalog> {
    if (this.catalog) {
      return this.catalog;
    }

    try {
      console.log('🎵 [Local Music] Loading catalog with auto-discovery...');
      
      // Use auto-discovery to ensure catalog is up to date
      this.catalog = await ensureCatalogUpToDate(this.directoryPath, this.catalogPath);
      
      console.log(`✅ [Local Music] Catalog loaded with ${this.catalog.tracks.length} tracks`);
      return this.catalog;
    } catch (error) {
      console.error('❌ [Local Music] Failed to load catalog:', error);
      throw new Error(`Failed to load music catalog: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert AudioTrack to LocalAudioTrack format
   */
  private convertTrack(track: AudioTrack): LocalAudioTrack {
    return {
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      genre: track.genre,
      mood: track.mood,
      instrument: track.instrument,
      filePath: track.filePath,
      previewUrl: track.previewUrl,
      downloadUrl: track.downloadUrl,
      attribution: track.attribution,
      monetizable: track.monetizable,
      thumbnailUrl: track.thumbnailUrl,
      fileSize: track.fileSize,
      bitrate: track.bitrate
    };
  }

  /**
   * Search local music library for background music
   */
  async searchMusic(params: MusicSearchParams): Promise<LocalAudioTrack[]> {
    try {
      console.log('🎵 [Local Music] Searching for tracks:', params);

      const catalog = await this.loadCatalog();
      let filteredTracks = [...catalog.tracks];

      // Filter by mood
      if (params.mood && params.mood.length > 0) {
        filteredTracks = filteredTracks.filter(track => 
          params.mood!.some(mood => track.mood.includes(mood))
        );
      }

      // Filter by genre
      if (params.genre && params.genre.length > 0) {
        filteredTracks = filteredTracks.filter(track => 
          params.genre!.some(genre => track.genre.includes(genre))
        );
      }

      // Filter by instrument
      if (params.instrument && params.instrument.length > 0) {
        filteredTracks = filteredTracks.filter(track => 
          params.instrument!.some(instrument => track.instrument.includes(instrument))
        );
      }

      // Filter by duration
      if (params.duration) {
        filteredTracks = filteredTracks.filter(track => 
          track.duration >= params.duration!.min && 
          track.duration <= params.duration!.max
        );
      }

      // Filter by attribution requirement
      if (params.attribution !== undefined) {
        filteredTracks = filteredTracks.filter(track => 
          track.attribution === params.attribution
        );
      }

      // Limit results
      const maxResults = params.maxResults || 20;
      const results = filteredTracks.slice(0, maxResults);

      console.log(`✅ [Local Music] Found ${results.length} matching tracks`);
      return results.map(track => this.convertTrack(track));

    } catch (error) {
      console.error('❌ [Local Music] Search failed:', error);
      throw new Error(`Failed to search local music library: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get track details by ID
   */
  async getTrackById(trackId: string): Promise<LocalAudioTrack | null> {
    try {
      console.log('🎵 [Local Music] Getting track details:', trackId);
      
      const catalog = await this.loadCatalog();
      const track = catalog.tracks.find(t => t.id === trackId);
      
      if (!track) {
        console.warn(`⚠️ [Local Music] Track not found: ${trackId}`);
        return null;
      }

      console.log('✅ [Local Music] Track found:', track.title);
      return this.convertTrack(track);

    } catch (error) {
      console.error('❌ [Local Music] Failed to get track:', error);
      return null;
    }
  }

  /**
   * Get all available tracks
   */
  async getAllTracks(): Promise<LocalAudioTrack[]> {
    try {
      const catalog = await this.loadCatalog();
      return catalog.tracks.map(track => this.convertTrack(track));
    } catch (error) {
      console.error('❌ [Local Music] Failed to get all tracks:', error);
      return [];
    }
  }

  /**
   * Get available categories (moods, genres, instruments)
   */
  async getCategories(): Promise<{ moods: string[]; genres: string[]; instruments: string[] }> {
    try {
      const catalog = await this.loadCatalog();
      return catalog.categories;
    } catch (error) {
      console.error('❌ [Local Music] Failed to get categories:', error);
      return {
        moods: [...LOCAL_MUSIC_MOODS],
        genres: [...LOCAL_MUSIC_GENRES],
        instruments: [...LOCAL_MUSIC_INSTRUMENTS]
      };
    }
  }

  /**
   * Check if a track file exists
   */
  async trackExists(trackId: string): Promise<boolean> {
    try {
      const track = await this.getTrackById(trackId);
      if (!track) return false;

      // Check if the file exists in the public directory
      const filePath = path.join(process.cwd(), 'public', track.filePath);
      try {
        await fs.access(filePath);
        return true;
      } catch {
        console.warn(`⚠️ [Local Music] File not found: ${filePath}`);
        return false;
      }
    } catch (error) {
      console.error('❌ [Local Music] Error checking track existence:', error);
      return false;
    }
  }

  /**
   * Get the absolute file path for a track
   */
  async getTrackFilePath(trackId: string): Promise<string | null> {
    try {
      const track = await this.getTrackById(trackId);
      if (!track) return null;

      const filePath = path.join(process.cwd(), 'public', track.filePath);
      
      // Verify file exists
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        console.warn(`⚠️ [Local Music] File not found: ${filePath}`);
        return null;
      }
    } catch (error) {
      console.error('❌ [Local Music] Error getting track file path:', error);
      return null;
    }
  }

  /**
   * Suggest music based on video content/mood
   */
  async suggestMusic(videoContent: {
    title?: string;
    description?: string;
    duration: number;
    mood?: string;
  }): Promise<LocalAudioTrack[]> {
    try {
      console.log('🤖 [Local Music] Suggesting music for content:', videoContent);

      // Analyze content for mood and genre suggestions
      const suggestedMoods = this.analyzeMoodFromContent(videoContent);
      const suggestedGenres = this.analyzeGenreFromContent(videoContent);

      const searchParams: MusicSearchParams = {
        mood: suggestedMoods,
        genre: suggestedGenres,
        duration: {
          min: Math.max(30, videoContent.duration - 30), // Allow 30s shorter
          max: videoContent.duration + 60 // Allow 60s longer for looping
        },
        attribution: false, // Prefer no attribution required
        maxResults: 10
      };

      const suggestions = await this.searchMusic(searchParams);
      
      console.log(`✅ [Local Music] Generated ${suggestions.length} suggestions`);
      return suggestions;

    } catch (error) {
      console.error('❌ [Local Music] Failed to suggest music:', error);
      return [];
    }
  }

  /**
   * Analyze mood from video content
   */
  private analyzeMoodFromContent(content: {
    title?: string;
    description?: string;
    mood?: string;
  }): LocalMusicMood[] {
    const text = `${content.title || ''} ${content.description || ''} ${content.mood || ''}`.toLowerCase();
    const moods: LocalMusicMood[] = [];

    // Simple keyword-based mood detection
    if (text.includes('happy') || text.includes('joy') || text.includes('celebration')) {
      moods.push('happy', 'uplifting');
    }
    if (text.includes('calm') || text.includes('peaceful') || text.includes('relax')) {
      moods.push('calm', 'peaceful');
    }
    if (text.includes('energy') || text.includes('exciting') || text.includes('action')) {
      moods.push('energetic', 'epic');
    }
    if (text.includes('inspire') || text.includes('motivat') || text.includes('success')) {
      moods.push('inspiring', 'uplifting');
    }
    if (text.includes('dramatic') || text.includes('intense') || text.includes('serious')) {
      moods.push('dramatic', 'epic');
    }
    if (text.includes('corporate') || text.includes('business') || text.includes('professional')) {
      moods.push('bright', 'inspiring');
    }
    if (text.includes('romantic') || text.includes('love') || text.includes('wedding')) {
      moods.push('romantic', 'peaceful');
    }

    // Default fallback moods
    if (moods.length === 0) {
      moods.push('bright', 'calm');
    }

    return moods;
  }

  /**
   * Analyze genre from video content
   */
  private analyzeGenreFromContent(content: {
    title?: string;
    description?: string;
  }): LocalMusicGenre[] {
    const text = `${content.title || ''} ${content.description || ''}`.toLowerCase();
    const genres: LocalMusicGenre[] = [];

    // Simple keyword-based genre detection
    if (text.includes('tech') || text.includes('digital') || text.includes('modern')) {
      genres.push('electronic', 'ambient');
    }
    if (text.includes('corporate') || text.includes('business') || text.includes('professional')) {
      genres.push('ambient', 'classical');
    }
    if (text.includes('nature') || text.includes('travel') || text.includes('adventure')) {
      genres.push('folk', 'ambient');
    }
    if (text.includes('cooking') || text.includes('lifestyle') || text.includes('home')) {
      genres.push('jazz', 'folk');
    }
    if (text.includes('fitness') || text.includes('workout') || text.includes('sports')) {
      genres.push('electronic', 'rock');
    }
    if (text.includes('wedding') || text.includes('romantic') || text.includes('love')) {
      genres.push('classical', 'jazz');
    }
    if (text.includes('action') || text.includes('adventure') || text.includes('epic')) {
      genres.push('cinematic', 'rock');
    }

    // Default fallback genres
    if (genres.length === 0) {
      genres.push('ambient', 'electronic');
    }

    return genres;
  }

  /**
   * Force reload the catalog (triggers auto-discovery)
   */
  async reloadCatalog(): Promise<void> {
    this.catalog = null;
    console.log('🔄 [Local Music] Forcing catalog reload with auto-discovery...');
    
    // Force update by passing forceUpdate = true
    this.catalog = await ensureCatalogUpToDate(this.directoryPath, this.catalogPath, true);
    
    console.log(`✅ [Local Music] Catalog reloaded with ${this.catalog.tracks.length} tracks`);
  }

  /**
   * Get catalog statistics
   */
  async getCatalogStats(): Promise<{
    totalTracks: number;
    totalDuration: number;
    lastUpdated: string;
    categories: {
      moods: number;
      genres: number;
      instruments: number;
    };
  }> {
    try {
      const catalog = await this.loadCatalog();
      const totalDuration = catalog.tracks.reduce((sum, track) => sum + track.duration, 0);
      
      return {
        totalTracks: catalog.tracks.length,
        totalDuration,
        lastUpdated: catalog.lastUpdated,
        categories: {
          moods: catalog.categories.moods.length,
          genres: catalog.categories.genres.length,
          instruments: catalog.categories.instruments.length
        }
      };
    } catch (error) {
      console.error('❌ [Local Music] Failed to get catalog stats:', error);
      return {
        totalTracks: 0,
        totalDuration: 0,
        lastUpdated: 'Unknown',
        categories: { moods: 0, genres: 0, instruments: 0 }
      };
    }
  }
}

// Singleton instance
let localMusicLibrary: LocalMusicLibrary | null = null;

export function getLocalMusicLibrary(): LocalMusicLibrary {
  if (!localMusicLibrary) {
    localMusicLibrary = new LocalMusicLibrary();
  }
  return localMusicLibrary;
}

// Default background music settings
export function getDefaultBackgroundMusicSettings(): BackgroundMusicSettings {
  return {
    enabled: false,
    source: 'local',
    volume: 30, // 30% of narration volume
    fadeIn: 2,
    fadeOut: 2,
    loop: true,
    startOffset: 0,
    attribution: false
  };
}

// Validate background music settings
export function validateBackgroundMusicSettings(settings: BackgroundMusicSettings): boolean {
  if (!settings.enabled) return true;
  
  if (settings.volume < 0 || settings.volume > 100) return false;
  if (settings.fadeIn < 0 || settings.fadeIn > 10) return false;
  if (settings.fadeOut < 0 || settings.fadeOut > 10) return false;
  if (settings.startOffset < 0) return false;
  
  if (settings.enabled && !settings.trackUrl && !settings.trackId) return false;
  
  return true;
}
