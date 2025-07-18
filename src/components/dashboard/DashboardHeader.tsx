"use client";

import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Video, Eye, Zap } from "lucide-react";

interface DashboardHeaderProps {
  user: User;
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  
  // Mock data - in real app, this would come from API
  const stats = {
    videosCreated: 12,
    totalViews: 2847,
    creditsRemaining: 85
  };

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="mb-6 lg:mb-0">
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {userName}! 👋
            </h1>
            <p className="text-indigo-100 text-lg">
              Ready to create amazing videos with AI?
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg" 
              className="bg-white text-indigo-600 hover:bg-gray-50 font-semibold"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Video
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white p-4">
            <div className="flex items-center">
              <Video className="w-8 h-8 text-indigo-200 mr-3" />
              <div>
                <p className="text-indigo-100 text-sm">Videos Created</p>
                <p className="text-2xl font-bold">{stats.videosCreated}</p>
              </div>
            </div>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white p-4">
            <div className="flex items-center">
              <Eye className="w-8 h-8 text-indigo-200 mr-3" />
              <div>
                <p className="text-indigo-100 text-sm">Total Views</p>
                <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white p-4">
            <div className="flex items-center">
              <Zap className="w-8 h-8 text-indigo-200 mr-3" />
              <div>
                <p className="text-indigo-100 text-sm">Credits Remaining</p>
                <p className="text-2xl font-bold">{stats.creditsRemaining}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
