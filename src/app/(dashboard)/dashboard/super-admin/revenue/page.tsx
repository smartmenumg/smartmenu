import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/actions";
import { getOrderHistory } from "@/lib/admin/revenue-actions";
import { OrderHistoryClient } from "./order-history-client";

export const metadata: Metadata = {
  title: "Order History | CineBites",
  description: "View order history, revenue, and fee breakdown by date range.",
};

export const dynamic = "force-dynamic";

export default async function OrderHistoryPage() {
  const session = await getCurrentProfile();
  if (!session) {
    redirect("/auth/login");
  }

  const { role, permissions } = session.profile;
  const hasAccess =
    role === "super_admin" ||
    (role === "admin" && permissions?.includes("revenue"));

  if (!hasAccess) {
    redirect("/auth/unauthorized");
  }

  // Default: load today's data server-side for initial render
  const result = await getOrderHistory({ preset: "today" });

  if (result.error || !result.metrics) {
    return (
      <div className="p-8 min-h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-lg">
          <h2 className="text-red-700 font-semibold mb-1">Error loading order history</h2>
          <p className="text-red-500 text-sm">{result.error ?? "Unknown error occurred"}</p>
        </div>
      </div>
    );
  }

  return (
    <OrderHistoryClient
      initialMetrics={result.metrics}
      initialOrders={result.orders ?? []}
      initialLabel={result.label ?? "Today"}
      fetchOrderHistory={getOrderHistory}
    />
  );
}
