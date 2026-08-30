import type { Metadata } from "next";
import { getActiveTheatre, getPublicMenu } from "@/lib/menu/public-menu";
import { verifySeatSignature } from "@/lib/admin/qr-utils";
import { MenuClient } from "./menu-client";
import { UtensilsCrossed } from "lucide-react";

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

  // QR scan pre-fill — only accepted if HMAC signature is valid.
  // This prevents customers from tampering with the URL to change their seat.
  const rawAudi = params.audi?.trim() ?? null;
  const rawSeat = params.seat?.trim() ?? null;
  const rawSig  = params.sig?.trim()  ?? null;

  const sigValid = rawAudi && rawSeat && rawSig
    ? verifySeatSignature(rawAudi, rawSeat, rawSig)
    : false;

  // Only pre-fill when the signature is cryptographically valid
  const qrAudiId = sigValid ? rawAudi : null;
  const qrSeat   = sigValid ? rawSeat : null;

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
