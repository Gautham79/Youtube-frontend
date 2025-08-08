"use client";

import { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/app/(site)/Navbar";
import Footer from "@/app/(site)/Footer";
import Link from "next/link";
import { ArrowLeft, Lightbulb, TrendingUp, Globe, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Category {
  id: number;
  title: string;
  icon: string;
  color: string;
  description: string;
}

interface TrendingTopic {
  id: string;
  title: string;
  description: string;
  channel: string;
  viewCount: string;
  thumbnailUrl: string;
  youtubeUrl: string;
  contentIdeas: string[];
  engagement: {
    views: number;
    likes: number;
    comments: number;
  };
  engagementScore?: number;
}

interface AIGeneratedIdea {
  title: string;
  description: string;
  type: 'tutorial' | 'review' | 'comparison' | 'reaction' | 'analysis' | 'tips' | 'beginner' | 'advanced';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedLength: string;
  targetAudience: string;
  keyPoints: string[];
  seoKeywords: string[];
  confidenceScore: number;
}

// Hook for detecting user location
function useUserLocation() {
  const [regionCode, setRegionCode] = useState('US');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to get location from browser
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // In a real app, you'd use a geocoding service here
            // For now, we'll use a simple IP-based detection
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            setRegionCode(data.country_code || 'US');
          } catch (error) {
            console.error('Failed to detect location:', error);
            setRegionCode('US');
          } finally {
            setLoading(false);
          }
        },
        () => {
          // Fallback to IP-based detection
          fetch('https://ipapi.co/json/')
            .then(res => res.json())
            .then(data => setRegionCode(data.country_code || 'US'))
            .catch(() => setRegionCode('US'))
            .finally(() => setLoading(false));
        }
      );
    } else {
      // Fallback for browsers without geolocation
      fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => setRegionCode(data.country_code || 'US'))
        .catch(() => setRegionCode('US'))
        .finally(() => setLoading(false));
    }
  }, []);

  return { regionCode, loading };
}

function CategoryCard({ category, isSelected, onClick }: {
  category: Category;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <Card 
      className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
        isSelected 
          ? 'ring-2 ring-indigo-500 bg-indigo-50' 
          : 'hover:shadow-md'
      }`}
      onClick={onClick}
    >
      <div className="text-center">
        <div className="text-3xl mb-2">{category.icon}</div>
        <h3 className="font-semibold text-gray-900 mb-1">{category.title}</h3>
        <p className="text-xs text-gray-600">{category.description}</p>
      </div>
    </Card>
  );
}

function TopicCard({ 
  topic, 
  onGenerateAI, 
  expandedIdeas, 
  isGenerating, 
  onToggleExpansion,
  hasGeneratedIdeas
}: { 
  topic: TrendingTopic; 
  onGenerateAI: (topics: TrendingTopic[]) => void;
  expandedIdeas: AIGeneratedIdea[] | null;
  isGenerating: boolean;
  onToggleExpansion: () => void;
  hasGeneratedIdeas: boolean;
}) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const hasIdeas = expandedIdeas && expandedIdeas.length > 0;
  const isExpanded = hasIdeas; // Ideas are visible

  return (
    <div className="space-y-4">
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex gap-4">
          {topic.thumbnailUrl && (
            <img 
              src={topic.thumbnailUrl} 
              alt={topic.title}
              className="w-32 h-20 object-cover rounded-lg flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">
                {topic.title}
              </h3>
              {topic.engagementScore && (
                <div className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  🔥 {topic.engagementScore.toFixed(1)}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">{topic.channel}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
              <span>{formatNumber(topic.engagement.views)} views</span>
              <span>{formatNumber(topic.engagement.likes)} likes</span>
              <span>{formatNumber(topic.engagement.comments)} comments</span>
            </div>
            
            {topic.contentIdeas.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  💡 Basic Ideas:
                </h4>
                <ul className="space-y-1">
                  {topic.contentIdeas.slice(0, 3).map((idea, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-indigo-500 mt-1">•</span>
                      <span>{idea}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex gap-2 mt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(topic.youtubeUrl, '_blank')}
              >
                View Original
              </Button>
              
              {!hasGeneratedIdeas ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onGenerateAI([topic])}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>✨ AI Ideas</>
                  )}
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onToggleExpansion}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 hover:from-green-600 hover:to-emerald-600"
                >
                  {hasIdeas ? '🔽 Hide Ideas' : '🔼 Show Ideas'}
                </Button>
              )}
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // TODO: Save idea functionality
                  console.log('Save idea:', topic.title);
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Expanded AI Ideas Section */}
      {hasIdeas && expandedIdeas && (
        <div className="ml-4 border-l-2 border-purple-200 pl-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">✨</span>
            <h4 className="text-lg font-semibold text-gray-900">
              AI-Generated Ideas for "{topic.title}"
            </h4>
            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              {expandedIdeas.length} ideas
            </span>
          </div>
          
          <div className="space-y-4">
            {expandedIdeas.map((idea, index) => (
              <AIIdeaCard key={index} idea={idea} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AIIdeaCard({ idea }: { idea: AIGeneratedIdea }) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tutorial': return '📚';
      case 'review': return '⭐';
      case 'comparison': return '⚖️';
      case 'reaction': return '😮';
      case 'analysis': return '🔍';
      case 'tips': return '💡';
      default: return '🎥';
    }
  };

  const handleUseForScript = () => {
    // Create a detailed idea description for the script generation
    const fullIdea = `${idea.title}

${idea.description}

Target Audience: ${idea.targetAudience}
Estimated Length: ${idea.estimatedLength}
Difficulty: ${idea.difficulty}

Key Points to Cover:
${idea.keyPoints.map(point => `• ${point}`).join('\n')}

SEO Keywords: ${idea.seoKeywords.join(', ')}`;

    // Navigate to script page with the idea populated
    const scriptUrl = `/dashboard/script?idea=${encodeURIComponent(fullIdea)}&title=${encodeURIComponent(idea.title)}`;
    window.location.href = scriptUrl;
  };

  const handleCopyToClipboard = async () => {
    try {
      const ideaText = `${idea.title}

${idea.description}

Target Audience: ${idea.targetAudience}
Estimated Length: ${idea.estimatedLength}
Difficulty: ${idea.difficulty}

Key Points to Cover:
${idea.keyPoints.map(point => `• ${point}`).join('\n')}

SEO Keywords: ${idea.seoKeywords.join(', ')}`;

      await navigator.clipboard.writeText(ideaText);
      
      // Show a temporary success message (you could use a toast library here)
      const button = document.activeElement as HTMLButtonElement;
      const originalText = button.textContent;
      button.textContent = '✓ Copied!';
      button.disabled = true;
      
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = `${idea.title}\n\n${idea.description}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  return (
    <Card className="p-6 border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-pink-50">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getTypeIcon(idea.type)}</span>
          <h3 className="font-semibold text-gray-900 flex-1">{idea.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(idea.difficulty)}`}>
            {idea.difficulty}
          </span>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            {idea.confidenceScore}/10
          </span>
        </div>
      </div>
      
      <p className="text-gray-600 mb-4">{idea.description}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">🎯 Target Audience</h4>
          <p className="text-sm text-gray-600">{idea.targetAudience}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">⏱️ Estimated Length</h4>
          <p className="text-sm text-gray-600">{idea.estimatedLength}</p>
        </div>
      </div>
      
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">📝 Key Points to Cover</h4>
        <ul className="space-y-1">
          {idea.keyPoints.map((point, index) => (
            <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
              <span className="text-purple-500 mt-1">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">🔍 SEO Keywords</h4>
        <div className="flex flex-wrap gap-2">
          {idea.seoKeywords.map((keyword, index) => (
            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
              {keyword}
            </span>
          ))}
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button 
          size="sm" 
          className="bg-purple-600 hover:bg-purple-700"
          onClick={handleUseForScript}
        >
          Use idea for script
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleCopyToClipboard}
        >
          Copy to clipboard
        </Button>
      </div>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-6">
          <div className="flex gap-4">
            <div className="w-32 h-20 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3"></div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function IdeaGenerationPage() {
  const { user, loading: authLoading } = useAuth();
  const { regionCode, loading: locationLoading } = useUserLocation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [aiIdeas, setAiIdeas] = useState<AIGeneratedIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState<number>(0);
  
  // New state for individual video ideas management
  const [videoIdeas, setVideoIdeas] = useState<Record<string, AIGeneratedIdea[]>>({});
  const [expandedVideos, setExpandedVideos] = useState<Record<string, boolean>>({});
  const [generatingVideos, setGeneratingVideos] = useState<Record<string, boolean>>({});

  // Load categories when region is detected
  useEffect(() => {
    if (regionCode && !locationLoading) {
      loadCategories();
    }
  }, [regionCode, locationLoading]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/categories?region=${regionCode}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load categories');
      }
      
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setError('Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = async (category: Category) => {
    setSelectedCategory(category);
    setTrendingTopics([]);
    setAiIdeas([]);
    setError(null);
    
    try {
      setLoading(true);
      const response = await fetch(
        `/api/trending-topics?category=${category.id}&region=${regionCode}&maxResults=10`
      );
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load trending topics');
      }
      
      setTrendingTopics(data.topics || []);
    } catch (error) {
      console.error('Failed to load trending topics:', error);
      setError('Failed to load trending topics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAI = async (topics: TrendingTopic[]) => {
    if (!user) return;
    
    const topic = topics[0]; // For individual video generation
    
    try {
      setGeneratingVideos(prev => ({ ...prev, [topic.id]: true }));
      setError(null);
      
      const response = await fetch('/api/ai-ideas/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videos: topics.map(topic => ({
            title: topic.title,
            description: topic.description,
            viewCount: topic.viewCount,
            likeCount: topic.engagement.likes.toString(),
            commentCount: topic.engagement.comments.toString(),
            category: selectedCategory?.title || 'General',
            tags: []
          })),
          userNiche: selectedCategory?.title,
          maxIdeas: 5
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          setError(`Insufficient credits. You need ${data.required} credits but only have ${data.available}.`);
        } else {
          throw new Error(data.error || 'Failed to generate AI ideas');
        }
        return;
      }

      // Store ideas for this specific video
      setVideoIdeas(prev => ({ ...prev, [topic.id]: data.ideas || [] }));
      setExpandedVideos(prev => ({ ...prev, [topic.id]: true }));
      setUserCredits(data.remainingCredits);
      
    } catch (error) {
      console.error('Failed to generate AI ideas:', error);
      setError('Failed to generate AI ideas. Please try again.');
    } finally {
      setGeneratingVideos(prev => ({ ...prev, [topic.id]: false }));
    }
  };

  const handleGenerateAIForAll = async () => {
    if (trendingTopics.length > 0) {
      await handleGenerateAI(trendingTopics.slice(0, 3)); // Use top 3 trending topics
    }
  };

  // Helper function to toggle video expansion
  const handleToggleExpansion = (videoId: string) => {
    setExpandedVideos(prev => ({
      ...prev,
      [videoId]: !prev[videoId]
    }));
  };

  // Load user credits
  useEffect(() => {
    if (user) {
      fetch('/api/credits')
        .then(res => res.json())
        .then(data => {
          // Extract the current balance from the credits object
          const credits = data.credits?.currentBalance || 0;
          setUserCredits(credits);
        })
        .catch(console.error);
    }
  }, [user]);

  if (authLoading || locationLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
            <div className="text-lg text-gray-600">Loading...</div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-lg text-gray-600 mb-4">Please log in to access idea generation.</div>
            <Link 
              href="/auth/login" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Go to Login
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Lightbulb className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Idea Generation</h1>
          </div>
          <p className="text-gray-600">
            Discover trending topics in your niche and generate content ideas
          </p>
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <Globe className="w-4 h-4" />
            <span>Showing trends for: {regionCode}</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Category Selection */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Select a Category
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {categories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    isSelected={selectedCategory?.id === category.id}
                    onClick={() => handleCategorySelect(category)}
                  />
                ))}
              </div>
            </div>

            {/* Trending Topics */}
            {selectedCategory && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Trending in {selectedCategory.title}
                  </h2>
                </div>

                {loading ? (
                  <LoadingSkeleton />
                ) : trendingTopics.length > 0 ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-gray-600">
                        Found {trendingTopics.length} trending videos
                      </div>
                      <Button 
                        onClick={handleGenerateAIForAll}
                        disabled={aiLoading}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      >
                        {aiLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            ✨ Generate AI Ideas for All (5 credits)
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {trendingTopics.map((topic) => (
                      <TopicCard 
                        key={topic.id} 
                        topic={topic} 
                        onGenerateAI={handleGenerateAI}
                        expandedIdeas={expandedVideos[topic.id] ? videoIdeas[topic.id] || null : null}
                        isGenerating={generatingVideos[topic.id] || false}
                        onToggleExpansion={() => handleToggleExpansion(topic.id)}
                        hasGeneratedIdeas={!!(videoIdeas[topic.id] && videoIdeas[topic.id].length > 0)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <p className="text-gray-600">
                      No trending topics found for this category. Try selecting a different category.
                    </p>
                  </Card>
                )}
              </div>
            )}

            {/* AI Generated Ideas */}
            {aiIdeas.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-2xl">✨</span>
                  <h2 className="text-xl font-semibold text-gray-900">
                    AI-Generated Content Ideas
                  </h2>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                    {aiIdeas.length} ideas
                  </span>
                </div>
                <div className="space-y-6">
                  {aiIdeas.map((idea, index) => (
                    <AIIdeaCard key={index} idea={idea} />
                  ))}
                </div>
              </div>
            )}

            {!selectedCategory && (
              <Card className="p-8 text-center">
                <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Ready to Generate Ideas?
                </h3>
                <p className="text-gray-600">
                  Select a category above to discover trending topics and get content ideas.
                </p>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Your Credits</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600 mb-2">{userCredits}</div>
                <div className="text-sm text-gray-600 mb-4">Credits remaining</div>
                <div className="text-xs text-gray-500">
                  AI idea generation costs 5 credits per request
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">How it Works</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="bg-indigo-100 text-indigo-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">1</span>
                  <span>Choose your content category</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-indigo-100 text-indigo-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">2</span>
                  <span>Browse trending topics</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-indigo-100 text-indigo-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">3</span>
                  <span>Get AI-generated content ideas</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-indigo-100 text-indigo-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">4</span>
                  <span>Save and create your content</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">AI Features</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>✨ Advanced content analysis</p>
                <p>🎯 Personalized recommendations</p>
                <p>📊 SEO keyword suggestions</p>
                <p>🎬 Content type variations</p>
                <p>📈 Engagement optimization</p>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Tips</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Look for videos with high engagement scores</p>
                <p>• Use AI ideas as inspiration, add your unique perspective</p>
                <p>• Consider trending topics in your niche</p>
                <p>• Check what's working for similar channels</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
