"use client";

import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/app/(site)/Navbar";
import Footer from "@/app/(site)/Footer";
import Link from "next/link";
import { ArrowLeft, Video, Sparkles, Film, Settings, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function VideoRenderPage() {
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
            <div className="text-lg text-gray-600 mb-4">Please log in to access video rendering.</div>
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
          <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Video className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Video Rendering</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Combine all assets into professional YouTube videos with AI-powered editing
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="max-w-4xl mx-auto">
          <Card className="p-12 text-center border-2 border-dashed border-gray-300">
            <div className="mb-8">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-12 h-12 text-red-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Coming Soon!</h2>
              <p className="text-lg text-gray-600 mb-8">
                We're building an advanced video rendering engine that will automatically combine 
                your scripts, visuals, and audio into polished, ready-to-upload YouTube videos.
              </p>
            </div>

            {/* Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Film className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Automated Editing</h3>
                <p className="text-sm text-gray-600">
                  AI-powered video editing that syncs visuals with audio and optimizes pacing
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-red-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Custom Templates</h3>
                <p className="text-sm text-gray-600">
                  Choose from various video styles and templates optimized for YouTube
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-red-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Download className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Multiple Formats</h3>
                <p className="text-sm text-gray-600">
                  Export in various resolutions and formats optimized for different platforms
                </p>
              </div>
            </div>

            {/* Planned Features */}
            <div className="bg-gray-50 rounded-lg p-8 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Planned Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Automatic scene transitions</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Text overlays and captions</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Brand logo integration</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Intro and outro templates</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Color grading and filters</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">YouTube-optimized exports</span>
                </div>
              </div>
            </div>

            {/* Video Quality Options */}
            <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-8 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Export Quality Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600 mb-2">720p HD</div>
                  <div className="text-sm text-gray-600">Standard Quality</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600 mb-2">1080p FHD</div>
                  <div className="text-sm text-gray-600">High Quality</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600 mb-2">4K UHD</div>
                  <div className="text-sm text-gray-600">Ultra Quality</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600 mb-2">8K</div>
                  <div className="text-sm text-gray-600">Premium Quality</div>
                </div>
              </div>
            </div>

            {/* Technology Stack */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-8 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Powered by Professional Tools</h3>
              <p className="text-gray-600 mb-4">
                Our rendering engine will utilize industry-standard technologies:
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <span className="px-3 py-1 bg-white rounded-full text-sm text-red-700 border border-red-200">
                  FFmpeg
                </span>
                <span className="px-3 py-1 bg-white rounded-full text-sm text-red-700 border border-red-200">
                  WebGL
                </span>
                <span className="px-3 py-1 bg-white rounded-full text-sm text-red-700 border border-red-200">
                  GPU Acceleration
                </span>
                <span className="px-3 py-1 bg-white rounded-full text-sm text-red-700 border border-red-200">
                  Cloud Rendering
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-4">
              <p className="text-gray-600">
                Want to be notified when Video Rendering launches?
              </p>
              <Button className="bg-red-600 hover:bg-red-700">
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
