"use client";

import { useState, useEffect, useCallback } from "react";
import type { PublicProduct } from "@/lib/menu/public-menu";

export interface CartCustomization {
  id: string;
  name: string;
  price: number; // in paise
}

export interface CartItem {
  cartItemId: string; // composite key: product.id + sorted customization IDs
  product: PublicProduct;
  customizations: CartCustomization[];
  quantity: number;
  unitPricePaise: number; // product.price + sum of customizations
}

const CART_KEY = "theatre_cart_v2";

function generateCartItemId(productId: string, customizations: CartCustomization[]): string {
  if (!customizations || customizations.length === 0) {
    return productId;
  }
  const sortedIds = [...customizations].map((c) => c.id).sort().join("_");
  return `${productId}:${sortedIds}`;
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage once mounted
  useEffect(() => {
    // eslint-disable-next-line
    setItems(loadCart());
    // eslint-disable-next-line
    setMounted(true);
  }, []);

  // Persist whenever items change (after mount)
  useEffect(() => {
    if (mounted) saveCart(items);
  }, [items, mounted]);

  const addItem = useCallback(
    (product: PublicProduct, selectedCustomizations: CartCustomization[] = []) => {
      const cartItemId = generateCartItemId(product.id, selectedCustomizations);
      const customizationsCost = selectedCustomizations.reduce((acc, c) => acc + c.price, 0);
      const unitPricePaise = product.price + customizationsCost;

      setItems((prev) => {
        const existingIndex = prev.findIndex((i) => i.cartItemId === cartItemId);
        if (existingIndex > -1) {
          return prev.map((item, idx) =>
            idx === existingIndex
              ? { ...item, quantity: Math.min(item.quantity + 1, 20) }
              : item
          );
        }
        return [
          ...prev,
          {
            cartItemId,
            product,
            customizations: selectedCustomizations,
            quantity: 1,
            unitPricePaise,
          },
        ];
      });
    },
    []
  );

  const removeItem = useCallback((cartItemId: string) => {
    setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  }, []);

  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.cartItemId === cartItemId ? { ...i, quantity: Math.min(quantity, 20) } : i
        )
      );
    }
  }, []);

  const getProductQuantity = useCallback(
    (productId: string) => {
      return items
        .filter((i) => i.product.id === productId)
        .reduce((sum, i) => sum + i.quantity, 0);
    },
    [items]
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const subtotalPaise = items.reduce(
    (sum, item) => sum + item.unitPricePaise * item.quantity,
    0
  );

  const totalGstPaise = items.reduce((sum, item) => {
    const rate = item.product.gst_rate_percent ?? 5;
    const lineSubtotal = item.unitPricePaise * item.quantity;
    return sum + Math.round((lineSubtotal * rate) / 100);
  }, 0);

  const totalPaise = subtotalPaise + totalGstPaise;

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    getProductQuantity,
    clearCart,
    subtotalPaise,
    totalGstPaise,
    totalPaise,
    totalItems,
    mounted,
  };
}
