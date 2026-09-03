"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { cartReducer, initialCartState } from "@/lib/cart";
import type { CartState, Product, ProductSelection } from "@/lib/types";

const CART_KEY = "padma-cart-v2";
const WISHLIST_KEY = "padma-wishlist-v1";
const RECENT_KEY = "padma-recent-v1";

type CommerceContextValue = {
  cart: CartState;
  wishlist: string[];
  recent: string[];
  addToCart: (product: Product, selection?: ProductSelection, quantity?: number) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  removeFromCart: (lineId: string) => void;
  toggleWishlist: (productId: string) => void;
  rememberProduct: (productId: string) => void;
};

const CommerceContext = createContext<CommerceContextValue | null>(null);

function readList(key: string): string[] {
  try {
    const parsed = JSON.parse(window.localStorage?.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function CommerceProvider({ children }: { children: React.ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, initialCartState);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = JSON.parse(window.localStorage?.getItem(CART_KEY) ?? "null");
        if (saved?.items && Array.isArray(saved.items)) dispatch({ type: "replace", state: saved });
      } catch {}
      setWishlist(readList(WISHLIST_KEY));
      setRecent(readList(RECENT_KEY));
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage?.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  const value = useMemo<CommerceContextValue>(() => ({
    cart,
    wishlist,
    recent,
    addToCart: (product, selection, quantity) => dispatch({ type: "add", product, selection, quantity }),
    setQuantity: (lineId, quantity) => dispatch({ type: "setQuantity", productId: lineId, quantity }),
    removeFromCart: (lineId) => dispatch({ type: "remove", productId: lineId }),
    toggleWishlist: (productId) => setWishlist((current) => {
      const next = current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId];
      window.localStorage?.setItem(WISHLIST_KEY, JSON.stringify(next));
      return next;
    }),
    rememberProduct: (productId) => setRecent((current) => {
      if (current[0] === productId) return current;
      const next = [productId, ...current.filter((id) => id !== productId)].slice(0, 6);
      window.localStorage?.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    }),
  }), [cart, wishlist, recent]);

  return <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>;
}

export function useCommerce() {
  const value = useContext(CommerceContext);
  if (!value) throw new Error("useCommerce must be used inside CommerceProvider");
  return value;
}
