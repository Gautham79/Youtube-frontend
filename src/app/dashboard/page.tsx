"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import Navbar from "@/app/(site)/Navbar";
import Footer from "@/app/(site)/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  Lightbulb, 
  FileText, 
  Camera, 
  Music, 
  Video,
  Loader2
} from "lucide-react";

interface StepCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: 'active' | 'coming-soon';
  href: string;
  color: string;
}

function StepCard({ icon, title, description, status, href, color }: StepCardProps) {
  const isActive = status === 'active';
  
  const CardContent = (
    <Card className={`p-8 h-64 flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-lg ${
      isActive 
        ? 'cursor-pointer hover:scale-105 border-2 border-transparent hover:border-indigo-300' 
        : 'cursor-not-allowed opacity-75'
    }`}>
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${color}`}>
        {icon}
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
        {description}
      </p>
      
      <div className="mt-auto">
        {isActive ? (
          <Badge className="bg-green-100 text-green-800">
            Available
          </Badge>
        ) : (
          <Badge variant="secondary">
            Coming Soon
          </Badge>
        )}
      </div>
    </Card>
  );

  return isActive ? (
    <Link href={href} className="block">
      {CardContent}
    </Link>
  ) : (
    <div>
      {CardContent}
    </div>
  );
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [userCredits, setUserCredits] = useState<number>(0);
  const [creditsLoading, setCreditsLoading] = useState(true);

  // Load user credits
  useEffect(() => {
    if (user) {
      fetch('/api/credits')
        .then(res => res.json())
        .then(data => {
          const credits = data.credits?.currentBalance || 0;
          setUserCredits(credits);
        })
        .catch(console.error)
        .finally(() => setCreditsLoading(false));
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
            <div className="text-lg text-gray-600">Loading your dashboard...</div>
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
            <div className="text-lg text-gray-600 mb-4">Please log in to access the dashboard.</div>
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

  const automationSteps: StepCardProps[] = [
    {
      icon: <Lightbulb className="w-8 h-8 text-white" />,
      title: "Idea Generation",
      description: "Generate content ideas from trending videos and AI analysis",
      status: 'active',
      href: '/dashboard/idea-generation',
      color: 'bg-gradient-to-br from-yellow-400 to-orange-500'
    },
    {
      icon: <FileText className="w-8 h-8 text-white" />,
      title: "Script Generation",
      description: "Create engaging scripts with AI assistance and optimization",
      status: 'active',
      href: '/dashboard/script',
      color: 'bg-gradient-to-br from-blue-400 to-blue-600'
    },
    {
      icon: <Camera className="w-8 h-8 text-white" />,
      title: "Video Assets",
      description: "Generate images, scenes, and visual elements for your videos",
      status: 'coming-soon',
      href: '/dashboard/video-assets',
      color: 'bg-gradient-to-br from-purple-400 to-purple-600'
    },
    {
      icon: <Music className="w-8 h-8 text-white" />,
      title: "Audio Assets",
      description: "Create voiceovers, background music, and sound effects",
      status: 'coming-soon',
      href: '/dashboard/audio-assets',
      color: 'bg-gradient-to-br from-green-400 to-green-600'
    },
    {
      icon: <Video className="w-8 h-8 text-white" />,
      title: "Video Rendering",
      description: "Combine all assets into final video with editing and effects",
      status: 'coming-soon',
      href: '/dashboard/video-render',
      color: 'bg-gradient-to-br from-red-400 to-red-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                YouTube Automation Studio
              </h1>
              <p className="text-gray-600 mt-1">
                Create professional videos with AI-powered automation
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Available Credits</div>
                <div className="text-2xl font-bold text-indigo-600">
                  {creditsLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin inline" />
                  ) : (
                    userCredits
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome back, {user.user_metadata?.name || user.email}!
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose any step below to start creating your video. Each step works independently, 
            so you can jump in wherever you need to.
          </p>
        </div>

        {/* Automation Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {automationSteps.map((step, index) => (
            <StepCard
              key={index}
              icon={step.icon}
              title={step.title}
              description={step.description}
              status={step.status}
              href={step.href}
              color={step.color}
            />
          ))}
        </div>

        {/* Info Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              How It Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-indigo-600 font-bold">1</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Choose Your Step</h4>
                <p className="text-sm text-gray-600">
                  Start at any step in the automation process based on what you need
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-indigo-600 font-bold">2</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">AI-Powered Creation</h4>
                <p className="text-sm text-gray-600">
                  Let our AI analyze trends and generate high-quality content for you
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-indigo-600 font-bold">3</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Export & Use</h4>
                <p className="text-sm text-gray-600">
                  Download your content or continue to the next step in the pipeline
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-blue-600 text-sm">
              🚀 More automation steps coming soon! Currently building Video Assets, Audio Assets, and Video Rendering.
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
