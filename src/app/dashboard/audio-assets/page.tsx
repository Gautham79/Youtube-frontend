"use client";

import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/app/(site)/Navbar";
import Footer from "@/app/(site)/Footer";
import Link from "next/link";
import { ArrowLeft, Music, Sparkles, Mic, Volume2, Headphones } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AudioAssetsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
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
            <div className="text-lg text-gray-600 mb-4">Please log in to access audio assets generation.</div>
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
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Music className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Audio Assets</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            AI-generated voiceovers, background music, and sound effects
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="max-w-4xl mx-auto">
          <Card className="p-12 text-center border-2 border-dashed border-gray-300">
            <div className="mb-8">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Coming Soon!</h2>
              <p className="text-lg text-gray-600 mb-8">
                We're creating a comprehensive AI audio generation system that will produce 
                professional-quality voiceovers, background music, and sound effects for your videos.
              </p>
            </div>

            {/* Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Mic className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">AI Voice Synthesis</h3>
                <p className="text-sm text-gray-600">
                  Generate natural-sounding voiceovers from your scripts with multiple voice options
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Volume2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Background Music</h3>
                <p className="text-sm text-gray-600">
                  Create custom background music that matches your video's mood and pacing
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Headphones className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Sound Effects</h3>
                <p className="text-sm text-gray-600">
                  Add professional sound effects and audio transitions to enhance engagement
                </p>
              </div>
            </div>

            {/* Planned Features */}
            <div className="bg-gray-50 rounded-lg p-8 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Planned Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Multiple voice personalities</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Emotion and tone control</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Custom music generation</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Royalty-free audio library</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Audio mixing and mastering</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Multi-language support</span>
                </div>
              </div>
            </div>

            {/* Technology Preview */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-8 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Powered by Leading AI</h3>
              <p className="text-gray-600 mb-4">
                Our audio generation will integrate with top AI audio platforms:
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <span className="px-3 py-1 bg-white rounded-full text-sm text-green-700 border border-green-200">
                  ElevenLabs
                </span>
                <span className="px-3 py-1 bg-white rounded-full text-sm text-green-700 border border-green-200">
                  Murf AI
                </span>
                <span className="px-3 py-1 bg-white rounded-full text-sm text-green-700 border border-green-200">
                  Speechify
                </span>
                <span className="px-3 py-1 bg-white rounded-full text-sm text-green-700 border border-green-200">
                  AIVA Music
                </span>
              </div>
            </div>

            {/* Audio Quality Preview */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-8 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Professional Quality</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-2">48kHz</div>
                  <div className="text-sm text-gray-600">Sample Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-2">24-bit</div>
                  <div className="text-sm text-gray-600">Audio Depth</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-2">Studio</div>
                  <div className="text-sm text-gray-600">Quality</div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-4">
              <p className="text-gray-600">
                Want to be notified when Audio Assets launches?
              </p>
              <Button className="bg-green-600 hover:bg-green-700">
                Get Notified
              </Button>
            </div>
          </Card>
        </div>

        {/* Navigation */}
        <div className="mt-12 text-center">
          <Link href="/dashboard">
            <Button variant="outline" className="mr-4">
              Back to Dashboard
            </Button>
          </Link>
          <Link href="/dashboard/idea-generation">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              Try Idea Generation
            </Button>
          </Link>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
