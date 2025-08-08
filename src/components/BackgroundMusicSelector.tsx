'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Music, 
  Play, 
  Pause, 
  Volume2, 
  Clock, 
  Sparkles, 
  Search,
  Download,
  CheckCircle,
  Loader2,
  VolumeX
} from 'lucide-react';
import { BackgroundMusicSettings, YouTubeAudioTrack } from '@/utils/youtube-music-api';

interface BackgroundMusicSelectorProps {
  settings: BackgroundMusicSettings;
  onSettingsChange: (settings: BackgroundMusicSettings) => void;
  videoContent?: {
    title?: string;
    description?: string;
    duration: number;
    mood?: string;
  };
  className?: string;
}

interface MusicMetadata {
  moods: string[];
  genres: string[];
}

export default function BackgroundMusicSelector({
  settings,
  onSettingsChange,
  videoContent,
  className = ''
}: BackgroundMusicSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<YouTubeAudioTrack[]>([]);
  const [searchResults, setSearchResults] = useState<YouTubeAudioTrack[]>([]);
  const [metadata, setMetadata] = useState<MusicMetadata>({ moods: [], genres: [] });
  const [selectedTrack, setSelectedTrack] = useState<YouTubeAudioTrack | null>(null);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [searchFilters, setSearchFilters] = useState({
    mood: [] as string[],
    genre: [] as string[],
    query: ''
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Load metadata on component mount
  useEffect(() => {
    loadMetadata();
  }, []);

  // Load suggestions when video content changes
  useEffect(() => {
    if (settings.enabled && videoContent) {
      loadSuggestions();
    }
  }, [settings.enabled, videoContent]);

  const loadMetadata = async () => {
    try {
      const response = await fetch('/api/background-music/search');
      if (response.ok) {
        const data = await response.json();
        setMetadata({
          moods: data.moods || [],
          genres: data.genres || []
        });
      }
    } catch (error) {
      console.error('Failed to load music metadata:', error);
    }
  };

  const loadSuggestions = async () => {
    if (!videoContent) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/background-music/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoContent)
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to load music suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchMusic = async () => {
    setIsLoading(true);
    try {
      const searchParams = {
        mood: searchFilters.mood.length > 0 ? searchFilters.mood : undefined,
        genre: searchFilters.genre.length > 0 ? searchFilters.genre : undefined,
        duration: videoContent ? {
          min: Math.max(30, videoContent.duration - 30),
          max: videoContent.duration + 60
        } : undefined,
        maxResults: 20
      };

      const response = await fetch('/api/background-music/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchParams)
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.tracks || []);
      }
    } catch (error) {
      console.error('Failed to search music:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectTrack = (track: YouTubeAudioTrack) => {
    setSelectedTrack(track);
    onSettingsChange({
      ...settings,
      trackId: track.id,
      trackUrl: track.downloadUrl,
      trackTitle: track.title,
      trackArtist: track.artist,
      source: 'youtube'
    });
  };

  const togglePlay = async (trackId: string) => {
    try {
      setAudioError(null);
      
      if (playingTrack === trackId) {
        // Stop current playback
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setPlayingTrack(null);
        return;
      }

      // Find the track to play
      const track = [...suggestions, ...searchResults].find(t => t.id === trackId);
      if (!track || !track.previewUrl) {
        setAudioError('Preview not available for this track');
        return;
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // Create new audio element
      const audio = new Audio(track.previewUrl);
      audioRef.current = audio;
      
      // Set volume based on settings
      audio.volume = (settings.volume / 100) * 0.5; // 50% of user setting for preview
      
      // Handle audio events
      audio.onloadstart = () => {
        console.log('Loading audio preview...');
      };
      
      audio.oncanplay = () => {
        console.log('Audio preview ready to play');
      };
      
      audio.onplay = () => {
        setPlayingTrack(trackId);
      };
      
      audio.onpause = () => {
        setPlayingTrack(null);
      };
      
      audio.onended = () => {
        setPlayingTrack(null);
      };
      
      audio.onerror = (e) => {
        console.error('Audio preview error:', e);
        setAudioError('Failed to load audio preview');
        setPlayingTrack(null);
      };

      // Start playback
      await audio.play();
      
    } catch (error) {
      console.error('Failed to play audio preview:', error);
      setAudioError('Failed to play audio preview');
      setPlayingTrack(null);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Update audio volume when settings change
  useEffect(() => {
    if (audioRef.current && playingTrack) {
      audioRef.current.volume = (settings.volume / 100) * 0.5;
    }
  }, [settings.volume, playingTrack]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderTrackCard = (track: YouTubeAudioTrack, isSelected: boolean = false) => (
    <Card 
      key={track.id} 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
      }`}
      onClick={() => selectTrack(track)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{track.title}</h4>
            <p className="text-xs text-gray-600 truncate">{track.artist}</p>
            
            <div className="flex flex-wrap gap-1 mt-2">
              {track.mood.slice(0, 2).map(mood => (
                <Badge key={mood} variant="secondary" className="text-xs">
                  {mood}
                </Badge>
              ))}
              {track.genre.slice(0, 1).map(genre => (
                <Badge key={genre} variant="outline" className="text-xs">
                  {genre}
                </Badge>
              ))}
            </div>
            
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {formatDuration(track.duration)}
              {!track.attribution && (
                <Badge variant="secondary" className="text-xs">
                  No Attribution
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-1 ml-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay(track.id);
              }}
              className="w-8 h-8 p-0"
            >
              {playingTrack === track.id ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
            </Button>
            
            {isSelected && (
              <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="w-5 h-5" />
          Background Music
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="enable-music" className="text-sm font-medium">
            Add Background Music
          </Label>
          <Switch
            id="enable-music"
            checked={settings.enabled}
            onCheckedChange={(enabled: boolean) => 
              onSettingsChange({ ...settings, enabled })
            }
          />
        </div>

        {settings.enabled && (
          <>
            {/* Music Selection Tabs */}
            <Tabs defaultValue="suggestions" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="suggestions" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Suggestions
                </TabsTrigger>
                <TabsTrigger value="search" className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Search
                </TabsTrigger>
              </TabsList>

              {/* AI Suggestions Tab */}
              <TabsContent value="suggestions" className="space-y-4">
                <div className="text-sm text-gray-600">
                  AI-suggested music based on your video content
                </div>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="ml-2">Loading suggestions...</span>
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="grid gap-3 max-h-64 overflow-y-auto">
                    {suggestions.map(track => 
                      renderTrackCard(track, selectedTrack?.id === track.id)
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No suggestions available</p>
                    <p className="text-xs">Try providing video content details</p>
                  </div>
                )}
              </TabsContent>

              {/* Search Tab */}
              <TabsContent value="search" className="space-y-4">
                <div className="space-y-3">
                  {/* Mood Filter */}
                  <div>
                    <Label className="text-sm">Mood</Label>
                    <Select
                      value={searchFilters.mood[0] || ''}
                      onValueChange={(value: string) => 
                        setSearchFilters(prev => ({
                          ...prev,
                          mood: value ? [value] : []
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select mood" />
                      </SelectTrigger>
                      <SelectContent>
                        {metadata.moods.map(mood => (
                          <SelectItem key={mood} value={mood}>
                            {mood.charAt(0).toUpperCase() + mood.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Genre Filter */}
                  <div>
                    <Label className="text-sm">Genre</Label>
                    <Select
                      value={searchFilters.genre[0] || ''}
                      onValueChange={(value: string) => 
                        setSearchFilters(prev => ({
                          ...prev,
                          genre: value ? [value] : []
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select genre" />
                      </SelectTrigger>
                      <SelectContent>
                        {metadata.genres.map(genre => (
                          <SelectItem key={genre} value={genre}>
                            {genre.charAt(0).toUpperCase() + genre.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={searchMusic} 
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    Search Music
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="grid gap-3 max-h-64 overflow-y-auto">
                    {searchResults.map(track => 
                      renderTrackCard(track, selectedTrack?.id === track.id)
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Music Settings */}
            {selectedTrack && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-sm">Music Settings</h4>
                
                {/* Volume */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      Volume
                    </Label>
                    <span className="text-sm text-gray-600">{settings.volume}%</span>
                  </div>
                  <Slider
                    value={[settings.volume]}
                    onValueChange={([value]: number[]) => 
                      onSettingsChange({ ...settings, volume: value })
                    }
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                {/* Fade In/Out */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Fade In (seconds)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={settings.fadeIn}
                      onChange={(e) => 
                        onSettingsChange({ 
                          ...settings, 
                          fadeIn: parseFloat(e.target.value) || 0 
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Fade Out (seconds)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={settings.fadeOut}
                      onChange={(e) => 
                        onSettingsChange({ 
                          ...settings, 
                          fadeOut: parseFloat(e.target.value) || 0 
                        })
                      }
                    />
                  </div>
                </div>

                {/* Start Offset */}
                <div className="space-y-2">
                  <Label className="text-sm">Start Delay (seconds)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    step="1"
                    value={settings.startOffset}
                    onChange={(e) => 
                      onSettingsChange({ 
                        ...settings, 
                        startOffset: parseFloat(e.target.value) || 0 
                      })
                    }
                  />
                  <p className="text-xs text-gray-500">
                    Delay before music starts playing
                  </p>
                </div>

                {/* Loop Option */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="loop-music" className="text-sm">
                    Loop if shorter than video
                  </Label>
                  <Switch
                    id="loop-music"
                    checked={settings.loop}
                    onCheckedChange={(loop: boolean) => 
                      onSettingsChange({ ...settings, loop })
                    }
                  />
                </div>

                {/* Selected Track Info */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Selected Track</span>
                  </div>
                  <p className="text-sm font-medium">{selectedTrack.title}</p>
                  <p className="text-xs text-gray-600">{selectedTrack.artist}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Duration: {formatDuration(selectedTrack.duration)}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
