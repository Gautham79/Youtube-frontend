import { google } from 'googleapis';

export interface YouTubeAudioTrack {
  id: string;
  title: string;
  artist: string;
  duration: number; // seconds
  genre: string[];
  mood: string[];
  instrument: string[];
  downloadUrl: string;
  previewUrl?: string; // URL for audio preview (30-60 seconds)
  attribution: boolean;
  monetizable: boolean;
  thumbnailUrl?: string;
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
  source: 'youtube' | 'freesound' | 'local' | 'upload';
  trackId?: string;
  trackUrl?: string;
  trackTitle?: string;
  trackArtist?: string;
  volume: number; // 0-100, relative to narration
  fadeIn: number; // seconds
  fadeOut: number; // seconds
  loop: boolean;
  startOffset: number; // start music at specific time
  // YouTube-specific
  mood?: string[];
  genre?: string[];
  attribution?: boolean;
}

// YouTube Audio Library moods and genres
export const YOUTUBE_MUSIC_MOODS = [
  'angry', 'bright', 'calm', 'dark', 'dramatic', 'energetic', 
  'epic', 'funky', 'happy', 'inspiring', 'peaceful', 'romantic', 
  'sad', 'scary', 'sexy', 'uplifting'
] as const;

export const YOUTUBE_MUSIC_GENRES = [
  'alternative', 'ambient', 'blues', 'classical', 'country', 
  'dance', 'electronic', 'folk', 'funk', 'hip-hop', 'jazz', 
  'latin', 'pop', 'reggae', 'rock', 'soul', 'world'
] as const;

export const YOUTUBE_MUSIC_INSTRUMENTS = [
  'bass', 'drums', 'guitar', 'keyboard', 'piano', 'strings', 
  'synthesizer', 'vocals', 'brass', 'woodwinds'
] as const;

export type YouTubeMusicMood = typeof YOUTUBE_MUSIC_MOODS[number];
export type YouTubeMusicGenre = typeof YOUTUBE_MUSIC_GENRES[number];
export type YouTubeMusicInstrument = typeof YOUTUBE_MUSIC_INSTRUMENTS[number];

class YouTubeMusicAPI {
  private youtube: any;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey
    });
  }

  /**
   * Search YouTube Audio Library for background music
   */
  async searchMusic(params: MusicSearchParams): Promise<YouTubeAudioTrack[]> {
    try {
      console.log('🎵 [YouTube Music] Searching for tracks:', params);

      // Note: YouTube Audio Library API is not publicly available
      // This is a mock implementation that would work with the actual API
      // For now, we'll return curated tracks that match the search criteria
      
      const curatedTracks = await this.getCuratedTracks();
      let filteredTracks = curatedTracks;

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

      console.log(`✅ [YouTube Music] Found ${results.length} matching tracks`);
      return results;

    } catch (error) {
      console.error('❌ [YouTube Music] Search failed:', error);
      throw new Error(`Failed to search YouTube Audio Library: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get track details by ID
   */
  async getTrackById(trackId: string): Promise<YouTubeAudioTrack | null> {
    try {
      console.log('🎵 [YouTube Music] Getting track details:', trackId);
      
      const curatedTracks = await this.getCuratedTracks();
      const track = curatedTracks.find(t => t.id === trackId);
      
      if (!track) {
        console.warn(`⚠️ [YouTube Music] Track not found: ${trackId}`);
        return null;
      }

      console.log('✅ [YouTube Music] Track found:', track.title);
      return track;

    } catch (error) {
      console.error('❌ [YouTube Music] Failed to get track:', error);
      return null;
    }
  }

  /**
   * Download track audio file
   */
  async downloadTrack(trackId: string, outputPath: string): Promise<void> {
    try {
      console.log('📥 [YouTube Music] Downloading track:', trackId);
      
      const track = await this.getTrackById(trackId);
      if (!track) {
        throw new Error(`Track not found: ${trackId}`);
      }

      // Download the audio file
      const response = await fetch(track.downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download track: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const fs = await import('fs');
      const { promisify } = await import('util');
      const writeFile = promisify(fs.writeFile);
      
      await writeFile(outputPath, buffer);
      
      console.log(`✅ [YouTube Music] Track downloaded: ${outputPath} (${buffer.length} bytes)`);

    } catch (error) {
      console.error('❌ [YouTube Music] Download failed:', error);
      throw new Error(`Failed to download track: ${error instanceof Error ? error.message : String(error)}`);
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
  }): Promise<YouTubeAudioTrack[]> {
    try {
      console.log('🤖 [YouTube Music] Suggesting music for content:', videoContent);

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
      
      console.log(`✅ [YouTube Music] Generated ${suggestions.length} suggestions`);
      return suggestions;

    } catch (error) {
      console.error('❌ [YouTube Music] Failed to suggest music:', error);
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
  }): YouTubeMusicMood[] {
    const text = `${content.title || ''} ${content.description || ''} ${content.mood || ''}`.toLowerCase();
    const moods: YouTubeMusicMood[] = [];

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
  }): YouTubeMusicGenre[] {
    const text = `${content.title || ''} ${content.description || ''}`.toLowerCase();
    const genres: YouTubeMusicGenre[] = [];

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

    // Default fallback genres
    if (genres.length === 0) {
      genres.push('ambient', 'electronic');
    }

    return genres;
  }

  /**
   * Get curated tracks (mock data for now)
   * In production, this would fetch from YouTube Audio Library
   */
  private async getCuratedTracks(): Promise<YouTubeAudioTrack[]> {
    // Mock curated tracks that represent YouTube Audio Library content
    return [
      {
        id: 'yt_ambient_1',
        title: 'Peaceful Morning',
        artist: 'YouTube Audio Library',
        duration: 180,
        genre: ['ambient', 'classical'],
        mood: ['calm', 'peaceful'],
        instrument: ['piano', 'strings'],
        downloadUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Placeholder
        previewUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Placeholder preview
        attribution: false,
        monetizable: true,
        thumbnailUrl: 'https://via.placeholder.com/120x90?text=Music'
      },
      {
        id: 'yt_corporate_1',
        title: 'Corporate Success',
        artist: 'YouTube Audio Library',
        duration: 120,
        genre: ['ambient', 'electronic'],
        mood: ['bright', 'inspiring'],
        instrument: ['synthesizer', 'piano'],
        downloadUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Placeholder
        previewUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Placeholder preview
        attribution: false,
        monetizable: true,
        thumbnailUrl: 'https://via.placeholder.com/120x90?text=Music'
      },
      {
        id: 'yt_upbeat_1',
        title: 'Energetic Vibes',
        artist: 'YouTube Audio Library',
        duration: 150,
        genre: ['electronic', 'pop'],
        mood: ['energetic', 'happy'],
        instrument: ['synthesizer', 'drums'],
        downloadUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Placeholder
        previewUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Placeholder preview
        attribution: false,
        monetizable: true,
        thumbnailUrl: 'https://via.placeholder.com/120x90?text=Music'
      },
      {
        id: 'yt_dramatic_1',
        title: 'Epic Journey',
        artist: 'YouTube Audio Library',
        duration: 200,
        genre: ['classical', 'ambient'],
        mood: ['dramatic', 'epic'],
        instrument: ['strings', 'brass'],
        downloadUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Placeholder
        previewUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Placeholder preview
        attribution: false,
        monetizable: true,
        thumbnailUrl: 'https://via.placeholder.com/120x90?text=Music'
      },
      {
        id: 'yt_jazz_1',
        title: 'Smooth Jazz Cafe',
        artist: 'YouTube Audio Library',
        duration: 240,
        genre: ['jazz', 'ambient'],
        mood: ['calm', 'romantic'],
        instrument: ['piano', 'bass'],
        downloadUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Placeholder
        previewUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Placeholder preview
        attribution: false,
        monetizable: true,
        thumbnailUrl: 'https://via.placeholder.com/120x90?text=Music'
      }
    ];
  }
}

// Singleton instance
let youtubeMusicAPI: YouTubeMusicAPI | null = null;

export function getYouTubeMusicAPI(): YouTubeMusicAPI {
  if (!youtubeMusicAPI) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YouTube API key not configured. Please set YOUTUBE_API_KEY environment variable.');
    }
    youtubeMusicAPI = new YouTubeMusicAPI(apiKey);
  }
  return youtubeMusicAPI;
}

// Default background music settings
export function getDefaultBackgroundMusicSettings(): BackgroundMusicSettings {
  return {
    enabled: false,
    source: 'youtube',
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
