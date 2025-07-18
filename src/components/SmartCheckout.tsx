"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CheckoutButton from "@/components/CheckoutButton";
import RazorpayButton from "@/components/RazorpayButton";
import { Loader2, CreditCard, Zap } from "lucide-react";

interface PaymentProvider {
  id: string;
  name: string;
  display_name: string;
  is_enabled: boolean;
  priority: number;
}

interface SmartCheckoutProps {
  planId: string;
  planName: string;
  priceUSD: number;
  priceINR: number;
  currency: "USD" | "INR";
  className?: string;
}

export default function SmartCheckout({
  planId,
  planName,
  priceUSD,
  priceINR,
  currency,
  className,
}: SmartCheckoutProps) {
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [showSelection, setShowSelection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentProviders();
  }, []);

  const fetchPaymentProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/payment-providers");
      const data = await response.json();

      if (data.success) {
        setProviders(data.providers);
        setShowSelection(data.showSelection);
      } else {
        setError("Failed to load payment providers");
      }
    } catch (err) {
      setError("Error loading payment providers");
      console.error("Error fetching payment providers:", err);
    } finally {
      setLoading(false);
    }
  };

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case "stripe":
        return <CreditCard className="w-4 h-4" />;
      case "razorpay":
        return <Zap className="w-4 h-4" />;
      case "lemonsqueezy":
        return <CreditCard className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const renderProviderButton = (provider: PaymentProvider) => {
    const amount = currency === "USD" ? priceUSD : priceINR;

    switch (provider.id) {
      case "stripe":
        // You'll need to update CheckoutButton to accept the new props
        return (
          <CheckoutButton
            priceId={planId} // You might need to map this to actual Stripe price ID
            className={className}
          />
        );
      
      case "razorpay":
        return (
          <RazorpayButton
            planId={planId}
            planName={planName}
            amount={amount}
            currency={currency}
            className={className}
          />
        );
      
      case "lemonsqueezy":
        // You'll need to create a LemonSqueezy button component similar to RazorpayButton
        return (
          <Button className={className} disabled>
            Lemon Squeezy (Coming Soon)
          </Button>
        );
      
      default:
        return (
          <Button className={className} disabled>
            {provider.display_name} (Not Available)
          </Button>
        );
    }
  };

  if (loading) {
    return (
      <Button disabled className={className}>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (error || providers.length === 0) {
    return (
      <Button disabled className={className}>
        Payment Unavailable
      </Button>
    );
  }

  // Single provider - render directly
  if (!showSelection && providers.length === 1) {
    return renderProviderButton(providers[0]);
  }

  // Multiple providers - show selection
  if (showSelection && providers.length > 1) {
    return (
      <div className="w-full">
        <Tabs defaultValue={providers[0].id} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <TabsTrigger
                key={provider.id}
                value={provider.id}
                className="flex items-center gap-2"
              >
                {getProviderIcon(provider.id)}
                <span className="hidden sm:inline">{provider.display_name}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          {providers.map((provider) => (
            <TabsContent key={provider.id} value={provider.id} className="mt-4">
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold">{provider.display_name}</h3>
                  <p className="text-sm text-gray-600">
                    Pay {currency === "USD" ? "$" : "₹"}
                    {currency === "USD" ? priceUSD : priceINR} for {planName}
                  </p>
                </div>
                {renderProviderButton(provider)}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }

  // Fallback
  return (
    <Button disabled className={className}>
      No Payment Methods Available
    </Button>
  );
}
