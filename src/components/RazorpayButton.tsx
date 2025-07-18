"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";

interface RazorpayButtonProps {
  planId: string;
  planName: string;
  amount: number;
  currency: "USD" | "INR";
  className?: string;
  children?: React.ReactNode;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function RazorpayButton({
  planId,
  planName,
  amount,
  currency,
  className,
  children,
}: RazorpayButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!user) {
      alert("Please login to continue");
      return;
    }

    setIsLoading(true);

    try {
      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          alert("Failed to load payment gateway. Please try again.");
          return;
        }
      }

      // Create order on backend
      const response = await fetch("/api/razorpay/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
          currency,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create order");
      }

      // Configure Razorpay options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "ReelForest",
        description: `Subscription to ${planName}`,
        order_id: data.order.id,
        prefill: {
          name: user.user_metadata?.name || user.user_metadata?.full_name || "",
          email: user.email || "",
        },
        notes: {
          plan_id: planId,
          user_id: user.id,
          plan_name: planName,
        },
        theme: {
          color: "#3B82F6",
        },
        handler: function (response: any) {
          // Payment successful
          handlePaymentSuccess(response);
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false);
          },
        },
      };

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error("Payment error:", error);
      alert(error.message || "Payment failed. Please try again.");
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (response: any) => {
    try {
      // Verify payment on backend
      const verifyResponse = await fetch("/api/razorpay/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.success) {
        // Redirect to success page or dashboard
        window.location.href = "/dashboard?payment=success";
      } else {
        throw new Error("Payment verification failed");
      }
    } catch (error: any) {
      console.error("Payment verification error:", error);
      alert("Payment verification failed. Please contact support.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Processing...
        </div>
      ) : (
        children || `Pay ${currency === "USD" ? "$" : "₹"}${amount}`
      )}
    </Button>
  );
}
