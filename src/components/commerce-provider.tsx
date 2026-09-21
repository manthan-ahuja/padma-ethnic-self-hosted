"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { cartReducer, initialCartState, selectCartAfterAccountFetch } from "@/lib/cart";
import type { CartState, Product, ProductSelection } from "@/lib/types";

const CART_KEY = "padma-cart-v2";
const CART_OWNER_KEY = "padma-cart-owner-v1";
const WISHLIST_KEY = "padma-wishlist-v1";
const RECENT_KEY = "padma-recent-v1";

type CartSyncStatus = "idle" | "connecting" | "synced" | "error";

type CommerceContextValue = {
  cart: CartState;
  wishlist: string[];
  recent: string[];
  cartSyncStatus: CartSyncStatus;
  cartSyncError: string;
  addToCart: (product: Product, selection?: ProductSelection, quantity?: number) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  removeFromCart: (lineId: string) => void;
  disconnectCart: () => void;
  retryCartSync: () => void;
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

async function cartResponse(response: Response) {
  const body = await response.json() as { cart?: CartState; version?: number; error?: string };
  if (!response.ok || !body.cart || !Number.isInteger(body.version)) {
    throw new Error(body.error ?? "Unable to synchronize your cart.");
  }
  return { cart: body.cart, version: Number(body.version) };
}

function CommerceProviderCore({ children, session, sessionStatus }: {
  children: React.ReactNode;
  session: Session | null;
  sessionStatus: "loading" | "authenticated" | "unauthenticated";
}) {
  const [cart, dispatch] = useReducer(cartReducer, initialCartState);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cartSyncStatus, setCartSyncStatus] = useState<CartSyncStatus>("idle");
  const [cartSyncError, setCartSyncError] = useState("");
  const [syncAttempt, setSyncAttempt] = useState(0);
  const cartRef = useRef(cart);
  const connectedUser = useRef<string | null>(null);
  const cartVersion = useRef(0);
  const confirmedServerCart = useRef<CartState | null>(null);
  const baselineUser = useRef<string | null>(null);
  const lastQueuedCart = useRef("");
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const owner = window.localStorage?.getItem(CART_OWNER_KEY);
        const userId = session?.user?.id;
        const saved = JSON.parse(window.localStorage?.getItem(CART_KEY) ?? "null");
        if ((!owner || owner === userId) && saved?.items && Array.isArray(saved.items)) {
          dispatch({ type: "replace", state: saved });
        } else if (owner && !userId && sessionStatus === "unauthenticated") {
          window.localStorage?.removeItem(CART_OWNER_KEY);
          window.localStorage?.removeItem(CART_KEY);
        }
      } catch {}
      setWishlist(readList(WISHLIST_KEY));
      setRecent(readList(RECENT_KEY));
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, sessionStatus]);

  useEffect(() => {
    if (!hydrated) return;
    const owner = window.localStorage?.getItem(CART_OWNER_KEY);
    if (owner && owner !== session?.user?.id) return;
    window.localStorage?.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, hydrated, session?.user?.id, sessionStatus]);

  const disconnectCart = useCallback(() => {
    connectedUser.current = null;
    cartVersion.current = 0;
    confirmedServerCart.current = null;
    baselineUser.current = null;
    lastQueuedCart.current = "";
    setCartSyncStatus("idle");
    setCartSyncError("");
    dispatch({ type: "replace", state: initialCartState });
    window.localStorage?.removeItem(CART_OWNER_KEY);
    window.localStorage?.removeItem(CART_KEY);
  }, []);

  const retryCartSync = useCallback(() => {
    connectedUser.current = null;
    setCartSyncError("");
    setSyncAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!hydrated || sessionStatus === "loading") return;
    const userId = session?.user?.id;
    if (!userId) {
      if (connectedUser.current) disconnectCart();
      return;
    }
    if (connectedUser.current === userId) return;

    let cancelled = false;
    const confirmedBaseline = baselineUser.current === userId ? confirmedServerCart.current : null;
    let localAtRequest = cartRef.current;
    try {
      const persisted = window.localStorage?.getItem(CART_KEY);
      if (persisted) localAtRequest = cartReducer(initialCartState, { type: "replace", state: JSON.parse(persisted) as CartState });
    } catch {
      // The in-memory cart remains the safe fallback.
    }
    setCartSyncStatus("connecting");
    setCartSyncError("");
    void fetch("/api/account/cart")
      .then(cartResponse)
      .then(async ({ cart: savedCart, version }) => {
        if (cancelled) return;
        const owner = window.localStorage?.getItem(CART_OWNER_KEY);
        const next = selectCartAfterAccountFetch({
          ownerId: owner,
          userId,
          savedCart,
          localAtRequest,
          localNow: cartRef.current,
          confirmedBaseline,
        });
        const nextSerialized = JSON.stringify(next);
        const savedSerialized = JSON.stringify(savedCart);
        cartVersion.current = version;
        confirmedServerCart.current = savedCart;
        baselineUser.current = userId;
        lastQueuedCart.current = savedSerialized;
        connectedUser.current = userId;
        window.localStorage?.setItem(CART_OWNER_KEY, userId);
        dispatch({ type: "replace", state: next });

        if (nextSerialized !== savedSerialized) {
          const response = await fetch("/api/account/cart", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cart: next, version }),
          });
          const saved = await cartResponse(response);
          if (cancelled) return;
          cartVersion.current = saved.version;
          confirmedServerCart.current = saved.cart;
          lastQueuedCart.current = JSON.stringify(saved.cart);
        }

        setCartSyncStatus("synced");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCartSyncStatus("error");
        setCartSyncError(error instanceof Error ? error.message : "Unable to synchronize your cart.");
      });

    return () => { cancelled = true; };
  }, [disconnectCart, hydrated, session?.user?.id, sessionStatus, syncAttempt]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || connectedUser.current !== userId || cartSyncStatus !== "synced") return;
    const serialized = JSON.stringify(cart);
    if (serialized === lastQueuedCart.current) return;

    const timeout = window.setTimeout(() => {
      lastQueuedCart.current = serialized;
      saveQueue.current = saveQueue.current.catch(() => undefined).then(async () => {
        if (!active.current) return;
        const response = await fetch("/api/account/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cart, version: cartVersion.current }),
        });
        const result = await cartResponse(response);
        if (!active.current) return;
        cartVersion.current = result.version;
        confirmedServerCart.current = result.cart;
        baselineUser.current = userId;
      }).catch((error: unknown) => {
        if (!active.current) return;
        setCartSyncStatus("error");
        setCartSyncError(error instanceof Error ? error.message : "Unable to synchronize your cart.");
      });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [cart, cartSyncStatus, session?.user?.id]);

  const value = useMemo<CommerceContextValue>(() => ({
    cart,
    wishlist,
    recent,
    cartSyncStatus,
    cartSyncError,
    addToCart: (product, selection, quantity) => dispatch({ type: "add", product, selection, quantity }),
    setQuantity: (lineId, quantity) => dispatch({ type: "setQuantity", productId: lineId, quantity }),
    removeFromCart: (lineId) => dispatch({ type: "remove", productId: lineId }),
    disconnectCart,
    retryCartSync,
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
  }), [cart, cartSyncError, cartSyncStatus, disconnectCart, retryCartSync, wishlist, recent]);

  return <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>;
}

function SyncedCommerceProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const identity = `${status}:${session?.user?.id ?? ""}`;
  return <CommerceProviderCore key={identity} session={session} sessionStatus={status}>{children}</CommerceProviderCore>;
}

export function CommerceProvider({ children, accountSync = false }: { children: React.ReactNode; accountSync?: boolean }) {
  if (accountSync) return <SyncedCommerceProvider>{children}</SyncedCommerceProvider>;
  return <CommerceProviderCore session={null} sessionStatus="unauthenticated">{children}</CommerceProviderCore>;
}

export function useCommerce() {
  const value = useContext(CommerceContext);
  if (!value) throw new Error("useCommerce must be used inside CommerceProvider");
  return value;
}
