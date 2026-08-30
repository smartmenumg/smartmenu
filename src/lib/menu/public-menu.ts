import { createAdminClient } from "@/lib/supabase/server";

export interface PublicCategory {
  id: string;
  name: string;
  display_order: number;
}

export interface PublicCustomization {
  id: string;
  product_id: string;
  name: string;
  price_adjustment: number; // in paise
}

export interface PublicProduct {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number; // in paise
  original_price: number | null; // in paise
  image_url: string | null;
  is_combo: boolean;
  has_customizations: boolean;
  gst_rate_percent: number;
  available: boolean;
  customizations?: PublicCustomization[];
}

export interface PublicAuditorium {
  id: string;
  name: string;
  total_seats: number;
  display_order: number;
}

function getTodayDayOfWeekIST(): number {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 3600000 * 5.5);
  return istDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

/**
 * Fetch all public menu data for the customer ordering page.
 * Uses admin client server-side so RLS doesn't block public access.
 * All filters are enforced here (active=true, available=true).
 */
export async function getPublicMenu(theatreId: string) {
  const client = await createAdminClient();
  const todayDayOfWeek = getTodayDayOfWeekIST();

  const [categoriesRes, productsRes, auditoriumsRes, customizationsRes, dayPricingRes] = await Promise.all([
    client
      .from("categories")
      .select("id, name, display_order")
      .eq("theatre_id", theatreId)
      .eq("active", true)
      .order("display_order", { ascending: true })
      .returns<PublicCategory[]>(),

    client
      .from("products")
      .select("id, category_id, name, description, price, original_price, image_url, is_combo, has_customizations, has_day_pricing, gst_rate_percent, available")
      .eq("theatre_id", theatreId)
      .eq("active", true)
      .eq("available", true)
      .order("name", { ascending: true })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .returns<any[]>(),

    client
      .from("auditoriums")
      .select("id, name, total_seats, display_order")
      .eq("theatre_id", theatreId)
      .eq("active", true)
      .order("display_order", { ascending: true })
      .returns<PublicAuditorium[]>(),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any)
      .from("product_customizations")
      .select("id, product_id, name, price_adjustment")
      .eq("active", true),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any)
      .from("product_day_pricing")
      .select("product_id, day_of_week, price, original_price")
      .eq("day_of_week", todayDayOfWeek)
      .eq("is_active", true),
  ]);

  const rawProducts = productsRes.data ?? [];
  const rawCustomizations = (customizationsRes.data ?? []) as PublicCustomization[];
  const dayPricings = (dayPricingRes.data ?? []) as Array<{
    product_id: string;
    day_of_week: number;
    price: number;
    original_price: number | null;
  }>;

  const dayPricingMap = new Map(dayPricings.map((dp) => [dp.product_id, dp]));

  // Attach customizations and apply day-wise pricing overrides
  const productsWithCustomizations: PublicProduct[] = rawProducts.map((p) => {
    let effectivePrice = p.price;
    let effectiveOriginalPrice = p.original_price;

    if (p.has_day_pricing) {
      const override = dayPricingMap.get(p.id);
      if (override) {
        effectivePrice = override.price;
        effectiveOriginalPrice = override.original_price ?? effectiveOriginalPrice;
      }
    }

    return {
      id: p.id,
      category_id: p.category_id,
      name: p.name,
      description: p.description,
      price: effectivePrice,
      original_price: effectiveOriginalPrice,
      image_url: p.image_url,
      is_combo: p.is_combo,
      has_customizations: p.has_customizations,
      gst_rate_percent: p.gst_rate_percent,
      available: p.available,
      customizations: rawCustomizations.filter((c) => c.product_id === p.id),
    };
  });

  return {
    categories: categoriesRes.data ?? [],
    products: productsWithCustomizations,
    auditoriums: auditoriumsRes.data ?? [],
  };
}

/** Get the first active theatre (single-theatre MVP) */
export async function getActiveTheatre() {
  const client = await createAdminClient();
  const { data } = await client
    .from("theatres")
    .select("id, name, slug")
    .eq("active", true)
    .limit(1)
    .single<{ id: string; name: string; slug: string }>();
  return data;
}
