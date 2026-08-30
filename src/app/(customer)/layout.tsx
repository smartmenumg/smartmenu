import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order Food | Theatre Food Ordering",
  description: "Browse our menu and order food delivered to your seat.",
};

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950">
      {children}
    </div>
  );
}
