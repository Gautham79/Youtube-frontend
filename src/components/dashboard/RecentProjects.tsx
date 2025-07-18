"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Download, 
  Share2, 
  MoreHorizontal, 
  Clock,
  Eye,
  ThumbsUp
} from "lucide-react";

interface Project {
  id: string;
  title: string;
  status: 'completed' | 'in-progress' | 'draft';
  thumbnail: string;
  duration: string;
  views?: number;
  likes?: number;
  createdAt: string;
  currentStep?: string;
}

export default function RecentProjects() {
  // Mock data - in real app, this would come from API
  const projects: Project[] = [
    {
      id: '1',
      title: 'Tech Review: Latest iPhone Features',
      status: 'completed',
      thumbnail: '/api/placeholder/300/200',
      duration: '3:45',
      views: 1247,
      likes: 89,
      createdAt: '2 days ago'
    },
    {
      id: '2',
      title: 'How to Build a React App',
      status: 'in-progress',
      thumbnail: '/api/placeholder/300/200',
      duration: '5:20',
      createdAt: '1 day ago',
      currentStep: 'Scene Planning'
    },
    {
      id: '3',
      title: 'AI Tools for Productivity',
      status: 'completed',
      thumbnail: '/api/placeholder/300/200',
      duration: '4:12',
      views: 892,
      likes: 67,
      createdAt: '5 days ago'
    },
    {
      id: '4',
      title: 'Web Development Tips',
      status: 'draft',
      thumbnail: '/api/placeholder/300/200',
      duration: '2:30',
      createdAt: '1 week ago',
      currentStep: 'Script Creation'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': 
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in-progress': 
        return <Badge className="bg-orange-100 text-orange-800">In Progress</Badge>;
      case 'draft': 
        return <Badge variant="secondary">Draft</Badge>;
      default: 
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recent Projects</h2>
          <p className="text-gray-600">Continue working on your videos or start a new one</p>
        </div>
        <Button>
          View All Projects
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gray-200">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Play className="w-12 h-12 text-white opacity-80" />
              </div>
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {project.duration}
              </div>
              {project.status === 'in-progress' && (
                <div className="absolute top-2 left-2">
                  <Badge className="bg-orange-100 text-orange-800">
                    {project.currentStep}
                  </Badge>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 flex-1">
                  {project.title}
                </h3>
                <Button variant="ghost" size="sm" className="ml-2 p-1">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between mb-3">
                {getStatusBadge(project.status)}
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {project.createdAt}
                </div>
              </div>

              {/* Stats for completed videos */}
              {project.status === 'completed' && project.views && (
                <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
                  <div className="flex items-center">
                    <Eye className="w-3 h-3 mr-1" />
                    {project.views.toLocaleString()}
                  </div>
                  <div className="flex items-center">
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    {project.likes}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {project.status === 'completed' ? (
                  <>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Play className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Share2 className="w-3 h-3" />
                    </Button>
                  </>
                ) : (
                  <Button size="sm" className="flex-1">
                    <Play className="w-3 h-3 mr-1" />
                    Continue
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-600 mb-4">Create your first AI-powered video to get started</p>
          <Button>
            Create New Video
          </Button>
        </div>
      )}
    </div>
  );
}
