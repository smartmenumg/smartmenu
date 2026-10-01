import { getCurrentProfile } from "@/lib/auth/actions";
import { getEffectiveTheatreId, getAllTheatres } from "@/lib/theatre-context";
import { redirect } from "next/navigation";
import { getAdminOrders } from "@/lib/orders/order-actions";
import { getDayEndState } from "@/lib/admin/day-end-actions";
import { createAdminClient } from "@/lib/supabase/server";
import { AdminOrdersClient } from "./admin-orders-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const session = await getCurrentProfile();
  if (!session) {
    redirect("/auth/login");
  }

  const { role, permissions, theatre_id, full_name } = session.profile;
  const hasAccess =
    role === "super_admin" ||
    (role === "admin" && permissions?.includes("live_orders"));

  if (!hasAccess) {
    redirect("/auth/unauthorized");
  }

  // null means "all theatres" for super admin
  const effectiveTheatreId = role === "super_admin"
    ? await getEffectiveTheatreId()
    : theatre_id;

  const isAllView = effectiveTheatreId === null;
  const clientTheatreId = isAllView ? "all" : effectiveTheatreId!;

  const admin = await createAdminClient();

  // Parallel: fetch theatre name (if specific), all orders, day end state, and theatre list (if super admin)
  const [allTheatres, orders, dayEndData, theatreRow] = await Promise.all([
    role === "super_admin" ? getAllTheatres() : Promise.resolve([]),
    getAdminOrders(),
    isAllView ? Promise.resolve({ isDayEnded: false }) : getDayEndState(clientTheatreId),
    isAllView
      ? Promise.resolve(null)
      : admin.from("theatres").select("name").eq("id", clientTheatreId).single<{ name: string }>().then(r => r.data),
  ]);

  const theatreName = isAllView ? "All Cinemas" : (theatreRow?.name ?? "Admin Dashboard");
  const userInitial = (full_name ?? session.user.email ?? "A")[0].toUpperCase();

  return (
    <AdminOrdersClient
      initialOrders={orders}
      theatreId={clientTheatreId}
      theatreName={theatreName}
      isDayEnded={dayEndData.isDayEnded}
      profile={{ role, full_name }}
      userInitial={userInitial}
      allTheatres={allTheatres}
    />
  );
}
