import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/actions";
import { redirect } from "next/navigation";

import { BillPrintClient } from "./bill-print-client";

export default async function BillPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const session = await getCurrentProfile();
  if (!session || !["admin", "super_admin"].includes(session.profile.role)) {
    redirect("/auth/login");
  }

  const admin = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order } = await (admin as any)
    .from("orders")
    .select("*, auditoriums(name), order_items(*), payments(*)")
    .eq("id", orderId)
    .eq("theatre_id", session.profile.theatre_id)
    .single();

  if (!order) redirect("/dashboard/admin");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: theatre } = await (admin as any)
    .from("theatres")
    .select("name, address")
    .eq("id", session.profile.theatre_id)
    .single();

  return <BillPrintClient order={order} theatre={theatre} />;
}
