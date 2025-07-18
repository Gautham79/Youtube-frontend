import { Metadata } from "next";
import Navbar from "@/app/(site)/Navbar";
import PricingSection from "@/app/(site)/pricing";
import Footer from "@/app/(site)/Footer";

export const metadata: Metadata = {
  title: "Pricing - ReelForest | AI Video Creation Plans",
  description: "Choose the perfect plan for your AI video creation needs. From free starter plans to enterprise solutions for agencies and high-volume creators.",
};

export default function PricingPage() {
  return (
    <div className="bg-white">
      <Navbar />
      <div className="pt-20">
        <PricingSection />
      </div>
      <Footer />
    </div>
  );
}
