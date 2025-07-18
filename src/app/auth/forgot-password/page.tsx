import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your password",
  openGraph: {
    title: "Forgot Password | My App",
    description: "Reset your password on My App",
  },
};

export default function ForgotPassword() {
  return <ForgotPasswordForm />;
}
