"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  FileText, 
  Camera, 
  Music, 
  Video, 
  CheckCircle,
  ArrowRight,
  Play,
  Edit,
  Clock
} from "lucide-react";

interface WorkflowStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'in-progress' | 'pending';
  estimatedTime?: string;
  preview?: string;
}

export default function WorkflowPipeline() {
  const [workflowProgress, setWorkflowProgress] = useState<Record<number, string>>({});

  // Load workflow progress from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProgress = localStorage.getItem('workflow-progress');
      if (savedProgress) {
        try {
          setWorkflowProgress(JSON.parse(savedProgress));
        } catch (error) {
          console.error('Error parsing workflow progress:', error);
        }
      }
    }
  }, []);

  // Default step configuration
  const defaultSteps: WorkflowStep[] = [
    {
      id: 1,
      title: "Idea Generation",
      description: "AI-powered topic suggestions and content planning",
      icon: <Lightbulb className="w-6 h-6" />,
      status: 'pending',
      estimatedTime: "1 min"
    },
    {
      id: 2,
      title: "Script Creation",
      description: "Generate engaging scripts with AI assistance",
      icon: <FileText className="w-6 h-6" />,
      status: 'pending',
      estimatedTime: "2 min"
    },
    {
      id: 3,
      title: "Scene Planning",
      description: "Storyboard and visual scene breakdown",
      icon: <Camera className="w-6 h-6" />,
      status: 'pending',
      estimatedTime: "3 min"
    },
    {
      id: 4,
      title: "Audio Generation",
      description: "AI voice synthesis and background music",
      icon: <Music className="w-6 h-6" />,
      status: 'pending',
      estimatedTime: "4 min"
    },
    {
      id: 5,
      title: "Video Production",
      description: "Render scenes with AI-generated visuals",
      icon: <Video className="w-6 h-6" />,
      status: 'pending',
      estimatedTime: "8 min"
    },
    {
      id: 6,
      title: "Final Output",
      description: "Export, optimize and share your video",
      icon: <CheckCircle className="w-6 h-6" />,
      status: 'pending',
      estimatedTime: "1 min"
    }
  ];

  // Apply saved progress to steps
  const steps: WorkflowStep[] = defaultSteps.map(step => ({
    ...step,
    status: (workflowProgress[step.id] as 'completed' | 'in-progress' | 'pending') || step.status
  }));

  // Calculate progress
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const progressPercentage = Math.round((completedSteps / steps.length) * 100);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-orange-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in-progress': return <Badge className="bg-orange-100 text-orange-800">In Progress</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          AI Video Creation Workflow
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Transform your ideas into professional videos with our AI-powered pipeline. 
          Each step is optimized for quality and speed.
        </p>
      </div>

      {/* Desktop Pipeline View */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${getStatusColor(step.status)}`}>
                  {step.status === 'completed' ? <CheckCircle className="w-6 h-6" /> : step.icon}
                </div>
                <div className="mt-2 text-center">
                  <p className="text-sm font-medium text-gray-900">{step.title}</p>
                  {step.estimatedTime && (
                    <p className="text-xs text-gray-500 flex items-center justify-center mt-1">
                      <Clock className="w-3 h-3 mr-1" />
                      {step.estimatedTime}
                    </p>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="w-6 h-6 text-gray-400 mx-4" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {steps.map((step) => (
          <Card key={step.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${getStatusColor(step.status)}`}>
                {step.status === 'completed' ? <CheckCircle className="w-5 h-5" /> : step.icon}
              </div>
              {getStatusBadge(step.status)}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {step.title}
            </h3>
            
            <p className="text-gray-600 text-sm mb-4">
              {step.description}
            </p>

            {step.preview && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 mb-1">Preview:</p>
                <p className="text-sm text-gray-700 italic">"{step.preview}"</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              {step.estimatedTime && (
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  {step.estimatedTime}
                </div>
              )}
              
              <div className="flex gap-2">
                {step.status === 'completed' && (
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
                {step.status === 'in-progress' && (
                  <Button size="sm">
                    <Play className="w-4 h-4 mr-1" />
                    Continue
                  </Button>
                )}
                {step.status === 'pending' && (
                  <Button variant="outline" size="sm" disabled>
                    Waiting
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm text-gray-500">{completedSteps} of {steps.length} steps completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
        </div>
      </div>
    </div>
  );
}
