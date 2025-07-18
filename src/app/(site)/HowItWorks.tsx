import { ArrowRight, Lightbulb, Wand2, Download } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      step: "01",
      icon: Lightbulb,
      title: "Choose Your Topic",
      description: "Select from AI-suggested trending topics or enter your own idea. Our algorithm analyzes what's viral right now.",
      features: ["Trending topic suggestions", "Niche-specific ideas", "Viral potential scoring"]
    },
    {
      step: "02", 
      icon: Wand2,
      title: "AI Creates Everything",
      description: "Watch as our AI generates your script, creates scenes, produces visuals, and adds narration - all automatically.",
      features: ["Script generation", "Scene breakdown", "AI-generated visuals", "Voice narration"]
    },
    {
      step: "03",
      icon: Download,
      title: "Download & Publish",
      description: "Your video is ready! Download in any format and publish directly to YouTube, Instagram, TikTok, or any platform.",
      features: ["Multiple export formats", "Platform optimization", "Subtitle files included", "Thumbnail generation"]
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-gradient-to-br from-gray-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            From Idea to Video in{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              3 Simple Steps
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our AI-powered workflow makes video creation effortless. No technical skills, 
            no editing software, no hours of work - just great content.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-200 via-purple-200 to-indigo-200 transform -translate-y-1/2 z-0"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 relative z-10">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Step Card */}
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                  {/* Step Number */}
                  <div className="absolute -top-4 left-8">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                      {step.step}
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                    <step.icon className="w-8 h-8 text-indigo-600" />
                  </div>

                  {/* Content */}
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      {step.description}
                    </p>

                    {/* Features List */}
                    <div className="space-y-2">
                      {step.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center justify-center text-sm text-gray-500">
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mr-2"></div>
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Arrow (Desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-20">
                    <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-100">
                      <ArrowRight className="w-5 h-5 text-indigo-600" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Create Your First Video?
            </h3>
            <p className="text-gray-600 mb-6">
              Join thousands of creators who are already using AI to grow their channels and reach millions of viewers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/auth/register"
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Start Creating Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
              <a 
                href="#pricing"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl transition-all duration-300"
              >
                View Pricing
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
