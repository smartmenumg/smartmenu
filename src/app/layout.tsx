import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Veer Cinema Food and Beverages — In-Seat Dining by Mahavir Group",
    template: "%s | Veer Cinema Food and Beverages",
  },
  description: "Order premium food and beverages directly to your cinema seat. Veer Cinema Food and Beverages by Mahavir Group — Experience. Quality. Trust.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/icon.png",
    shortcut: "/icon.png",
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <body
        className={`${dmSans.variable} ${spaceGrotesk.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        {children}
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
