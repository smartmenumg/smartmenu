import { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/actions";
import { getAuditoriumsWithLayout } from "@/lib/admin/qr-actions";
import { signSeat } from "@/lib/admin/qr-utils";
import { QRManagerClient } from "./qr-manager-client";

export const metadata: Metadata = {
  title: "QR Code Manager | CineBites",
  description: "Generate and print seat QR codes for your auditoriums",
};

export default async function QRCodesPage() {
  const session = await getCurrentProfile();
  if (!session || !["admin", "super_admin"].includes(session.profile.role)) {
    redirect("/dashboard/admin");
  }

  const auditoriums = await getAuditoriumsWithLayout();

  // Detect base URL from request headers for accurate QR links
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${proto}://${host}`;

  if (auditoriums.length === 0) {
    return (
      <div className="p-10 text-center text-slate-500">
        No auditoriums configured yet. Add auditoriums in your theatre settings first.
      </div>
    );
  }

  // Pre-generate all signed URLs server-side so the client never needs to call a server action.
  // This avoids client/server action issues on Vercel edge deployments.
  const initialSignedUrls: Record<string, Record<string, string>> = {};
  for (const audi of auditoriums) {
    const audiSigned: Record<string, string> = {};
    for (const row of (audi.seat_layout?.rows ?? [])) {
      for (let s = row.from; s <= row.to; s++) {
        const seat = `${row.name}${s}`;
        const sig = signSeat(audi.id, seat);
        audiSigned[seat] = `${baseUrl}/order?audi=${audi.id}&seat=${encodeURIComponent(seat)}&sig=${sig}`;
      }
    }
    initialSignedUrls[audi.id] = audiSigned;
  }

  return (
    <QRManagerClient
      auditoriums={auditoriums}
      baseUrl={baseUrl}
      initialSignedUrls={initialSignedUrls}
    />
  );
}
