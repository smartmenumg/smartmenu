import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/actions";
import { DashboardShell } from "@/components/admin/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentProfile();
  if (!session) redirect("/auth/login");

  return (
    <DashboardShell profile={session.profile} user={session.user}>
      {children}
    </DashboardShell>
  );
}
