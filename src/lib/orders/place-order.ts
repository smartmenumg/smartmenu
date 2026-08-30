"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { createOrderSchema } from "@/lib/validations/schemas";
import { randomUUID } from "crypto";

export interface PlaceOrderInput {
  customerName: string;
  mobile: string;
  auditoriumId: string;
  seatNumber: string;
  cartItems: {
    productId: string;
    quantity: number;
    customizations?: { id: string; name: string; price: number }[];
  }[];
}

export async function placeOrder(input: PlaceOrderInput): Promise<{ token?: string; error?: string }> {
  const sessionId = randomUUID();

  const parsed = createOrderSchema.safeParse({
    sessionId,
    customerName: input.customerName,
    mobile: input.mobile,
    auditoriumId: input.auditoriumId,
    seatNumber: input.seatNumber,
    cartItems: input.cartItems,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const adminClient = await createAdminClient();

  const productIds = Array.from(new Set(data.cartItems.map((item) => item.productId)));
  
  // Calculate today's day of week in IST
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 3600000 * 5.5);
  const todayDayOfWeek = istDate.getDay();

  const [productsRes, dayPricingRes, dbCustomizationsRes] = await Promise.all([
    adminClient
      .from("products")
      .select("id, price, has_day_pricing, gst_rate_percent, theatre_id")
      .in("id", productIds)
      .eq("active", true)
      .eq("available", true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .returns<any[]>(),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminClient as any)
      .from("product_day_pricing")
      .select("product_id, price")
      .in("product_id", productIds)
      .eq("day_of_week", todayDayOfWeek)
      .eq("is_active", true) as Promise<{ data: { product_id: string; price: number }[] | null }>,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminClient as any)
      .from("product_customizations")
      .select("id, product_id, name, price_adjustment")
      .in("product_id", productIds)
      .eq("active", true) as Promise<{ data: { id: string; product_id: string; name: string; price_adjustment: number }[] | null }>,
  ]);

  const products = productsRes.data;
  if (productsRes.error || !products || products.length === 0) {
    return { error: "One or more items are no longer available." };
  }

  const dayPricingMap = new Map((dayPricingRes.data ?? []).map((d) => [d.product_id, d.price]));

  const validCustomizationsMap = new Map<string, { id: string; name: string; price: number }>();
  if (dbCustomizationsRes.data) {
    for (const c of dbCustomizationsRes.data) {
      validCustomizationsMap.set(c.id, { id: c.id, name: c.name, price: c.price_adjustment });
    }
  }

  const theatreId = products[0].theatre_id;
  let subtotalAmount = 0;
  let totalGstAmount = 0;

  // Build the order items array with validated prices, customizations, and GST
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderItemsData: any[] = [];
  
  for (const item of data.cartItems) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      return { error: "An item in your cart is no longer available." };
    }
    
    // Validate each selected customization against the database price
    const validatedSelectedCustomizations: { id: string; name: string; price: number }[] = [];
    let customizationsPriceSum = 0;

    if (item.customizations && item.customizations.length > 0) {
      for (const sel of item.customizations) {
        const dbCustomization = validCustomizationsMap.get(sel.id);
        if (dbCustomization) {
          validatedSelectedCustomizations.push(dbCustomization);
          customizationsPriceSum += dbCustomization.price;
        }
      }
    }

    const baseProductPrice =
      product.has_day_pricing && dayPricingMap.has(product.id)
        ? dayPricingMap.get(product.id)!
        : product.price;

    const itemUnitPrice = baseProductPrice + customizationsPriceSum;
    const lineSubtotal = itemUnitPrice * item.quantity;
    const gstRate = product.gst_rate_percent ?? 5;
    const lineGst = Math.round((lineSubtotal * gstRate) / 100);

    subtotalAmount += lineSubtotal;
    totalGstAmount += lineGst;
    
    orderItemsData.push({
      product_id: item.productId,
      quantity: item.quantity,
      price_at_time: itemUnitPrice,
      gst_rate_percent: gstRate,
      gst_amount: lineGst,
      selected_customizations: validatedSelectedCustomizations,
    });
  }

  const totalAmount = subtotalAmount + totalGstAmount;

  // Generate a unique token for the customer to track their order
  const customerToken = randomUUID();

  // 2. Create the order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error: orderError } = await (adminClient as any)
    .from("orders")
    .insert({
      theatre_id: theatreId,
      customer_token: customerToken,
      customer_name: data.customerName,
      customer_mobile: data.mobile,
      auditorium_id: data.auditoriumId,
      seat_number: data.seatNumber,
      subtotal_amount: subtotalAmount,
      gst_amount: totalGstAmount,
      total_amount: totalAmount,
      status: "pending",
    })
    .select("id")
    .single() as { data: { id: string } | null; error: unknown };

  if (orderError || !order) {
    console.error("Order Insert Error:", orderError);
    return { error: "Failed to place order. Please try again." };
  }

  // 3. Create the order items
  const itemsWithOrderId = orderItemsData.map((item) => ({
    ...item,
    order_id: order.id,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: itemsError } = await (adminClient as any)
    .from("order_items")
    .insert(itemsWithOrderId);

  if (itemsError) {
    console.error("Failed to insert order items:", itemsError);
    return { error: "Failed to process order items." };
  }

  return { token: customerToken };
}
