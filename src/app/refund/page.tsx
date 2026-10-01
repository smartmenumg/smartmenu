import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — SmartMenu by Mahavir Group",
};

export default function RefundPage() {
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
            Refund &amp; Cancellation Policy
          </h1>
          <p className="text-sm text-[#999] mb-10">Last updated: [Date to be filled]</p>

          <div className="space-y-8 text-[#555] text-sm leading-relaxed">
            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">1. Order Cancellations</h2>
              <p className="mb-2">Once an order is placed and payment is confirmed through SmartMenu, the order is immediately dispatched to the kitchen for preparation. <strong className="text-[#0f2336]">Orders cannot be cancelled once confirmed.</strong></p>
              <p>If you wish to cancel an order before payment is completed, you may simply abandon the checkout process. No charges will be applied to abandoned orders.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">2. Refund Eligibility</h2>
              <p className="mb-2">Refunds are considered only under the following circumstances:</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><strong className="text-[#0f2336]">Payment deducted but order not confirmed:</strong> If your payment was deducted but you did not receive an order confirmation, you are eligible for a full refund.</li>
                <li><strong className="text-[#0f2336]">Wrong item delivered:</strong> If the item delivered is materially different from what was ordered.</li>
                <li><strong className="text-[#0f2336]">Item quality issue:</strong> If the food is found to be inedible or unsafe, please report it immediately to the theatre staff. Refund decisions in such cases are at the sole discretion of Mahavir Group management.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">3. Non-Refundable Situations</h2>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Change of mind after the order has been confirmed</li>
                <li>Delays in delivery caused by high demand during peak hours</li>
                <li>Dissatisfaction with taste or quantity where the item is as described on the menu</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">4. How to Request a Refund</h2>
              <p className="mb-2">To request a refund, please contact us within <strong className="text-[#0f2336]">24 hours</strong> of the transaction at:</p>
              <div className="bg-[#f9f8f5] rounded-xl p-4 border border-[#e8e4dc]">
                <p>Email: <a href="mailto:support@mahavirgroupindia.com" className="text-[#1a456b] hover:underline">support@mahavirgroupindia.com</a></p>
                <p className="mt-1">Please include your order tracking ID and the registered mobile number.</p>
              </div>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">5. Refund Processing Time</h2>
              <p>Approved refunds will be credited back to the original payment method within <strong className="text-[#0f2336]">5–7 business days</strong>, subject to your bank's processing timelines. Mahavir Group shall not be responsible for any delays caused by your bank or payment service provider.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#0f2336] mb-3">6. Contact</h2>
              <p>For any refund or cancellation-related queries, please write to us at <a href="mailto:support@mahavirgroupindia.com" className="text-[#1a456b] hover:underline">support@mahavirgroupindia.com</a>.</p>
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
