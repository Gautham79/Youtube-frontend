"use client";

import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/app/(site)/Navbar";
import Footer from "@/app/(site)/Footer";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import WorkflowPipeline from "@/components/dashboard/WorkflowPipeline";
import RecentProjects from "@/components/dashboard/RecentProjects";
import QuickActions from "@/components/dashboard/QuickActions";

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
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
            <a 
              href="/auth/login" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Go to Login
            </a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Dashboard Header with Stats */}
      <DashboardHeader user={user} />
      
      {/* Main Content */}
      <div className="bg-white">
        {/* Workflow Pipeline */}
        <WorkflowPipeline />
        
        {/* Recent Projects */}
        <div className="border-t border-gray-200">
          <RecentProjects />
        </div>
        
        {/* Quick Actions */}
        <div className="border-t border-gray-200">
          <QuickActions />
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
