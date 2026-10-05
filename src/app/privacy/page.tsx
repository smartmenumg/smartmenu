import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Veer Entertainment Private Limited by Mahavir Group",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f9f8f5] flex flex-col" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      <header className="bg-white border-b border-[#e8e4dc]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[70px] flex items-center justify-between">
          <Link href="/">
            <Image src="/mahavir-logo.png" alt="Mahavir Group" width={140} height={42} className="h-9 w-auto object-contain" />
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-5 sm:px-8 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#1a456b] hover:text-[#0f2336] font-medium mb-10 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-white rounded-2xl border border-[#e8e4dc] p-8 md:p-12">
          <h1 className="text-3xl font-bold text-[#0f2336] mb-2" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
            Privacy Policy
          </h1>
          <p className="text-sm text-[#999] mb-10">Last updated: [Date to be filled]</p>

          <div className="space-y-8 text-[#555] text-sm leading-relaxed">
            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">1. Introduction</h2>
              <p>Mahavir Group (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and protect the data you provide when using Veer Entertainment Private Limited.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">2. Information We Collect</h2>
              <p className="mb-2">When you place an order through Veer Entertainment Private Limited, we collect the following information:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Your name and mobile number (for order identification and communication)</li>
                <li>Your seat and auditorium details (for delivery purposes)</li>
                <li>Order details and payment status (for transaction records)</li>
              </ul>
              <p className="mt-2">We do not collect or store any payment card details. All payment processing is handled by our payment partner, Razorpay, and is subject to their security standards.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>To process and fulfil your food and beverage order</li>
                <li>To send you order status updates via the tracking page</li>
                <li>To resolve any disputes or issues related to your order</li>
                <li>To maintain internal records and improve service quality</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">4. Data Sharing</h2>
              <p>We do not sell, rent, or trade your personal information to any third parties. Your data may be shared only with:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 mt-2">
                <li>Our payment gateway partner (Razorpay) solely for processing payments</li>
                <li>The operational staff of the specific Mahavir Group theatre property you are ordering from</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">5. Data Retention</h2>
              <p>Your order data is retained for a period required by applicable financial and tax regulations in India. After this period, data is securely deleted or anonymized.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">6. Security</h2>
              <p>We implement industry-standard security measures to protect your data. All communication between your device and our servers is encrypted using HTTPS/TLS.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">7. Your Rights</h2>
              <p>You have the right to request access to, correction of, or deletion of your personal data. To exercise these rights, please contact us at <a href="mailto:support@mahavirgroupindia.com" className="text-[#1a456b] hover:underline">support@mahavirgroupindia.com</a>.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">8. Changes to This Policy</h2>
              <p>We may update this Privacy Policy from time to time. Any changes will be published on this page with an updated date. Continued use of the Platform after any changes constitutes your acceptance of the updated policy.</p>
            </section>
          </div>
        </div>
      </main>

      <footer className="py-8 border-t border-[#e8e4dc] text-center text-xs text-[#aaa]">
        <p>© {new Date().getFullYear()} Mahavir Group. All rights reserved.</p>
      </footer>
    </div>
  );
}
