import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createCashfreeOrder } from "@/lib/payments/cashfree";
import { paiseToRupees } from "@/lib/utils";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerName, mobile, auditoriumId, seatNumber, cartItems } = body;

    if (!customerName || !mobile || !auditoriumId || !seatNumber || !cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "Missing required order details." }, { status: 400 });
    }

    const adminClient = await createAdminClient();

    // 1. Fetch products & Day-Wise pricing to calculate amounts securely
    const productIds = Array.from(new Set(cartItems.map((i: { productId: string }) => i.productId)));

    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const istDate = new Date(utc + 3600000 * 5.5);
    const todayDayOfWeek = istDate.getDay();

    const [productsRes, dayPricingRes, customizationsRes] = await Promise.all([
      adminClient
        .from("products")
        .select("id, name, price, has_day_pricing, gst_rate_percent, theatre_id")
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
    if (!products || products.length === 0) {
      return NextResponse.json({ error: "Selected products are unavailable." }, { status: 400 });
    }

    const dayPricingMap = new Map((dayPricingRes.data ?? []).map((d) => [d.product_id, d.price]));
    const customMap = new Map<string, { id: string; name: string; price: number }>();
    for (const c of customizationsRes.data ?? []) {
      customMap.set(c.id, { id: c.id, name: c.name, price: c.price_adjustment });
    }

    const theatreId = products[0].theatre_id;
    let subtotalAmount = 0;
    let totalGstAmount = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderItemsToInsert: any[] = [];

    for (const item of cartItems) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;

      const basePrice =
        product.has_day_pricing && dayPricingMap.has(product.id)
          ? dayPricingMap.get(product.id)!
          : product.price;

      let customSum = 0;
      const validCustoms: { id: string; name: string; price: number }[] = [];
      if (item.customizations) {
        for (const sel of item.customizations) {
          const dbCust = customMap.get(sel.id);
          if (dbCust) {
            validCustoms.push(dbCust);
            customSum += dbCust.price;
          }
        }
      }

      const unitPrice = basePrice + customSum;
      const lineSubtotal = unitPrice * item.quantity;
      const gstRate = product.gst_rate_percent ?? 5;
      const lineGst = Math.round((lineSubtotal * gstRate) / 100);

      subtotalAmount += lineSubtotal;
      totalGstAmount += lineGst;

      orderItemsToInsert.push({
        product_id: product.id,
        product_name: product.name,
        unit_price: unitPrice,
        quantity: item.quantity,
        subtotal: lineSubtotal,
        gst_rate_percent: gstRate,
        gst_amount: lineGst,
        selected_customizations: validCustoms,
      });
    }

    const totalAmount = subtotalAmount + totalGstAmount;
    const orderId = randomUUID();
    const trackingToken = randomUUID();

    // 2. Insert Order (Pending Payment)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: orderError } = await (adminClient as any).from("orders").insert({
      id: orderId,
      theatre_id: theatreId,
      tracking_token: trackingToken,
      customer_name: customerName,
      mobile: mobile,
      auditorium_id: auditoriumId,
      seat_number: seatNumber,
      subtotal_amount: subtotalAmount,
      gst_amount: totalGstAmount,
      total_amount: totalAmount,
      status: "pending_payment",
    });

    if (orderError) {
      console.error("Failed to insert order:", orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // Insert Order Items
    const itemsWithOrderId = orderItemsToInsert.map((item) => ({
      ...item,
      order_id: orderId,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any).from("order_items").insert(itemsWithOrderId);

    // 3. Create Cashfree Order

    const orderAmountRupees = paiseToRupees(totalAmount);

    const cfRes = await createCashfreeOrder({
      orderId: orderId,
      orderAmountRupees,
      customerName,
      customerPhone: mobile,
      returnUrl: `https://webhook.site/dummy-return-url?order_id=${orderId}`,
    });

    if (cfRes.error || !cfRes.data) {
      return NextResponse.json(
        { error: cfRes.error || "Failed to initialize payment gateway." },
        { status: 500 }
      );
    }

    // 4. Save Payment Record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any).from("payments").insert({
      order_id: orderId,
      gateway: "cashfree",
      cf_order_id: cfRes.data.cf_order_id,
      payment_session_id: cfRes.data.payment_session_id,
      amount: totalAmount,
      currency: "INR",
      status: "created",
    });

    return NextResponse.json({
      orderId,
      trackingToken,
      paymentSessionId: cfRes.data.payment_session_id,
      totalAmountPaise: totalAmount,
      environment: process.env.CASHFREE_ENV || "sandbox",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
