"use client";

import { useState } from "react";
import Link from "next/link";
import { TreePine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { config } from "@/config";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      // Always attempt to send password reset email - let Supabase handle the logic
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        // Handle specific error cases
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('user not found') || 
            errorMessage.includes('invalid email') ||
            errorMessage.includes('unable to validate email address')) {
          setError("If an account with this email exists, you'll receive password reset instructions.");
        } else {
          setError("Unable to process your request. Please try again or contact support if the problem persists.");
        }
      } else {
        // Success message that covers all scenarios
        setMessage(
          "We've sent password reset instructions to your email address. " +
          "If you signed up using Google or another social provider, the email will contain " +
          "instructions on how to access your account using that method instead."
        );
      }

    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center justify-center space-x-2 mb-8">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg">
            <TreePine className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">{config.appName}</span>
        </Link>
        
        <h2 className="text-center text-2xl/9 font-bold tracking-tight text-gray-900">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        <div className="mt-4 rounded-md bg-yellow-50 p-3">
          <div className="text-xs text-yellow-800">
            <strong>Note:</strong> If you signed up using Google, GitHub, or another social provider, 
            please use the "Continue with [Provider]" option on the{" "}
            <Link href="/auth/login" className="underline">login page</Link> instead.
          </div>
        </div>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email">Email address</Label>
            <div className="mt-2">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {message && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">{message}</div>
            </div>
          )}

          <div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send reset link"}
            </Button>
          </div>
        </form>

        <p className="mt-10 text-center text-sm text-gray-500">
          Remember your password?{" "}
          <Link
            href="/auth/login"
            className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
