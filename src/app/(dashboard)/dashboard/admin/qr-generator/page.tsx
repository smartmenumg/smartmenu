import { getCurrentProfile } from "@/lib/auth/actions";
import { getEffectiveTheatreId, getAllTheatres } from "@/lib/theatre-context";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { QRGeneratorClient } from "./qr-generator-client";

export const dynamic = "force-dynamic";

export default async function QRGeneratorPage() {
  const session = await getCurrentProfile();
  if (!session) {
    redirect("/auth/login");
  }

  const { role, permissions, theatre_id } = session.profile;
  const hasAccess =
    role === "super_admin" ||
    (role === "admin" && permissions?.includes("live_orders")); // Reusing live_orders permission or standard access

  if (!hasAccess) {
    redirect("/auth/unauthorized");
  }

  const effectiveTheatreId = role === "super_admin"
    ? await getEffectiveTheatreId()
    : theatre_id;

  const isAllView = effectiveTheatreId === null;
  const clientTheatreId = isAllView ? "all" : effectiveTheatreId!;

  const adminClient = await createAdminClient();

  const [allTheatres, auditoriumsData] = await Promise.all([
    role === "super_admin" ? getAllTheatres() : Promise.resolve([]),
    isAllView
      ? Promise.resolve([])
      : adminClient
          .from("auditoriums")
          .select("id, name, total_seats")
          .eq("theatre_id", clientTheatreId)
          .eq("active", true)
          .order("display_order")
          .then((res) => res.data || []),
  ]);

  return (
    <QRGeneratorClient
      theatreId={clientTheatreId}
      allTheatres={allTheatres}
      isSuperAdmin={role === "super_admin"}
      auditoriums={auditoriumsData}
    />
  );
}
