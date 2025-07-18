import { 
  TrendingUp, 
  PenTool, 
  Camera, 
  Image, 
  Mic, 
  Globe, 
  Zap, 
  Clock,
  Target,
  Sparkles,
  Download,
  Share2
} from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: TrendingUp,
      title: "Trending Topic Discovery",
      description: "AI analyzes viral content across platforms to suggest trending topics that will maximize your video's reach and engagement.",
      color: "text-emerald-500",
      bgColor: "bg-emerald-50"
    },
    {
      icon: PenTool,
      title: "AI Script Generation",
      description: "Generate compelling, engaging scripts tailored to your niche. Our AI understands what makes content viral and hooks viewers.",
      color: "text-blue-500",
      bgColor: "bg-blue-50"
    },
    {
      icon: Camera,
      title: "Automated Scene Creation",
      description: "Break down your script into perfectly timed scenes with visual cues, transitions, and pacing optimized for viewer retention.",
      color: "text-purple-500",
      bgColor: "bg-purple-50"
    },
    {
      icon: Image,
      title: "AI Image Generation",
      description: "Create stunning, high-quality visuals for every scene using advanced AI. No stock photos needed - every image is unique.",
      color: "text-pink-500",
      bgColor: "bg-pink-50"
    },
    {
      icon: Mic,
      title: "Voice Narration & Subtitles",
      description: "Choose from natural-sounding AI voices or upload your own. Automatic subtitle generation in multiple languages included.",
      color: "text-indigo-500",
      bgColor: "bg-indigo-50"
    },
    {
      icon: Globe,
      title: "Multi-Language Support",
      description: "Reach global audiences with automatic translation and localization. Create the same video in 50+ languages instantly.",
      color: "text-green-500",
      bgColor: "bg-green-50"
    }
  ];

  const benefits = [
    {
      icon: Clock,
      title: "Save 10+ Hours Per Video",
      description: "What used to take days now takes minutes"
    },
    {
      icon: Target,
      title: "Viral-Ready Content",
      description: "AI-optimized for maximum engagement"
    },
    {
      icon: Sparkles,
      title: "No Editing Skills Required",
      description: "Professional results without the learning curve"
    },
    {
      icon: Download,
      title: "Ready to Publish",
      description: "Export in any format for any platform"
    }
  ];

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Create{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Viral Content
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our AI-powered platform handles every aspect of video creation, from ideation to publication. 
            Focus on growing your channel while we handle the heavy lifting.
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300"
            >
              <div className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Benefits Section */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-8 lg:p-12">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Why Creators Choose ReelForest
            </h3>
            <p className="text-lg text-gray-600">
              Join thousands of creators who've transformed their content strategy with AI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-8 h-8 text-indigo-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {benefit.title}
                </h4>
                <p className="text-gray-600">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">50M+</div>
            <div className="text-gray-600">Views Generated</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">10K+</div>
            <div className="text-gray-600">Active Creators</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">100K+</div>
            <div className="text-gray-600">Videos Created</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">50+</div>
            <div className="text-gray-600">Languages</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
