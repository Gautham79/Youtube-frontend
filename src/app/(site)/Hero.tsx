import Link from "next/link";
import { Play, Sparkles, TrendingUp, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 pt-16 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Trust Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4 mr-2" />
            Join 10,000+ creators using AI to grow their channels
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Create Viral{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              YouTube Videos
            </span>
            <br />
            with AI
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            From trending topics to published videos in minutes. Our AI handles script generation, 
            scene creation, voiceovers, and editing — no video skills required.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/auth/register">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Creating Now
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button 
                variant="outline" 
                size="lg" 
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg font-semibold"
              >
                See How It Works
              </Button>
            </Link>
          </div>

          {/* Key Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="flex items-center justify-center space-x-3 text-gray-600">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <span className="font-medium">Trending Topics</span>
            </div>
            <div className="flex items-center justify-center space-x-3 text-gray-600">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <span className="font-medium">AI-Generated Content</span>
            </div>
            <div className="flex items-center justify-center space-x-3 text-gray-600">
              <Globe className="w-5 h-5 text-purple-500" />
              <span className="font-medium">Multi-Language Support</span>
            </div>
          </div>

          {/* Social Proof */}
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex -space-x-2">
                {[
                  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face&auto=format",
                  "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face&auto=format",
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face&auto=format",
                  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face&auto=format",
                  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face&auto=format",
                ].map((avatar, index) => (
                  <img
                    key={index}
                    src={avatar}
                    alt={`Creator ${index + 1}`}
                    className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                  />
                ))}
              </div>
              <div className="text-left">
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className="w-4 h-4 text-yellow-400 fill-current"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">4.9/5</span> from 2,500+ creators
                </p>
              </div>
            </div>
          </div>

          {/* Video Preview Placeholder */}
          <div className="mt-16 relative">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl shadow-2xl overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
                <div className="text-center text-white">
                  <Play className="w-16 h-16 mx-auto mb-4 opacity-80" />
                  <p className="text-lg font-medium">Watch ReelForest in Action</p>
                  <p className="text-sm opacity-75">See how AI creates viral videos in minutes</p>
                </div>
              </div>
            </div>
            {/* Floating elements */}
            <div className="absolute -top-4 -left-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
              ✨ AI Powered
            </div>
            <div className="absolute -top-4 -right-4 bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
              🚀 No Editing
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
