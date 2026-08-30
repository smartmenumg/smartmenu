import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/actions";
import { getRevenueMetrics, getRecentPaidOrders } from "@/lib/admin/revenue-actions";
import { paiseToRupees } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, TrendingUp, ShoppingBag, Receipt, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Revenue Dashboard | CineBites",
  description: "View sales and revenue metrics",
};

export default async function RevenuePage() {
  const session = await getCurrentProfile();
  if (!session) {
    redirect("/auth/unauthorized");
  }

  const { role, permissions } = session.profile;
  const hasAccess = 
    role === "super_admin" || 
    (role === "admin" && permissions?.includes("revenue"));

  if (!hasAccess) {
    redirect("/auth/unauthorized");
  }

  const { metrics, error } = await getRevenueMetrics();
  const recentOrders = await getRecentPaidOrders();

  if (error || !metrics) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <h2 className="text-red-400 font-semibold mb-2">Error loading metrics</h2>
          <p className="text-red-300 text-sm">{error || "Unknown error occurred"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-white mb-2">
          Revenue Overview
        </h1>
        <p className="text-slate-400">
          Track sales performance and recent transactions.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Today's Revenue */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Today&apos;s Sales
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              ₹{paiseToRupees(metrics.todayRevenue).toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 flex items-center">
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                {metrics.todayOrders}
              </span>
              orders today
            </p>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Total Revenue
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              ₹{paiseToRupees(metrics.totalRevenue).toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              All time gross volume
            </p>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Total Orders
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {metrics.totalOrders.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Avg value: ₹{paiseToRupees(metrics.averageOrderValue)}
            </p>
          </CardContent>
        </Card>

        {/* Total GST */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              GST Collected
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-violet-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              ₹{paiseToRupees(metrics.totalGst).toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Tax liability
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="pt-4">
        <h2 className="text-xl font-display font-semibold text-white mb-6">Recent Paid Orders</h2>
        
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden backdrop-blur-md">
          <Table>
            <TableHeader className="bg-slate-900/80">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium">Order ID / Token</TableHead>
                <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium">Customer</TableHead>
                <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium">Seat</TableHead>
                <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium text-right">Amount</TableHead>
                <TableHead className="text-slate-400 text-xs tracking-wider uppercase font-medium">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.length === 0 ? (
                <TableRow className="border-slate-800/60 hover:bg-transparent">
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    No completed orders found.
                  </TableCell>
                </TableRow>
              ) : (
                recentOrders.map((order) => (
                  <TableRow key={order.id} className="border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                    <TableCell>
                      <div className="font-mono text-xs text-slate-300">
                        {order.tracking_token.split("-")[0].toUpperCase()}
                      </div>
                      <Badge variant="outline" className="mt-1 border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-1.5 py-0">
                        Paid
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-slate-200">{order.customer_name}</div>
                      <div className="text-xs text-slate-500">{order.mobile}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-300">{order.auditoriums?.name}</div>
                      <div className="text-xs text-slate-500">{order.seat_number}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm font-semibold text-amber-400">
                        ₹{paiseToRupees(order.total_amount)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {order.order_items.length} item{order.order_items.length !== 1 && 's'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">
                      {format(new Date(order.created_at), "MMM d, h:mm a")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
