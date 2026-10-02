import Link from "next/link";
import Image from "next/image";
import { ArrowRight, QrCode, ShoppingBag, CreditCard, PackageCheck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Veer Cinema Food and Beverages — In-Seat Dining by Mahavir Group",
  description:
    "Order premium food and beverages directly to your cinema seat. Veer Cinema Food and Beverages by Mahavir Group — Experience. Quality. Trust.",
};

const steps = [
  {
    icon: QrCode,
    step: "01",
    title: "Scan the QR Code",
    description:
      "Find the QR code at your seat or auditorium entrance. Scan it with any camera app — no downloads needed.",
  },
  {
    icon: ShoppingBag,
    step: "02",
    title: "Select Your Items",
    description:
      "Browse the full menu, pick your favourites, customise your order, and add them to your cart.",
  },
  {
    icon: CreditCard,
    step: "03",
    title: "Pay Securely",
    description:
      "Pay instantly with UPI, credit/debit card, or wallet — secured by bank-grade encryption.",
  },
  {
    icon: PackageCheck,
    step: "04",
    title: "Food at Your Seat",
    description:
      "Sit back and relax. Your order is prepared and delivered directly to your seat — track it in real time.",
  },
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col bg-[#f9f8f5] text-[#1a1a1a]"
      style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
    >
      {/* ─── STICKY NAVBAR ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-[#e8e4dc]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[70px] flex items-center justify-between">
          {/* Logo */}
          <a href="#home">
            <Image
              src="/mahavir-logo.png"
              alt="Mahavir Group"
              width={160}
              height={48}
              className="h-10 w-auto object-contain"
              priority
            />
          </a>

          {/* Nav links — desktop */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-[#444]">
            <a
              href="#home"
              className="px-4 py-2 rounded-full hover:bg-[#f0ede7] hover:text-[#0f2336] transition-colors"
            >
              Home
            </a>
            <a
              href="#about"
              className="px-4 py-2 rounded-full hover:bg-[#f0ede7] hover:text-[#0f2336] transition-colors"
            >
              About
            </a>
            <a
              href="#contact"
              className="px-4 py-2 rounded-full hover:bg-[#f0ede7] hover:text-[#0f2336] transition-colors"
            >
              Contact
            </a>
          </nav>

          {/* Login CTA */}
          <Link
            href="/auth/login"
            className="relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white overflow-hidden group"
            style={{ background: "linear-gradient(135deg, #1a456b 0%, #0f2336 100%)" }}
          >
            {/* Shimmer on hover */}
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
            <span className="relative">Staff Login</span>
            <ArrowRight className="relative w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* ─── HERO ──────────────────────────────────────────────────────── */}
        <section id="home" className="relative overflow-hidden">
          {/* Deep navy bg */}
          <div className="absolute inset-0 bg-[#0a1929]" />
          {/* Warm radial glow — cinema curtain feel */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 90% 70% at 50% 110%, rgba(26,69,107,0.8) 0%, transparent 65%)",
            }}
          />
          {/* Very subtle horizontal scan-lines */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)",
            }}
          />

          <div className="relative max-w-5xl mx-auto px-5 sm:px-8 pt-28 pb-36 md:pt-40 md:pb-48 text-center">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/8 backdrop-blur-sm border border-white/12 text-white/70 text-xs font-semibold tracking-widest uppercase mb-10">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Mahavir Group · Veer Cinema Food and Beverages
            </div>

            <h1
              className="text-4xl sm:text-6xl md:text-[76px] font-extrabold text-white leading-[1.08] tracking-[-0.02em] mb-7"
              style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
            >
              Cinema Dining,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
                Reimagined.
              </span>
            </h1>

            <p className="max-w-lg mx-auto text-lg text-white/55 leading-relaxed mb-12">
              Scan. Select. Pay. Enjoy — all without leaving your seat.
              Veer Cinema Food and Beverages brings a premium dining experience to every show.
            </p>

            <p className="text-white/30 text-xs tracking-widest uppercase">
              Experience &nbsp;·&nbsp; Quality &nbsp;·&nbsp; Trust
            </p>
          </div>
        </section>

        {/* ─── HOW IT WORKS ──────────────────────────────────────────────── */}
        <section id="about" className="py-28 px-5 sm:px-8 bg-[#f9f8f5]">
          <div className="max-w-6xl mx-auto">
            {/* Section label */}
            <div className="text-center mb-16">
              <p className="text-xs font-bold tracking-widest uppercase text-[#1a456b] mb-3">
                How It Works
              </p>
              <h2
                className="text-3xl sm:text-5xl font-bold text-[#0a1929] tracking-tight"
                style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
              >
                Four simple steps
                <br />
                <span className="text-[#1a456b]/60 font-normal text-2xl sm:text-3xl">
                  to the perfect cinema meal.
                </span>
              </h2>
            </div>

            {/* Steps — horizontal timeline on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
              {/* Connecting line — desktop only */}
              <div className="hidden lg:block absolute top-[52px] left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-px bg-gradient-to-r from-[#e8e4dc] via-[#1a456b]/20 to-[#e8e4dc] z-0" />

              {steps.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.step}
                    className="relative z-10 flex flex-col items-center text-center p-6 group"
                  >
                    {/* Circle icon */}
                    <div className="w-[104px] h-[104px] rounded-full bg-white border-2 border-[#e8e4dc] group-hover:border-[#1a456b]/30 shadow-lg shadow-black/5 flex items-center justify-center mb-6 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-[#1a456b]/10 group-hover:-translate-y-1">
                      <Icon className="w-9 h-9 text-[#1a456b]" />
                    </div>
                    {/* Step number */}
                    <span className="text-[10px] font-bold tracking-widest uppercase text-[#1a456b]/50 mb-1">
                      Step {s.step}
                    </span>
                    <h3
                      className="text-lg font-bold text-[#0a1929] mb-2"
                      style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
                    >
                      {s.title}
                    </h3>
                    <p className="text-sm text-[#777] leading-relaxed">{s.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── CTA BAND ──────────────────────────────────────────────────── */}
        <section className="bg-[#0a1929] py-20 px-5 sm:px-8 text-center">
          <p
            className="text-2xl sm:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
          >
            Ready to order?
          </p>
          <p className="text-white/50 mb-10 text-base max-w-sm mx-auto">
            Scan the QR code at your seat or tap below to get started.
          </p>
          <Link
            href="/order"
            className="inline-flex items-center gap-3 px-8 py-4 bg-amber-400 hover:bg-amber-300 text-[#0a1929] font-bold rounded-full transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 text-base"
          >
            Browse the Menu
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>

      {/* ─── FOOTER / CONTACT ──────────────────────────────────────────── */}
      <footer id="contact" className="bg-[#060f1a] text-white/40 py-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pb-12 border-b border-white/8">

            {/* Brand */}
            <div>
              <Image
                src="/mahavir-logo.png"
                alt="Mahavir Group"
                width={140}
                height={42}
                className="h-9 w-auto object-contain mb-5 brightness-0 invert opacity-50"
              />
              <p className="text-sm leading-relaxed max-w-xs">
                Veer Cinema Food and Beverages is Mahavir Group's proprietary in-seat food ordering
                platform, serving cinema guests across all our properties.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white/70 font-semibold text-xs uppercase tracking-widest mb-5">
                Quick Links
              </h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="#home" className="hover:text-white transition-colors">Home</a>
                </li>
                <li>
                  <a href="#about" className="hover:text-white transition-colors">How It Works</a>
                </li>
                <li>
                  <Link href="/auth/login" className="hover:text-white transition-colors">Staff Login</Link>
                </li>
              </ul>
            </div>

            {/* Contact & Legal */}
            <div>
              <h3 className="text-white/70 font-semibold text-xs uppercase tracking-widest mb-5">
                Contact &amp; Legal
              </h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="mailto:support@mahavirgroupindia.com"
                    className="hover:text-white transition-colors"
                  >
                    support@mahavirgroupindia.com
                  </a>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/refund" className="hover:text-white transition-colors">
                    Refund &amp; Cancellation Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-white/25">
            <p>© {new Date().getFullYear()} Mahavir Group. All rights reserved.</p>
            <p>Powered by Veer Cinema Food and Beverages</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
