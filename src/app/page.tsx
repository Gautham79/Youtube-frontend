import { Metadata } from "next";
import CTA from "@/app/(site)/Cta";
import FeaturesSection from "@/app/(site)/FeaturesSection";
import HowItWorks from "@/app/(site)/HowItWorks";
import Footer from "@/app/(site)/Footer";
import HeroSection from "@/app/(site)/Hero";
import Navbar from "@/app/(site)/Navbar";

// required by Nextra
export const metadata: Metadata = {
  title: "ReelForest - Create Viral YouTube Videos with AI",
  description: "AI-powered video creation platform that automates the entire process from trending topics to published videos. No editing skills required.",
};

export default function Home() {
  return (
    <div className="bg-white">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorks />
      <CTA />
      <Footer />
    </div>
  );
}
