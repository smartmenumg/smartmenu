import type { Metadata } from "next";
import { getActiveTheatre, getPublicMenu } from "@/lib/menu/public-menu";
import { verifySeatSignature } from "@/lib/admin/qr-utils";
import { getDayEndState } from "@/lib/admin/day-end-actions";
import { MenuClient } from "./menu-client";
import { UtensilsCrossed, Coffee } from "lucide-react";

export const metadata: Metadata = {
  title: "Order Food | Theatre Food",
  description: "Browse our menu and order food delivered to your seat.",
};

export const dynamic = "force-dynamic"; // always fresh menu data

interface OrderPageProps {
  searchParams: Promise<{ audi?: string; seat?: string; sig?: string }>;
}

export default async function OrderPage({ searchParams }: OrderPageProps) {
  const theatre = await getActiveTheatre();
  const params = await searchParams;

  if (!theatre) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3 p-8">
          <UtensilsCrossed className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-400">Menu is currently unavailable. Please try again shortly.</p>
        </div>
      </div>
    );
  }

  // Check Day End state — if the admin has ended the day, block all orders
  const dayEndState = await getDayEndState(theatre.id);
  if (dayEndState.isDayEnded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="text-center space-y-5 p-8 max-w-xs">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto">
            <Coffee className="w-7 h-7 text-amber-400" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white">{theatre.name}</h1>
            <p className="text-amber-400 font-semibold text-base">
              Oops!
            </p>
          </div>

          <p className="text-slate-400 text-sm leading-relaxed">
            We are having too many orders right now.<br />
            We&apos;ll be ready to serve you again very soon.
          </p>

          <div className="border-t border-slate-800 pt-4 text-xs text-slate-600">
            Thank you for your patience.
          </div>
        </div>
      </div>
    );
  }

  // QR scan pre-fill — only accepted if HMAC signature is valid.
  const rawAudi = params.audi?.trim() ?? null;
  const rawSeat = params.seat?.trim() ?? null;
  const rawSig  = params.sig?.trim()  ?? null;

  const sigValid = rawAudi && rawSeat && rawSig
    ? verifySeatSignature(rawAudi, rawSeat, rawSig)
    : false;

  const qrAudiId = sigValid ? rawAudi : null;
  const qrSeat   = sigValid ? rawSeat : null;

  const { categories, products, auditoriums } = await getPublicMenu(theatre.id);

  return (
    <MenuClient
      theatreName={theatre.name}
      categories={categories}
      products={products}
      auditoriums={auditoriums}
      qrAudiId={qrAudiId}
      qrSeat={qrSeat}
    />
  );
}
