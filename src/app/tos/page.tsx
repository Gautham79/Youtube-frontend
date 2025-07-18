import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | ReelForest",
  description: "Terms of Service for ReelForest - AI-powered video creation platform",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> January 17, 2025
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                Welcome to ReelForest! These Terms of Service ("Terms") govern your use of the ReelForest platform, website, and services (collectively, the "Service") operated by ReelForest Inc. ("we," "us," or "our").
              </p>
              <p className="text-gray-700">
                By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these terms, then you may not access the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                ReelForest is an AI-powered video creation platform that enables users to create viral content through automated script generation, scene creation, voiceovers, and video editing. Our Service includes:
              </p>
              <ul className="list-disc pl-6 text-gray-700">
                <li>AI-generated video scripts and content</li>
                <li>Automated scene creation and visual generation</li>
                <li>Voice narration and subtitle services</li>
                <li>Video editing and production tools</li>
                <li>Multi-language support and translation</li>
                <li>Export and publishing capabilities</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Account Creation</h3>
              <p className="text-gray-700 mb-4">
                To use certain features of our Service, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Account Security</h3>
              <p className="text-gray-700 mb-4">
                You are responsible for safeguarding your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3 Account Termination</h3>
              <p className="text-gray-700">
                We reserve the right to suspend or terminate your account at any time for violations of these Terms or for any other reason at our sole discretion.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Subscription Plans and Payment</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Subscription Plans</h3>
              <p className="text-gray-700 mb-4">
                We offer various subscription plans with different features and usage limits. Plan details, pricing, and features are available on our pricing page and may be updated from time to time.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Payment Terms</h3>
              <p className="text-gray-700 mb-4">
                Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable except as expressly stated in these Terms or required by law.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 Auto-Renewal</h3>
              <p className="text-gray-700 mb-4">
                Your subscription will automatically renew at the end of each billing period unless you cancel before the renewal date. You may cancel your subscription at any time through your account settings.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.4 Refund Policy</h3>
              <p className="text-gray-700">
                We offer a 30-day money-back guarantee for new subscribers. Refund requests must be submitted within 30 days of your initial subscription purchase.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Acceptable Use Policy</h2>
              <p className="text-gray-700 mb-4">You agree not to use the Service to:</p>
              <ul className="list-disc pl-6 text-gray-700">
                <li>Create content that is illegal, harmful, threatening, abusive, or defamatory</li>
                <li>Infringe upon intellectual property rights of others</li>
                <li>Generate spam, malware, or other malicious content</li>
                <li>Impersonate any person or entity or misrepresent your affiliation</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use the Service for any commercial purpose without proper authorization</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Intellectual Property Rights</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 Our Content</h3>
              <p className="text-gray-700 mb-4">
                The Service and its original content, features, and functionality are owned by ReelForest and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.2 User-Generated Content</h3>
              <p className="text-gray-700 mb-4">
                You retain ownership of content you create using our Service. However, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and display your content solely for the purpose of providing and improving our Service.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.3 AI-Generated Content</h3>
              <p className="text-gray-700">
                Content generated by our AI systems based on your inputs is considered your content, subject to these Terms and applicable laws. You are responsible for ensuring your use of AI-generated content complies with all applicable laws and third-party rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Privacy and Data Protection</h2>
              <p className="text-gray-700">
                Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information when you use our Service. By using our Service, you agree to the collection and use of information in accordance with our Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Disclaimers and Limitations</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.1 Service Availability</h3>
              <p className="text-gray-700 mb-4">
                We strive to maintain high service availability but cannot guarantee uninterrupted access. The Service is provided "as is" and "as available" without warranties of any kind.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.2 AI-Generated Content</h3>
              <p className="text-gray-700 mb-4">
                While our AI technology is advanced, we cannot guarantee the accuracy, completeness, or quality of AI-generated content. Users are responsible for reviewing and verifying all content before use.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.3 Limitation of Liability</h3>
              <p className="text-gray-700">
                To the maximum extent permitted by law, ReelForest shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Indemnification</h2>
              <p className="text-gray-700">
                You agree to defend, indemnify, and hold harmless ReelForest and its affiliates from and against any claims, damages, obligations, losses, liabilities, costs, or debt arising from your use of the Service or violation of these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Termination</h2>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
              </p>
              <p className="text-gray-700">
                Upon termination, your right to use the Service will cease immediately. All provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, and limitations of liability.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Governing Law</h2>
              <p className="text-gray-700">
                These Terms shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of California.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to Terms</h2>
              <p className="text-gray-700">
                We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. Your continued use of the Service after any changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Severability</h2>
              <p className="text-gray-700">
                If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions will remain in full force and effect, and the invalid or unenforceable provision will be replaced with a valid and enforceable provision that most closely matches the intent of the original provision.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-2"><strong>Email:</strong> legal@reelforest.com</p>
                <p className="text-gray-700 mb-2"><strong>Support:</strong> support@reelforest.com</p>
                <p className="text-gray-700"><strong>Address:</strong> ReelForest Inc., 123 Innovation Drive, Tech Valley, CA 94000</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Entire Agreement</h2>
              <p className="text-gray-700">
                These Terms of Service, together with our Privacy Policy and any other legal notices published by us on the Service, constitute the entire agreement between you and ReelForest concerning the Service and supersede all prior or contemporaneous communications and proposals.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
