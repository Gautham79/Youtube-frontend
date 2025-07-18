"use client";

import Link from "next/link";
import { Check, Zap, Crown, Infinity, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SmartCheckout from "@/components/SmartCheckout";
import { useState, useEffect } from "react";

interface Plan {
  id: string;
  name: string;
  description: string;
  priceUSD: number;
  priceINR: number;
  interval: 'month' | 'year';
  monthlyCredits: number;
  exportQuality: string;
  isPopular: boolean;
  credits: {
    idea: number;
    script: number;
    audio: number;
    image: number;
    video: number;
    thumbnail: number;
    metadata: number;
  };
  features: string[];
}

const PricingSection = () => {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('year');
  const [currency, setCurrency] = useState<'USD' | 'INR'>('INR');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/plans');
        const data = await response.json();
        
        if (data.success) {
          // Filter plans based on billing interval and exclude free plan
          const filteredPlans = data.plans
            .filter((plan: any) => plan.interval === billingInterval && plan.id !== 'free')
            .map((plan: any) => ({
              id: plan.id,
              name: plan.name,
              description: plan.description,
              priceUSD: plan.priceUSD,
              priceINR: plan.priceINR,
              interval: plan.interval,
              monthlyCredits: plan.monthlyCredits,
              exportQuality: plan.exportQuality,
              isPopular: plan.isPopular,
              credits: plan.credits,
              features: plan.features
            }));
          setPlans(filteredPlans);
        } else {
          setError('Failed to fetch plans');
        }
      } catch (err) {
        setError('Error loading plans');
        console.error('Error fetching plans:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [billingInterval]);

  // Group plans by tier for display
  const planTiers = [
    { tier: 'basic', icon: Zap, color: "border-blue-200", gradientFrom: "from-blue-500", gradientTo: "to-cyan-500" },
    { tier: 'pro', icon: Crown, color: "border-purple-200", gradientFrom: "from-purple-500", gradientTo: "to-pink-500" },
    { tier: 'enterprise', icon: Infinity, color: "border-amber-200", gradientFrom: "from-amber-500", gradientTo: "to-orange-500" }
  ];

  const getPlanDisplay = (planId: string) => {
    const plan = plans.find(p => p.id.includes(planId));
    if (!plan) return null;
    
    const tierConfig = planTiers.find(t => plan.id.includes(t.tier));
    return { ...plan, ...tierConfig };
  };

  if (loading) {
    return (
      <section id="pricing" className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            <span className="ml-2 text-lg">Loading pricing plans...</span>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="pricing" className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-red-400 text-lg">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  const formatPrice = (usd: number, inr: number) => {
    if (currency === 'USD') {
      return `$${usd}`;
    } else {
      return `₹${inr.toLocaleString('en-IN')}`;
    }
  };

  return (
    <section id="pricing" className="py-20 bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-amber-500/20 text-amber-300 rounded-full text-sm font-medium mb-6">
            💳 Credit-Based Pricing
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Create Videos with{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Smart Credits
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            Pay only for what you use. Each action costs credits, giving you complete control over your spending.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex items-center bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setBillingInterval('month')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  billingInterval === 'month'
                    ? 'bg-white text-gray-900'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('year')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  billingInterval === 'year'
                    ? 'bg-white text-gray-900'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Yearly
              </button>
            </div>
            
            {/* Currency Toggle */}
            <div className="flex items-center bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setCurrency('USD')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  currency === 'USD'
                    ? 'bg-white text-gray-900'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                USD
              </button>
              <button
                onClick={() => setCurrency('INR')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  currency === 'INR'
                    ? 'bg-white text-gray-900'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                INR
              </button>
            </div>
          </div>

        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {['basic', 'pro', 'enterprise'].map((tier) => {
            const planDisplay = getPlanDisplay(tier);
            if (!planDisplay) return null;

            return (
              <div 
                key={planDisplay.id} 
                className={`relative bg-gray-800 rounded-2xl p-8 ${planDisplay.color} border-2 ${
                  planDisplay.isPopular ? 'scale-105 shadow-2xl' : 'shadow-lg'
                } transition-all duration-300 hover:shadow-xl`}
              >
                {/* Popular Badge */}
                {planDisplay.isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className={`bg-gradient-to-r ${planDisplay.gradientFrom} ${planDisplay.gradientTo} text-white px-4 py-2 rounded-full text-sm font-semibold`}>
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-8">
                  <div className={`w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center bg-gradient-to-r ${planDisplay.gradientFrom} ${planDisplay.gradientTo}`}>
                    {planDisplay.icon && <planDisplay.icon className="w-6 h-6 text-white" />}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{planDisplay.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">
                      {formatPrice(planDisplay.priceUSD, planDisplay.priceINR)}
                    </span>
                    <span className="text-gray-400 ml-2">
                      /{billingInterval === 'month' ? 'month' : 'year'}
                    </span>
                  </div>
                  <p className="text-gray-400 mb-4">{planDisplay.description}</p>
                  
                  {/* Credits Display */}
                  <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CreditCard className="w-4 h-4 text-amber-400" />
                      <span className="text-lg font-semibold text-amber-400">
                        {planDisplay.monthlyCredits.toLocaleString()} credits/month
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      Export Quality: {planDisplay.exportQuality}
                    </div>
                  </div>
                </div>

                {/* Credit Costs */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">Credit Costs per Action:</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Idea:</span>
                      <span className="text-white">{planDisplay.credits.idea} credit</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Script:</span>
                      <span className="text-white">{planDisplay.credits.script} credits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Audio:</span>
                      <span className="text-white">{planDisplay.credits.audio} credits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Image:</span>
                      <span className="text-white">{planDisplay.credits.image} credits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Video:</span>
                      <span className="text-white">{planDisplay.credits.video} credits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Thumbnail:</span>
                      <span className="text-white">{planDisplay.credits.thumbnail} credits</span>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-emerald-400 mr-3 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{planDisplay.monthlyCredits.toLocaleString()} credits per month</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-emerald-400 mr-3 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{planDisplay.exportQuality} export quality</span>
                  </li>
                  {!planDisplay.id.includes('basic') && (
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-emerald-400 mr-3 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">Priority support</span>
                    </li>
                  )}
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-emerald-400 mr-3 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">All core features</span>
                  </li>
                </ul>

                {/* CTA Button */}
                <SmartCheckout
                  planId={planDisplay.id}
                  planName={planDisplay.name}
                  priceUSD={planDisplay.priceUSD}
                  priceINR={planDisplay.priceINR}
                  currency={currency}
                  className={`w-full py-3 font-semibold transition-all duration-300 ${
                    planDisplay.isPopular 
                      ? `bg-gradient-to-r ${planDisplay.gradientFrom} ${planDisplay.gradientTo} hover:opacity-90 text-white` 
                      : 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Credit System Explanation */}
        <div className="bg-gray-800 rounded-2xl p-8 mb-16">
          <h3 className="text-2xl font-bold text-center mb-6">How Credits Work</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold mb-2">Pay Per Use</h4>
              <p className="text-gray-400 text-sm">Only spend credits when you create content. No waste, complete control.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Infinity className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold mb-2">Monthly Refresh</h4>
              <p className="text-gray-400 text-sm">Credits refresh every billing cycle. Unused credits carry over when you upgrade.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold mb-2">Upgrade Anytime</h4>
              <p className="text-gray-400 text-sm">Upgrade your plan anytime. Remaining credits transfer to your new plan.</p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-6">Frequently Asked Questions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="text-left">
              <h4 className="font-semibold mb-2">What happens to unused credits?</h4>
              <p className="text-gray-400 text-sm">Unused credits carry over when you upgrade plans. They refresh monthly on your billing cycle.</p>
            </div>
            <div className="text-left">
              <h4 className="font-semibold mb-2">Can I change plans anytime?</h4>
              <p className="text-gray-400 text-sm">Yes! Upgrade anytime and your remaining credits will transfer. Billing date updates to current date.</p>
            </div>
            <div className="text-left">
              <h4 className="font-semibold mb-2">How do credit costs work?</h4>
              <p className="text-gray-400 text-sm">Each action (idea, script, video, etc.) costs a specific number of credits based on your plan tier.</p>
            </div>
            <div className="text-left">
              <h4 className="font-semibold mb-2">Do you offer refunds?</h4>
              <p className="text-gray-400 text-sm">Yes, we offer a 30-day money-back guarantee on all paid plans.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
