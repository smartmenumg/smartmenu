"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PublicCategory, PublicProduct, PublicAuditorium, PublicCustomization } from "@/lib/menu/public-menu";
import { useCart, CartCustomization } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/utils";
import { ShoppingCart, Plus, Minus, X, UtensilsCrossed, ChevronRight, Loader2, CheckCircle2, Sliders, Package } from "lucide-react";

import { loadCashfreeSDK } from "@/lib/payments/cashfree-client";

interface MenuClientProps {
  theatreName: string;
  categories: PublicCategory[];
  products: PublicProduct[];
  auditoriums: PublicAuditorium[];
  /** Pre-fill values from QR code scan (?audi=&seat= params) */
  qrAudiId?: string | null;
  qrSeat?: string | null;
}

type CheckoutStep = "menu" | "details" | "placing" | "verifying" | "success";

export function MenuClient({ theatreName, categories, products, auditoriums, qrAudiId, qrSeat }: MenuClientProps) {
  const cart = useCart();
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [cartOpen, setCartOpen] = useState(false);
  const [step, setStep] = useState<CheckoutStep>("menu");
  const [orderToken, setOrderToken] = useState<string | null>(null);

  // Customization modal state
  const [customizingProduct, setCustomizingProduct] = useState<PublicProduct | null>(null);
  const [selectedCustomizations, setSelectedCustomizations] = useState<CartCustomization[]>([]);

  // Verify that the qrAudiId from URL actually matches a real auditorium in this theatre
  const validQrAudi = auditoriums.find((a) => a.id === qrAudiId) ?? null;
  const isQrScan = !!(validQrAudi && qrSeat);

  // Checkout form state — pre-filled from QR scan if available
  const [formData, setFormData] = useState({
    customerName: "",
    mobile: "",
    auditoriumId: validQrAudi?.id ?? "",
    seatNumber: qrSeat ?? "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Filter products by active category
  const filteredProducts =
    activeCategoryId === "all"
      ? products
      : products.filter((p) => p.category_id === activeCategoryId);

  // Group products by their category for "All" view
  const productsByCategory = categories.map((cat) => ({
    ...cat,
    products: products.filter((p) => p.category_id === cat.id),
  }));

  const handleProductAddClick = (product: PublicProduct) => {
    if (product.has_customizations && product.customizations && product.customizations.length > 0) {
      setCustomizingProduct(product);
      setSelectedCustomizations([]);
    } else {
      cart.addItem(product, []);
    }
  };

  const handleToggleCustomizationOption = (cust: PublicCustomization) => {
    setSelectedCustomizations((prev) => {
      const exists = prev.some((c) => c.id === cust.id);
      if (exists) {
        return prev.filter((c) => c.id !== cust.id);
      } else {
        return [...prev, { id: cust.id, name: cust.name, price: cust.price_adjustment }];
      }
    });
  };

  const handleConfirmCustomization = () => {
    if (!customizingProduct) return;
    cart.addItem(customizingProduct, selectedCustomizations);
    setCustomizingProduct(null);
    setSelectedCustomizations([]);
  };

  const handlePlaceOrder = async () => {
    if (!formData.customerName.trim() || !formData.mobile.trim() || !formData.auditoriumId || !formData.seatNumber.trim()) {
      setFormError("Please fill in all fields.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
      setFormError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setFormError(null);
    setStep("placing");

    try {
      // 1. Create order & Cashfree session
      const createRes = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formData.customerName.trim(),
          mobile: formData.mobile,
          auditoriumId: formData.auditoriumId,
          seatNumber: formData.seatNumber.trim(),
          cartItems: cart.items.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            customizations: i.customizations,
          })),
        }),
      });

      const orderData = await createRes.json();

      if (!createRes.ok || orderData.error) {
        setFormError(orderData.error || "Failed to initialize order.");
        setStep("details");
        return;
      }

      // 2. Load Cashfree Checkout SDK
      const Cashfree = await loadCashfreeSDK();
      const { orderId, trackingToken } = orderData;
      if (!orderData.paymentSessionId || !orderId) {
        throw new Error("Invalid payment gateway response.");
      }

      // 3. Trigger Cashfree Checkout Modal
      const cashfreeInstance = Cashfree({
        mode: orderData.environment || "sandbox",
      });

      await cashfreeInstance.checkout({
        paymentSessionId: orderData.paymentSessionId,
        redirectTarget: "_modal",
      });

      setStep("verifying");

      // 4. Verify Payment after modal closes
      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        setOrderToken(trackingToken);
        try {
          const stored = JSON.parse(localStorage.getItem("order_history") ?? "[]") as string[];
          localStorage.setItem("order_history", JSON.stringify([trackingToken, ...stored].slice(0, 10)));
        } catch {
          // ignore
        }
        cart.clearCart();
        setStep("success");
      } else {
        setFormError(verifyData.error || "Payment was not completed. Please try again.");
        setStep("details");
      }
    } catch (err: unknown) {
      console.error("Payment error:", err);
      setFormError(err instanceof Error ? err.message : "An unexpected error occurred during payment.");
      setStep("details");
    }
  };

  return (
    <div className="min-h-screen text-white" style={{background:"#080808"}}>
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/[0.06]" style={{background:"rgba(8,8,8,0.93)"}}>
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:"linear-gradient(135deg,#f59e0b,#d97706)",boxShadow:"0 4px 14px rgba(245,158,11,0.35)"}}>
              <UtensilsCrossed className="w-4 h-4 text-black" />
            </div>
            <div>
              <p className="font-display font-semibold text-white text-base leading-none tracking-tight">{theatreName}</p>
              {isQrScan ? (
                <p className="text-[10px] text-emerald-400 font-bold tracking-[0.1em] uppercase mt-0.5 flex items-center gap-1">
                  <span>●</span> Seat {qrSeat} Locked
                </p>
              ) : (
                <p className="text-[10px] text-amber-500/60 font-medium tracking-[0.2em] uppercase mt-0.5">Menu</p>
              )}
            </div>
          </div>

          {cart.mounted && (
            <div className="flex items-center gap-2">
              <Link
                href="/my-orders"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/50 hover:text-white border border-white/[0.08] hover:border-white/[0.15] transition-all"
              >
                <Package className="w-3.5 h-3.5" />
                Orders
              </Link>
              <button
                onClick={() => setCartOpen(true)}
                className="relative flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all btn-gold"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Cart</span>
                {cart.totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-black border-2 border-black">
                    {cart.totalItems}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Category Pills ──────────────────────────────────────────── */}
      {categories.length > 0 && (
        <div className="sticky top-16 z-30 backdrop-blur-xl border-b border-white/[0.05]" style={{background:"rgba(8,8,8,0.88)"}}>
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveCategoryId("all")}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all ${
                  activeCategoryId === "all"
                    ? "btn-gold shadow-none"
                    : "border border-white/10 text-white/60 hover:border-amber-500/40 hover:text-white"
                }`}
              >
                ✦ All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all ${
                    activeCategoryId === cat.id
                      ? "btn-gold shadow-none"
                      : "border border-white/10 text-white/60 hover:border-amber-500/40 hover:text-white"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-6 pb-28">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
              <UtensilsCrossed className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-slate-400 text-center">
              Our menu is being updated.<br />Please check back shortly.
            </p>
          </div>
        ) : activeCategoryId === "all" ? (
          // All items grouped by category
          <div className="space-y-8">
            {productsByCategory.filter((c) => c.products.length > 0).map((cat) => (
              <section key={cat.id}>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  {cat.name}
                  <span className="text-xs text-slate-500 font-normal">({cat.products.length})</span>
                </h2>
                <ProductGrid
                  products={cat.products}
                  getProductQuantity={cart.getProductQuantity}
                  onAddClick={handleProductAddClick}
                />
              </section>
            ))}
          </div>
        ) : (
          // Single category
          <ProductGrid
            products={filteredProducts}
            getProductQuantity={cart.getProductQuantity}
            onAddClick={handleProductAddClick}
          />
        )}
      </main>

      {/* ── Floating "View Cart" bar ────────────────────────────────── */}
      {cart.mounted && cart.totalItems > 0 && !cartOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4" style={{background:"linear-gradient(to top, #080808 0%, transparent 100%)"}}>
          <button
            onClick={() => setCartOpen(true)}
            className="animate-slide-up w-full max-w-lg mx-auto flex items-center justify-between px-5 py-4 rounded-2xl btn-gold"
          >
            <span className="w-7 h-7 rounded-full bg-black/25 flex items-center justify-center text-sm font-black">
              {cart.totalItems}
            </span>
            <span className="font-display font-semibold text-base tracking-tight">View Cart</span>
            <span className="font-bold">{formatPrice(cart.totalPaise)}</span>
          </button>
        </div>
      )}

      {/* ── Customization Selection Modal ────────────────────────────── */}
      {customizingProduct && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setCustomizingProduct(null)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] flex flex-col rounded-t-3xl bg-slate-900 border-t border-slate-700 shadow-2xl overflow-hidden sm:max-w-md sm:left-1/2 sm:-translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  Customize {customizingProduct.name}
                </h3>
                <p className="text-xs text-slate-400">Select add-ons and preferences</p>
              </div>
              <button
                onClick={() => setCustomizingProduct(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Available Add-ons</p>
              {customizingProduct.customizations?.map((cust) => {
                const isSelected = selectedCustomizations.some((c) => c.id === cust.id);
                return (
                  <div
                    key={cust.id}
                    onClick={() => handleToggleCustomizationOption(cust)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-amber-500/10 border-amber-500 text-white shadow-sm shadow-amber-500/10"
                        : "bg-slate-800/60 border-slate-700/80 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500 accent-amber-500"
                      />
                      <span className="text-sm font-medium">{cust.name}</span>
                    </div>
                    <span className="text-sm font-bold text-amber-400">
                      {cust.price_adjustment > 0 ? `+${formatPrice(cust.price_adjustment)}` : "Free"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/90">
              <button
                onClick={handleConfirmCustomization}
                className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold transition-all text-sm"
              >
                <span>Add to Cart</span>
                <span>
                  {formatPrice(
                    customizingProduct.price +
                      selectedCustomizations.reduce((sum, c) => sum + c.price, 0)
                  )}
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Cart Drawer ─────────────────────────────────────────────── */}
      {cartOpen && (
        <>
          <div
            className="fixed inset-0 z-50 backdrop-blur-md"
            style={{background:"rgba(0,0,0,0.8)"}}
            onClick={() => step === "menu" && setCartOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] flex flex-col rounded-t-3xl border-t border-white/[0.08] shadow-2xl overflow-hidden sm:max-w-md sm:left-auto sm:right-4 sm:bottom-4 sm:rounded-2xl sm:max-h-[85vh] animate-slide-up" style={{background:"#0e0e0e"}}>
            {step === "menu" && (
              <CartView
                cart={cart}
                onClose={() => setCartOpen(false)}
                onCheckout={() => setStep("details")}
              />
            )}
            {step === "details" && (
              <CheckoutForm
                cart={cart}
                auditoriums={auditoriums}
                formData={formData}
                setFormData={setFormData}
                formError={formError}
                onBack={() => setStep("menu")}
                onSubmit={handlePlaceOrder}
                isQrScan={isQrScan}
              />
            )}
            {step === "placing" && (
              <div className="flex flex-col items-center justify-center gap-4 p-12">
                <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                <p className="text-slate-300 font-medium">Opening secure checkout…</p>
              </div>
            )}
            {step === "verifying" && (
              <div className="flex flex-col items-center justify-center gap-4 p-12">
                <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                <p className="text-slate-300 font-medium">Verifying payment status…</p>
              </div>
            )}
            {step === "success" && orderToken && (
              <SuccessView
                token={orderToken}
                onClose={() => {
                  setCartOpen(false);
                  setStep("menu");
                  setOrderToken(null);
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── ProductGrid ──────────────────────────────────────────────────────────────

function ProductGrid({
  products,
  getProductQuantity,
  onAddClick,
}: {
  products: PublicProduct[];
  getProductQuantity: (id: string) => number;
  onAddClick: (p: PublicProduct) => void;
}) {
  if (products.length === 0) {
    return <p className="text-slate-500 text-sm py-6">No items in this category right now.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          totalQtyInCart={getProductQuantity(product.id)}
          onAddClick={() => onAddClick(product)}
        />
      ))}
    </div>
  );
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({
  product,
  totalQtyInCart,
  onAddClick,
}: {
  product: PublicProduct;
  totalQtyInCart: number;
  onAddClick: () => void;
}) {
  const discountPercent =
    product.original_price && product.original_price > product.price
      ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
      : null;

  return (
    <div className="cinema-card group flex flex-col rounded-2xl overflow-hidden">
      {/* Image */}
      <div className="relative aspect-[4/3]" style={{background:"#111"}}>
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <UtensilsCrossed className="w-10 h-10" style={{color:"#222"}} />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
          {product.is_combo && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider" style={{background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#000"}}>
              ✦ COMBO
            </span>
          )}
          {discountPercent !== null && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black" style={{background:"#16a34a",color:"#fff"}}>
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Qty indicator */}
        {totalQtyInCart > 0 && (
          <div className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black" style={{background:"#f59e0b",color:"#000"}}>
            {totalQtyInCart}
          </div>
        )}

        <div className="absolute inset-0" style={{background:"linear-gradient(to top, rgba(8,8,8,0.95) 0%, rgba(8,8,8,0.1) 55%, transparent 100%)"}} />
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1 gap-2 -mt-6 relative z-10">
        <div className="flex-1">
          <p className="font-semibold text-sm text-white leading-snug line-clamp-2">{product.name}</p>
          {product.description && (
            <p className="text-[11px] mt-0.5" style={{color:"rgba(255,255,255,0.4)"}}>{product.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-1">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-black" style={{color:"#f59e0b"}}>{formatPrice(product.price)}</span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-[11px] line-through" style={{color:"rgba(255,255,255,0.25)"}}>
                  {formatPrice(product.original_price)}
                </span>
              )}
            </div>
            {product.has_customizations && (
              <p className="text-[10px] font-medium" style={{color:"rgba(245,158,11,0.7)"}}>
                <Sliders className="inline w-2.5 h-2.5 mr-0.5" />Customizable
              </p>
            )}
          </div>

          <button
            onClick={onAddClick}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 btn-gold"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CartView ─────────────────────────────────────────────────────────────────

function CartView({
  cart,
  onClose,
  onCheckout,
}: {
  cart: ReturnType<typeof useCart>;
  onClose: () => void;
  onCheckout: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
        <h2 className="font-display font-bold text-xl text-white">Your Cart</h2>
        <button onClick={onClose} className="p-2 rounded-xl transition-colors" style={{color:"rgba(255,255,255,0.4)",background:"rgba(255,255,255,0.05)"}}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <ShoppingCart className="w-10 h-10 text-slate-600" />
            <p className="text-slate-500 text-sm">Your cart is empty</p>
          </div>
        ) : (
          cart.items.map((item) => (
            <div key={item.cartItemId} className="flex items-start gap-3 p-2.5 rounded-xl border" style={{background:"rgba(255,255,255,0.03)",borderColor:"rgba(255,255,255,0.07)"}}>
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 mt-0.5">
                {item.product.image_url ? (
                  <Image src={item.product.image_url} alt={item.product.name} fill sizes="48px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UtensilsCrossed className="w-5 h-5 text-slate-600" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{item.product.name}</p>
                {item.product.description && (
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{item.product.description}</p>
                )}
                {item.customizations && item.customizations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {item.customizations.map((c) => (
                      <span key={c.id} className="text-[10px] bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded border border-slate-700">
                        +{c.name} {c.price > 0 && `(${formatPrice(c.price)})`}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-amber-400 font-semibold mt-1">
                  {formatPrice(item.unitPricePaise)} each
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => cart.updateQuantity(item.cartItemId, item.quantity - 1)}
                  className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-bold text-white w-4 text-center">{item.quantity}</span>
                <button
                  onClick={() => cart.updateQuantity(item.cartItemId, item.quantity + 1)}
                  className="w-6 h-6 rounded bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-slate-900"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {cart.items.length > 0 && (
        <div className="p-4 border-t border-white/[0.07] space-y-3" style={{background:"rgba(12,12,12,0.97)"}}>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span>Subtotal</span>
              <span className="text-slate-200">{formatPrice(cart.subtotalPaise)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>GST / Taxes</span>
              <span className="text-slate-200">{formatPrice(cart.totalGstPaise)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-bold pt-1.5 border-t border-slate-800">
              <span className="text-white">Total</span>
              <span className="text-amber-400">{formatPrice(cart.totalPaise)}</span>
            </div>
          </div>
          <button
            onClick={onCheckout}
            className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl font-bold btn-gold"
          >
            <span className="font-display text-base">Proceed to Checkout</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
}

// ─── CheckoutForm ─────────────────────────────────────────────────────────────

function CheckoutForm({
  cart,
  auditoriums,
  formData,
  setFormData,
  formError,
  onBack,
  onSubmit,
  isQrScan,
}: {
  cart: ReturnType<typeof useCart>;
  auditoriums: PublicAuditorium[];
  formData: { customerName: string; mobile: string; auditoriumId: string; seatNumber: string };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  formError: string | null;
  onBack: () => void;
  onSubmit: () => void;
  /** When true, auditorium and seat were pre-filled from a QR scan and should be locked */
  isQrScan?: boolean;
}) {
  const set = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.07]">
        <button onClick={onBack} className="p-2 rounded-xl transition-colors" style={{color:"rgba(255,255,255,0.4)",background:"rgba(255,255,255,0.05)"}}>
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
        <h2 className="font-display font-bold text-xl text-white">Your Details</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {isQrScan && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-emerald-400 text-xs">📲</span>
            <p className="text-emerald-300 text-xs font-medium">
              Seat detected from QR code — locked automatically.
            </p>
          </div>
        )}

        {formError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {formError}
          </div>
        )}

        {[
          {label:"Your Name", type:"text", key:"customerName" as const, placeholder:"e.g. Rahul Sharma"},
          {label:"Mobile Number", type:"tel", key:"mobile" as const, placeholder:"10-digit number", inputMode:"numeric" as const, maxLength:10},
          {label:"Seat Number", type:"text", key:"seatNumber" as const, placeholder:"e.g. A12"},
        ].map(({label, type, key, placeholder, ...rest}) => {
          const isLocked = isQrScan && key === "seatNumber";
          return (
          <div key={key} className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest" style={{color:"rgba(245,158,11,0.7)"}}>
              {label}{isLocked && <span className="ml-2 text-emerald-400 text-[9px]">🔒 AUTO</span>}
            </label>
            <input
              type={type}
              value={formData[key]}
              onChange={isLocked ? undefined : set(key)}
              readOnly={isLocked}
              placeholder={placeholder}
              {...rest}
              className="w-full px-4 py-3 rounded-xl text-white text-sm border outline-none transition-colors"
              style={{
                background: isLocked ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.05)",
                borderColor: isLocked ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.1)",
                cursor: isLocked ? "default" : "text",
              }}
              onFocus={isLocked ? undefined : e => (e.target.style.borderColor="rgba(245,158,11,0.6)")}
              onBlur={isLocked ? undefined : e => (e.target.style.borderColor="rgba(255,255,255,0.1)")}
            />
          </div>
        )})}

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest" style={{color:"rgba(245,158,11,0.7)"}}>
            Auditorium / Screen{isQrScan && <span className="ml-2 text-emerald-400 text-[9px]">🔒 AUTO</span>}
          </label>
          <select
            value={formData.auditoriumId}
            onChange={isQrScan ? undefined : set("auditoriumId")}
            disabled={isQrScan}
            className="w-full px-4 py-3 rounded-xl text-white text-sm border outline-none transition-colors"
            style={{
              background: isQrScan ? "rgba(16,185,129,0.08)" : "rgba(20,20,20,0.95)",
              borderColor: isQrScan ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.1)",
              cursor: isQrScan ? "default" : "auto",
            }}
          >
            <option value="">Select screen</option>
            {auditoriums.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        {/* Order summary */}
        <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Order Summary</p>
          {cart.items.map((item) => (
            <div key={item.cartItemId} className="flex justify-between text-sm py-1 border-b border-slate-800/60 last:border-0">
              <div>
                <span className="text-slate-200">{item.product.name} × {item.quantity}</span>
                {item.customizations && item.customizations.length > 0 && (
                  <p className="text-[11px] text-amber-400/80">
                    + {item.customizations.map((c) => c.name).join(", ")}
                  </p>
                )}
              </div>
              <span className="text-slate-400 font-medium">{formatPrice(item.unitPricePaise * item.quantity)}</span>
            </div>
          ))}
          <div className="space-y-1.5 pt-2 border-t border-slate-700 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Items Subtotal</span>
              <span className="text-slate-200">{formatPrice(cart.subtotalPaise)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Taxes & GST</span>
              <span className="text-slate-200">{formatPrice(cart.totalGstPaise)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-1.5 border-t border-slate-700/80">
              <span className="text-white">Grand Total</span>
              <span className="text-amber-400">{formatPrice(cart.totalPaise)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-white/[0.07]" style={{background:"rgba(12,12,12,0.97)"}}>
        <button
          onClick={onSubmit}
          className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-xl btn-gold text-base"
        >
          <span className="font-display font-bold">Place Order</span>
          <span className="opacity-70">·</span>
          <span className="font-bold">{formatPrice(cart.totalPaise)}</span>
        </button>
      </div>
    </>
  );
}

// ─── SuccessView ──────────────────────────────────────────────────────────────

function SuccessView({ token, onClose }: { token: string; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 p-8 text-center flex-1">
      <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-green-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">Order Placed!</h2>
        <p className="text-slate-400 text-sm mt-1">We&apos;ve received your order. Our team will deliver it directly to your seat.</p>
      </div>
      <div className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-left">
        <p className="text-xs text-slate-500 mb-1">Tracking ID</p>
        <p className="font-mono text-sm text-amber-400 break-all">{token.slice(0, 8).toUpperCase()}</p>
      </div>
      <a
        href={`/track/${token}`}
        className="w-full px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-center transition-colors"
      >
        Track My Order
      </a>
      <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-300">
        Order more items
      </button>
    </div>
  );
}
