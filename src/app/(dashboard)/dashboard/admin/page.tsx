import { getCurrentProfile } from "@/lib/auth/actions";
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

  // Fetch theatre name for the header
  const admin = await createAdminClient();
  const { data: theatre } = await admin
    .from("theatres")
    .select("name")
    .eq("id", theatre_id)
    .single<{ name: string }>();

  const [orders, dayEndState] = await Promise.all([
    getAdminOrders(),
    getDayEndState(theatre_id),
  ]);

  const userInitial = (full_name ?? session.user.email ?? "A")[0].toUpperCase();

  return (
    <AdminOrdersClient
      initialOrders={orders}
      theatreId={theatre_id}
      theatreName={theatre?.name ?? "Admin Dashboard"}
      isDayEnded={dayEndState.isDayEnded}
      profile={{ role, full_name }}
      userInitial={userInitial}
    />
  );
}
