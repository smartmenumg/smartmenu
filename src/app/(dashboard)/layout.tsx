import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/actions";
import { DashboardShell } from "@/components/admin/dashboard-shell";
import {
  getAllTheatres,
  getActiveTheatreName,
  THEATRE_COOKIE,
} from "@/lib/theatre-context";
import { cookies } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentProfile();
  if (!session) redirect("/auth/login");

  const { role } = session.profile;

  // Only fetch theatre data for super_admin
  let theatres = null;
  let activeTheatreId: string | null = null;
  let activeTheatreName = "";

  if (role === "super_admin") {
    const [allTheatres, theatreName, cookieStore] = await Promise.all([
      getAllTheatres(),
      getActiveTheatreName(),
      cookies(),
    ]);
    theatres = allTheatres;
    activeTheatreId = cookieStore.get(THEATRE_COOKIE)?.value ?? null;
    activeTheatreName = theatreName;
  }

  return (
    <DashboardShell
      profile={session.profile}
      user={session.user}
      theatres={theatres}
      activeTheatreId={activeTheatreId}
      activeTheatreName={activeTheatreName}
    >
      {children}
    </DashboardShell>
  );
}
