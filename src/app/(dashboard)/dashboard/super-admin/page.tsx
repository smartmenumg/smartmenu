import { redirect } from "next/navigation";

export default function SuperAdminRoot() {
  redirect("/dashboard/super-admin/revenue");
}
