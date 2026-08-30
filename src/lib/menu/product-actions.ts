"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { productSchema, productCustomizationSchema } from "@/lib/validations/schemas";
import { logAudit } from "@/lib/audit/logger";
import type { Product, ProductCustomization, ComboItem, ProductDayPricing } from "@/types/database";

const MENU_PATH = "/dashboard/menu/products";

// ─── Get all products for a theatre ──────────────────────────────────────────

export async function getProducts(theatreId: string): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(name)")
    .eq("theatre_id", theatreId)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  
  return data as unknown as Product[];
}

// ─── Create product ──────────────────────────────────────────────────────────

export async function createProduct(
  formData: FormData
): Promise<{ error?: string }> {
  const session = await requireRole("menu", "super_admin");

  const priceInput = formData.get("price") as string;
  const priceInPaise = Math.round(parseFloat(priceInput) * 100);

  const origPriceInput = formData.get("original_price") as string | null;
  const originalPriceInPaise = origPriceInput && parseFloat(origPriceInput) > 0
    ? Math.round(parseFloat(origPriceInput) * 100)
    : null;

  const gstInput = formData.get("gst_rate_percent") as string | null;
  const gstRate = gstInput !== null && !isNaN(parseInt(gstInput)) ? parseInt(gstInput) : 5;

  const parsed = productSchema.safeParse({
    category_id: formData.get("category_id"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: priceInPaise,
    original_price: originalPriceInPaise,
    image_url: formData.get("image_url") || undefined,
    is_combo: formData.get("is_combo") === "true",
    has_customizations: formData.get("has_customizations") === "true",
    gst_rate_percent: gstRate,
    available: formData.get("available") === "true",
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const adminClient = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from("products")
    .insert({
      theatre_id: session.theatreId,
      ...parsed.data,
      active: true,
    });

  if (error) return { error: error.message };

  revalidatePath(MENU_PATH);
  revalidatePath("/order");
  return {};
}

// ─── Update product ──────────────────────────────────────────────────────────

export async function updateProduct(
  id: string,
  formData: FormData
): Promise<{ error?: string }> {
  const session = await requireRole("menu", "super_admin");

  const priceInput = formData.get("price") as string;
  const priceInPaise = Math.round(parseFloat(priceInput) * 100);

  const origPriceInput = formData.get("original_price") as string | null;
  const originalPriceInPaise = origPriceInput && parseFloat(origPriceInput) > 0
    ? Math.round(parseFloat(origPriceInput) * 100)
    : null;

  const gstInput = formData.get("gst_rate_percent") as string | null;
  const gstRate = gstInput !== null && !isNaN(parseInt(gstInput)) ? parseInt(gstInput) : 5;

  const parsed = productSchema.safeParse({
    category_id: formData.get("category_id"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: priceInPaise,
    original_price: originalPriceInPaise,
    image_url: formData.get("image_url") || undefined,
    is_combo: formData.get("is_combo") === "true",
    has_customizations: formData.get("has_customizations") === "true",
    gst_rate_percent: gstRate,
    available: formData.get("available") === "true",
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const adminClient = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from("products")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { error: error.message };

  await logAudit({
    userId: session.user.id,
    action: "product.updated",
    entityType: "product",
    entityId: id,
    metadata: { name: parsed.data.name, price: parsed.data.price }
  });

  revalidatePath(MENU_PATH);
  revalidatePath("/order"); 
  return {};
}

// ─── Toggle product availability ─────────────────────────────────────────────

export async function toggleProductAvailability(
  id: string,
  available: boolean
): Promise<{ error?: string }> {
  const session = await requireRole("menu", "super_admin");

  const adminClient = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from("products")
    .update({ available })
    .eq("id", id);

  if (error) return { error: error.message };

  await logAudit({
    userId: session.user.id,
    action: "product.availability_changed",
    entityType: "product",
    entityId: id,
    metadata: { available }
  });

  revalidatePath(MENU_PATH);
  revalidatePath("/order");
  return {};
}

// ─── Delete (soft-delete) product ────────────────────────────────────────────

export async function deleteProduct(id: string): Promise<{ error?: string }> {
  const session = await requireRole("menu", "super_admin");

  const adminClient = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from("products")
    .update({ active: false })
    .eq("id", id);

  if (error) return { error: error.message };

  await logAudit({
    userId: session.user.id,
    action: "product.deleted",
    entityType: "product",
    entityId: id,
  });

  revalidatePath(MENU_PATH);
  revalidatePath("/order");
  return {};
}

// ─── Combos: Create Combo with Items ─────────────────────────────────────────

export async function createCombo(
  formData: FormData,
  items: { item_product_id: string; quantity: number }[]
): Promise<{ error?: string }> {
  const session = await requireRole("menu", "super_admin");

  if (!items || items.length === 0) {
    return { error: "A combo must include at least one item." };
  }

  const priceInput = formData.get("price") as string;
  const priceInPaise = Math.round(parseFloat(priceInput) * 100);

  const origPriceInput = formData.get("original_price") as string | null;
  const originalPriceInPaise = origPriceInput && parseFloat(origPriceInput) > 0
    ? Math.round(parseFloat(origPriceInput) * 100)
    : null;

  const gstInput = formData.get("gst_rate_percent") as string | null;
  const gstRate = gstInput !== null && !isNaN(parseInt(gstInput)) ? parseInt(gstInput) : 5;

  const parsed = productSchema.safeParse({
    category_id: formData.get("category_id"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: priceInPaise,
    original_price: originalPriceInPaise,
    image_url: formData.get("image_url") || undefined,
    is_combo: true,
    has_customizations: formData.get("has_customizations") === "true",
    gst_rate_percent: gstRate,
    available: formData.get("available") === "true",
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const adminClient = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: comboProduct, error: productError } = await (adminClient as any)
    .from("products")
    .insert({
      theatre_id: session.theatreId,
      ...parsed.data,
      is_combo: true,
      active: true,
    })
    .select("id")
    .single();

  if (productError || !comboProduct) return { error: productError?.message || "Failed to create combo product." };

  // Insert combo items
  const comboItemsData = items.map((it) => ({
    combo_product_id: comboProduct.id,
    item_product_id: it.item_product_id,
    quantity: it.quantity || 1,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: itemsError } = await (adminClient as any)
    .from("combo_items")
    .insert(comboItemsData);

  if (itemsError) return { error: itemsError.message };

  await logAudit({
    userId: session.user.id,
    action: "product.created",
    entityType: "combo_product",
    entityId: comboProduct.id,
    metadata: { name: parsed.data.name }
  });

  revalidatePath(MENU_PATH);
  revalidatePath("/order");
  return {};
}

// ─── Get Combo Items ─────────────────────────────────────────────────────────

export async function getComboItems(comboProductId: string): Promise<(ComboItem & { product: Product })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("combo_items")
    .select("*, product:products!combo_items_item_product_id_fkey(*)")
    .eq("combo_product_id", comboProductId);

  if (error) throw new Error(error.message);
  return data as unknown as (ComboItem & { product: Product })[];
}

// ─── Customizations Management ───────────────────────────────────────────────

export async function getProductCustomizations(productId: string): Promise<ProductCustomization[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_customizations")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as unknown as ProductCustomization[];
}

export async function createProductCustomization(
  productId: string,
  name: string,
  priceAdjustmentRupees: number
): Promise<{ error?: string }> {
  await requireRole("menu", "super_admin");

  const priceAdjustmentPaise = Math.round(priceAdjustmentRupees * 100);

  const parsed = productCustomizationSchema.safeParse({
    product_id: productId,
    name,
    price_adjustment: priceAdjustmentPaise,
    active: true,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const adminClient = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from("product_customizations")
    .insert(parsed.data);

  if (error) return { error: error.message };

  // Make sure product's has_customizations is set to true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from("products")
    .update({ has_customizations: true })
    .eq("id", productId);

  revalidatePath(MENU_PATH);
  revalidatePath("/order");
  return {};
}

export async function deleteProductCustomization(
  customizationId: string,
  productId: string
): Promise<{ error?: string }> {
  await requireRole("menu", "super_admin");

  const adminClient = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from("product_customizations")
    .delete()
    .eq("id", customizationId);

  if (error) return { error: error.message };

  // Check if there are remaining customizations for this product
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: remaining } = await (adminClient as any)
    .from("product_customizations")
    .select("id")
    .eq("product_id", productId);

  if (!remaining || remaining.length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from("products")
      .update({ has_customizations: false })
      .eq("id", productId);
  }

  revalidatePath(MENU_PATH);
  revalidatePath("/order");
  return {};
}

// ─── Day-Wise Pricing Actions ────────────────────────────────────────────────

export async function getProductDayPricing(
  productId: string
): Promise<ProductDayPricing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_day_pricing")
    .select("*")
    .eq("product_id", productId)
    .order("day_of_week", { ascending: true });

  if (error) {
    console.error("Failed to fetch day pricing:", error);
    return [];
  }
  return data as unknown as ProductDayPricing[];
}

export async function saveProductDayPricing(
  input: {
    productId: string;
    hasDayPricing: boolean;
    dayPrices: Array<{
      day_of_week: number;
      price: number; // in paise
      original_price?: number | null; // in paise
      is_active: boolean;
    }>;
  }
): Promise<{ error?: string }> {
  await requireRole("menu", "super_admin");

  const adminClient = await createAdminClient();

  // 1. Update product toggle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: prodErr } = await (adminClient as any)
    .from("products")
    .update({ has_day_pricing: input.hasDayPricing })
    .eq("id", input.productId);

  if (prodErr) return { error: prodErr.message };

  if (input.hasDayPricing && input.dayPrices.length > 0) {
    // 2. Upsert day pricing rows
    const rows = input.dayPrices.map((d) => ({
      product_id: input.productId,
      day_of_week: d.day_of_week,
      price: d.price,
      original_price: d.original_price && d.original_price > d.price ? d.original_price : null,
      is_active: d.is_active,
      updated_at: new Date().toISOString(),
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertErr } = await (adminClient as any)
      .from("product_day_pricing")
      .upsert(rows, { onConflict: "product_id,day_of_week" });

    if (upsertErr) return { error: upsertErr.message };
  }

  revalidatePath(MENU_PATH);
  revalidatePath("/order");
  return {};
}

