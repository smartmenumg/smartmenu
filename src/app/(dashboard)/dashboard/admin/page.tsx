import { getCurrentProfile } from "@/lib/auth/actions";
import { redirect } from "next/navigation";
import { getAdminOrders } from "@/lib/orders/order-actions";
import { AdminOrdersClient } from "./admin-orders-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const session = await getCurrentProfile();
  if (!session) {
    redirect("/auth/unauthorized");
  }

  const { role, permissions } = session.profile;
  const hasAccess = 
    role === "super_admin" || 
    (role === "admin" && permissions?.includes("live_orders"));

  if (!hasAccess) {
    redirect("/auth/unauthorized");
  }

  const orders = await getAdminOrders();

  return <AdminOrdersClient initialOrders={orders} theatreId={session.profile.theatre_id} />;
}
