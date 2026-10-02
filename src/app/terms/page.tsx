import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — Veer Cinema Food and Beverages by Mahavir Group",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f9f8f5] flex flex-col" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      {/* Header */}
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
            Terms &amp; Conditions
          </h1>
          <p className="text-sm text-[#999] mb-10">Last updated: [Date to be filled]</p>

          <div className="space-y-8 text-[#555] text-sm leading-relaxed">
            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">1. Acceptance of Terms</h2>
              <p>By accessing or using Veer Cinema Food and Beverages (&quot;the Platform&quot;), a proprietary food ordering service operated by Mahavir Group, you agree to be bound by these Terms &amp; Conditions. If you do not agree, you must not use the Platform.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">2. About the Platform</h2>
              <p>Veer Cinema Food and Beverages is an in-seat food and beverage ordering platform provided exclusively within Mahavir Group's cinema properties. Orders placed through Veer Cinema Food and Beverages are fulfilled by the respective theatre's food and beverage operations team.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">3. Orders &amp; Payments</h2>
              <p className="mb-2">All prices on the Platform are inclusive of applicable taxes. Prices may vary by property and are subject to change without prior notice.</p>
              <p>Payment must be completed at the time of placing the order. Orders are only confirmed upon successful payment. Mahavir Group reserves the right to cancel any order in case of unavailability of items or a technical error in pricing.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">4. Food Allergies &amp; Dietary Requirements</h2>
              <p>While we make every effort to display accurate ingredient and allergen information, Mahavir Group cannot guarantee that any product is completely free of allergens. Customers with food allergies or intolerances are advised to contact the theatre staff directly before placing an order.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">5. Intellectual Property</h2>
              <p>All content, trademarks, and intellectual property on the Platform, including the Veer Cinema Food and Beverages name and the Mahavir Group logo, are the exclusive property of Mahavir Group. Unauthorized use, reproduction, or distribution is strictly prohibited.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">6. Limitation of Liability</h2>
              <p>Mahavir Group shall not be held liable for any indirect, incidental, or consequential damages arising from the use of the Platform, including but not limited to delays in food delivery due to operational constraints within the cinema premises.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">7. Governing Law</h2>
              <p>These Terms &amp; Conditions are governed by the laws of India. Any disputes arising from the use of the Platform shall be subject to the exclusive jurisdiction of the courts located in [City — to be filled].</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">8. Contact</h2>
              <p>For any questions regarding these Terms &amp; Conditions, please contact us at <a href="mailto:support@mahavirgroupindia.com" className="text-[#1a456b] hover:underline">support@mahavirgroupindia.com</a>.</p>
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
