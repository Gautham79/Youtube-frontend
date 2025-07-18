"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Layout, 
  Upload, 
  Settings, 
  CreditCard, 
  HelpCircle,
  TrendingUp,
  Sparkles
} from "lucide-react";

export default function QuickActions() {
  const quickActions = [
    {
      title: "Create New Video",
      description: "Start from scratch with AI assistance",
      icon: <Plus className="w-5 h-5" />,
      color: "bg-gradient-to-r from-indigo-600 to-purple-600",
      textColor: "text-white"
    },
    {
      title: "Browse Templates",
      description: "Choose from pre-made video templates",
      icon: <Layout className="w-5 h-5" />,
      color: "bg-blue-50",
      textColor: "text-blue-700"
    },
    {
      title: "Upload Content",
      description: "Import your own media files",
      icon: <Upload className="w-5 h-5" />,
      color: "bg-green-50",
      textColor: "text-green-700"
    }
  ];

  const trendingTopics = [
    "AI Technology Review",
    "React Tutorial Series",
    "Productivity Tips",
    "Web Development",
    "Tech News Update"
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Quick Actions */}
        <div className="lg:col-span-3">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <Card key={index} className={`p-6 cursor-pointer hover:shadow-lg transition-all ${action.color}`}>
                <div className={`${action.textColor}`}>
                  <div className="mb-4">
                    {action.icon}
                  </div>
                  <h3 className="font-semibold mb-2">{action.title}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Trending Topics */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <TrendingUp className="w-5 h-5 text-orange-500 mr-2" />
              <h3 className="font-semibold text-gray-900">Trending Topics</h3>
            </div>
            <div className="space-y-2">
              {trendingTopics.map((topic, index) => (
                <button
                  key={index}
                  className="w-full text-left p-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                >
                  {topic}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              View All Topics
            </Button>
          </Card>

          {/* AI Suggestions */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Sparkles className="w-5 h-5 text-purple-500 mr-2" />
              <h3 className="font-semibold text-gray-900">AI Suggestions</h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-800 font-medium">
                  "10 JavaScript Tips for Beginners"
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  Based on your previous videos
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">
                  "React Hooks Explained"
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Trending in your niche
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              Get More Ideas
            </Button>
          </Card>

          {/* Account Actions */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Account</h3>
            <div className="space-y-2">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <CreditCard className="w-4 h-4 mr-2" />
                Billing
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <HelpCircle className="w-4 h-4 mr-2" />
                Help & Support
              </Button>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
