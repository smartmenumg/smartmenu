import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/actions";

// Permission → route mapping (ordered by priority)
const PERMISSION_ROUTES: Record<string, string> = {
  revenue:    "/dashboard/super-admin/revenue",
  accounts:   "/dashboard/super-admin/accounts",
  audit_logs: "/dashboard/super-admin/audit",
  qr_codes:   "/dashboard/super-admin/qr-codes",
};

export default async function SuperAdminRoot() {
  const session = await getCurrentProfile();

  if (!session) {
    redirect("/auth/login");
  }

  const { role, permissions } = session.profile;

  // Super admin always goes to revenue
  if (role === "super_admin") {
    redirect("/dashboard/super-admin/revenue");
  }

  // Admin: redirect to first module they have permission for
  for (const [perm, route] of Object.entries(PERMISSION_ROUTES)) {
    if (permissions.includes(perm)) {
      redirect(route);
    }
  }

  // No matching permission — send to unauthorized
  redirect("/auth/unauthorized");
}
