import { Metadata } from "next";
import Navbar from "@/app/(site)/Navbar";
import Footer from "@/app/(site)/Footer";
import { Mail, MessageCircle, Clock, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Support - ReelForest | Help Center & Contact",
  description: "Get help with ReelForest. Find answers to frequently asked questions or contact our support team for assistance with AI video creation.",
};

export default function SupportPage() {
  return (
    <div className="bg-white">
      <Navbar />
      <div className="pt-20">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <HelpCircle className="w-16 h-16 text-indigo-600 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              How can we help you?
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find answers to common questions or get in touch with our support team
            </p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-lg text-gray-600">
                Our support team is here to help you succeed with ReelForest
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Email Support */}
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <Mail className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Email Support</h3>
                <p className="text-gray-600 mb-4">
                  Send us an email and we'll get back to you within 24 hours
                </p>
                <a 
                  href="mailto:support@reelforest.com"
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  support@reelforest.com
                </a>
              </div>

              {/* Live Chat */}
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <MessageCircle className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Live Chat</h3>
                <p className="text-gray-600 mb-4">
                  Chat with our support team in real-time
                </p>
                <button className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Start Chat
                </button>
              </div>

              {/* Response Time */}
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <Clock className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Response Time</h3>
                <p className="text-gray-600 mb-4">
                  We typically respond within
                </p>
                <span className="text-indigo-600 font-medium text-lg">2-4 hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
              <p className="text-lg text-gray-600">
                Quick answers to common questions about ReelForest
              </p>
            </div>

            <div className="space-y-8">
              {/* FAQ Item 1 */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  How does ReelForest create videos?
                </h3>
                <p className="text-gray-600">
                  ReelForest uses advanced AI to analyze trending topics, generate scripts, create scenes, 
                  produce visuals, and add narration automatically. Simply choose your topic and our AI 
                  handles the entire video creation process from start to finish.
                </p>
              </div>

              {/* FAQ Item 2 */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  What video formats can I export?
                </h3>
                <p className="text-gray-600">
                  You can export your videos in multiple formats including MP4, MOV, and AVI. We also 
                  provide platform-optimized exports for YouTube, Instagram, TikTok, and other social 
                  media platforms with the correct aspect ratios and quality settings.
                </p>
              </div>

              {/* FAQ Item 3 */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Can I customize the AI-generated content?
                </h3>
                <p className="text-gray-600">
                  Yes! While our AI creates the initial content, you can edit scripts, swap visuals, 
                  change voiceovers, adjust timing, and customize every aspect of your video to match 
                  your brand and style preferences.
                </p>
              </div>

              {/* FAQ Item 4 */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  How long does it take to create a video?
                </h3>
                <p className="text-gray-600">
                  Most videos are generated within 3-5 minutes. The exact time depends on video length, 
                  complexity, and current server load. You'll receive a notification when your video 
                  is ready for review and download.
                </p>
              </div>

              {/* FAQ Item 5 */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  What languages are supported?
                </h3>
                <p className="text-gray-600">
                  ReelForest supports over 50 languages for both script generation and voiceovers. 
                  You can create content in your preferred language or translate existing content 
                  to reach global audiences.
                </p>
              </div>

              {/* FAQ Item 6 */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Can I cancel my subscription anytime?
                </h3>
                <p className="text-gray-600">
                  Yes, you can cancel your subscription at any time from your account settings. 
                  Your subscription will remain active until the end of your current billing period, 
                  and you'll retain access to all features until then.
                </p>
              </div>

              {/* FAQ Item 7 */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Do you offer refunds?
                </h3>
                <p className="text-gray-600">
                  We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied 
                  with ReelForest within the first 30 days, contact our support team for a full refund.
                </p>
              </div>

              {/* FAQ Item 8 */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Is there a setup fee?
                </h3>
                <p className="text-gray-600">
                  No, there are no setup fees or hidden costs. You only pay for your chosen subscription 
                  plan. The free Starter plan is completely free forever with no setup required.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-16 bg-indigo-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Still have questions?
            </h2>
            <p className="text-xl text-indigo-100 mb-8">
              Our support team is ready to help you get the most out of ReelForest
            </p>
            <a
              href="mailto:support@reelforest.com"
              className="inline-flex items-center px-6 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Mail className="w-5 h-5 mr-2" />
              Contact Support
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
