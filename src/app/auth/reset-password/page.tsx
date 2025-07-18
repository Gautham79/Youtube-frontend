import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set your new password",
  openGraph: {
    title: "Reset Password | My App",
    description: "Set your new password on My App",
  },
};

export default function ResetPassword() {
  return <ResetPasswordForm />;
}
