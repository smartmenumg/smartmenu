import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/actions";
import { getProfiles } from "@/lib/admin/account-actions";
import { AccountsClient } from "./accounts-client";

export const metadata: Metadata = {
  title: "Accounts Management | CineBites",
  description: "Manage staff accounts and roles",
};

export default async function AccountsPage() {
  const session = await getCurrentProfile();
  
  if (!session) {
    redirect("/auth/unauthorized");
  }

  const { role, permissions } = session.profile;
  const hasAccess = 
    role === "super_admin" || 
    (role === "admin" && permissions?.includes("accounts"));

  if (!hasAccess) {
    redirect("/auth/unauthorized");
  }

  const profiles = await getProfiles();

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-white mb-2">
          Accounts Management
        </h1>
        <p className="text-slate-400">
          Manage staff access, roles, and suspend accounts.
        </p>
      </div>

      <AccountsClient initialProfiles={profiles} currentUserId={session.user.id} />
    </div>
  );
}
