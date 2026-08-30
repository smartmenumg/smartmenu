"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { categorySchema } from "@/lib/validations/schemas";
import type { Category } from "@/types/database";

const MENU_PATH = "/dashboard/menu/categories";

// ─── Get all categories for a theatre ────────────────────────────────────────

export async function getCategories(theatreId: string): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("theatre_id", theatreId)
    .eq("active", true)
    .order("display_order", { ascending: true })
    .returns<Category[]>();

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Create category ──────────────────────────────────────────────────────────

export async function createCategory(
  formData: FormData
): Promise<{ error?: string }> {
  const session = await requireRole("menu", "super_admin");

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    display_order: Number(formData.get("display_order") ?? 0),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const adminClient = await createAdminClient();

  // Get max display_order to append by default
  const { data: existing } = await adminClient
    .from("categories")
    .select("display_order")
    .eq("theatre_id", session.theatreId)
    .order("display_order", { ascending: false })
    .limit(1)
    .returns<{ display_order: number }[]>();

  const nextOrder = (existing?.[0]?.display_order ?? 0) + 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from("categories")
    .insert({
      theatre_id: session.theatreId,
      name: parsed.data.name,
      display_order: parsed.data.display_order || nextOrder,
      active: true,
    });

  if (error) {
    if (error.code === "23505") return { error: "A category with this name already exists." };
    return { error: error.message };
  }

  revalidatePath(MENU_PATH);
  return {};
}

// ─── Update category ──────────────────────────────────────────────────────────

export async function updateCategory(
  id: string,
  formData: FormData
): Promise<{ error?: string }> {
  await requireRole("menu", "super_admin");

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    display_order: Number(formData.get("display_order") ?? 0),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const adminClient = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from("categories")
    .update({ name: parsed.data.name, display_order: parsed.data.display_order })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "A category with this name already exists." };
    return { error: error.message };
  }

  revalidatePath(MENU_PATH);
  return {};
}

// ─── Delete (soft-delete) category ───────────────────────────────────────────

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  await requireRole("menu", "super_admin");

  const adminClient = await createAdminClient();

  // Block if any products are using this category
  const { count } = await adminClient
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id)
    .eq("active", true);

  if (count && count > 0) {
    return { error: `Cannot delete: ${count} product(s) are using this category. Move or delete them first.` };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any).from("categories").update({ active: false }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(MENU_PATH);
  return {};
}
