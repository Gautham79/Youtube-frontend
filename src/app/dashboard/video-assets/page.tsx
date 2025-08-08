"use client";

import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/app/(site)/Navbar";
import Footer from "@/app/(site)/Footer";
import Link from "next/link";
import { ArrowLeft, Camera, Sparkles, Image, Palette, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function VideoAssetsPage() {
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
            <div className="text-lg text-gray-600 mb-4">Please log in to access video assets generation.</div>
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
          <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Camera className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Video Assets</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            AI-generated images, scenes, and visual elements for your videos
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="max-w-4xl mx-auto">
          <Card className="p-12 text-center border-2 border-dashed border-gray-300">
            <div className="mb-8">
              <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-12 h-12 text-purple-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Coming Soon!</h2>
              <p className="text-lg text-gray-600 mb-8">
                We're developing a powerful AI-driven visual asset generation system that will create 
                stunning images, backgrounds, and visual elements for your YouTube videos.
              </p>
            </div>

            {/* Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Image className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">AI Image Generation</h3>
                <p className="text-sm text-gray-600">
                  Create custom images, illustrations, and graphics based on your script content
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Palette className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Style Consistency</h3>
                <p className="text-sm text-gray-600">
                  Maintain visual consistency across all assets with customizable style presets
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Batch Generation</h3>
                <p className="text-sm text-gray-600">
                  Generate multiple variations and scenes in one go for efficient workflow
                </p>
              </div>
            </div>

            {/* Planned Features */}
            <div className="bg-gray-50 rounded-lg p-8 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Planned Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Custom thumbnail generation</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Background scene creation</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Character and object generation</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Logo and branding integration</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Multiple art styles and formats</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">High-resolution exports</span>
                </div>
              </div>
            </div>

            {/* Technology Preview */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-8 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Powered by Advanced AI</h3>
              <p className="text-gray-600 mb-4">
                Our video assets generation will leverage cutting-edge AI models including:
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <span className="px-3 py-1 bg-white rounded-full text-sm text-purple-700 border border-purple-200">
                  DALL-E 3
                </span>
                <span className="px-3 py-1 bg-white rounded-full text-sm text-purple-700 border border-purple-200">
                  Midjourney
                </span>
                <span className="px-3 py-1 bg-white rounded-full text-sm text-purple-700 border border-purple-200">
                  Stable Diffusion
                </span>
                <span className="px-3 py-1 bg-white rounded-full text-sm text-purple-700 border border-purple-200">
                  Custom Models
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-4">
              <p className="text-gray-600">
                Want to be notified when Video Assets launches?
              </p>
              <Button className="bg-purple-600 hover:bg-purple-700">
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
