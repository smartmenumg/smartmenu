import { getCurrentProfile } from "@/lib/auth/actions";
import { getCategories } from "@/lib/menu/category-actions";
import { redirect } from "next/navigation";
import { CategoriesClient } from "./categories-client";

export const metadata = {
  title: "Manage Categories | Theatre Food Ordering",
};

export default async function CategoriesPage() {
  const session = await getCurrentProfile();
  if (!session || !["menu", "super_admin"].includes(session.profile.role)) {
    redirect("/auth/unauthorized");
  }

  const categories = await getCategories(session.profile.theatre_id);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Categories</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage product categories and their display order on the menu.
        </p>
      </div>
      
      <CategoriesClient initialCategories={categories} />
    </div>
  );
}
