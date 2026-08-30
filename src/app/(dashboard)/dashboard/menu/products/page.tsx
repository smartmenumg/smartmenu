import { getCurrentProfile } from "@/lib/auth/actions";
import { getProducts } from "@/lib/menu/product-actions";
import { getCategories } from "@/lib/menu/category-actions";
import { redirect } from "next/navigation";
import { ProductsClient } from "./products-client";

export const metadata = {
  title: "Manage Products | Theatre Food Ordering",
};

export default async function ProductsPage() {
  const session = await getCurrentProfile();
  if (!session) {
    redirect("/auth/unauthorized");
  }

  const { role, permissions } = session.profile;
  const hasAccess = 
    role === "super_admin" || 
    role === "menu" ||
    (role === "admin" && permissions?.includes("menu"));

  if (!hasAccess) {
    redirect("/auth/unauthorized");
  }

  // Fetch both products and categories for the select dropdown
  const products = await getProducts(session.profile.theatre_id);
  const categories = await getCategories(session.profile.theatre_id);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Products</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage menu items, prices, and availability.
        </p>
      </div>
      
      <ProductsClient initialProducts={products} categories={categories} />
    </div>
  );
}
