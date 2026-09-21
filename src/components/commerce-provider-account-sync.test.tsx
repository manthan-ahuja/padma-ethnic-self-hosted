import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { CommerceProvider, useCommerce } from "./commerce-provider";
import { products } from "@/lib/products";

const auth = vi.hoisted(() => ({
  value: { data: { user: { id: "account-a", name: "Alice", email: "alice@example.com" } }, status: "authenticated" as const },
}));

vi.mock("next-auth/react", () => ({ useSession: () => auth.value }));

function Probe() {
  const { addToCart, cart, cartSyncStatus } = useCommerce();
  return <><button onClick={() => addToCart(products[0])}>Add</button><span>{cartSyncStatus}:{cart.itemCount}</span></>;
}

function jsonResponse(body: unknown) {
  return Promise.resolve({ ok: true, json: async () => body } as Response);
}

function installStorage() {
  const storage = new Map<string, string>();
  Object.defineProperty(window, "localStorage", { configurable: true, value: {
    clear: () => storage.clear(),
    getItem: (key: string) => storage.get(key) ?? null,
    removeItem: (key: string) => storage.delete(key),
    setItem: (key: string, value: string) => storage.set(key, value),
  } });
  return storage;
}

describe("CommerceProvider account isolation", () => {
  it("does not run account A's queued cart save after switching to account B", async () => {
    installStorage();
    localStorage.clear();
    auth.value = { data: { user: { id: "account-a", name: "Alice", email: "alice@example.com" } }, status: "authenticated" };
    let resolveFirstPut!: (response: Response) => void;
    const firstPut = new Promise<Response>((resolve) => { resolveFirstPut = resolve; });
    const calls: Array<{ method: string; user: string }> = [];
    let putCount = 0;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const user = auth.value.data?.user?.id ?? "anonymous";
      calls.push({ method, user });
      if (method === "GET") return jsonResponse({ cart: { items: [], itemCount: 0, subtotal: 0 }, version: 0 });
      putCount += 1;
      if (putCount === 1) return firstPut;
      return jsonResponse({ cart: JSON.parse(String(init?.body)).cart, version: putCount });
    }));

    const tree = () => <StrictMode><CommerceProvider accountSync><Probe /></CommerceProvider></StrictMode>;
    const view = render(tree());
    await screen.findByText("synced:0");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(putCount).toBe(1), { timeout: 2000 });
    await user.click(screen.getByRole("button", { name: "Add" }));
    await new Promise((resolve) => setTimeout(resolve, 500));

    auth.value = { data: { user: { id: "account-b", name: "Bob", email: "bob@example.com" } }, status: "authenticated" };
    view.rerender(tree());
    await screen.findByText("synced:0");
    resolveFirstPut({ ok: true, json: async () => ({ cart: { items: [{ product: products[0], quantity: 1 }], itemCount: 1, subtotal: products[0].price }, version: 1 }) } as Response);

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(calls.filter((call) => call.method === "PUT" && call.user === "account-b")).toHaveLength(0);
  });

  it("does not overwrite an owned cart while the session is still loading", async () => {
    const storage = installStorage();
    const savedCart = { items: [{ product: products[0], quantity: 1 }], itemCount: 1, subtotal: products[0].price };
    storage.set("padma-cart-v2", JSON.stringify(savedCart));
    storage.set("padma-cart-owner-v1", "account-a");
    auth.value = { data: undefined, status: "loading" } as unknown as typeof auth.value;

    render(<StrictMode><CommerceProvider accountSync><Probe /></CommerceProvider></StrictMode>);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(JSON.parse(storage.get("padma-cart-v2") ?? "null")).toEqual(savedCart);
  });

  it("marks the connected owner before exposing a merged account cart", async () => {
    const storage = installStorage();
    storage.set("padma-cart-v2", JSON.stringify({ items: [{ product: products[0], quantity: 1 }], itemCount: 1, subtotal: products[0].price }));
    auth.value = { data: { user: { id: "account-a", name: "Alice", email: "alice@example.com" } }, status: "authenticated" };
    let resolveAccountAPut!: (response: Response) => void;
    const delayedAccountAPut = new Promise<Response>((resolve) => { resolveAccountAPut = resolve; });
    const calls: Array<{ method: string; user: string; body?: string }> = [];
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const user = auth.value.data?.user?.id ?? "anonymous";
      calls.push({ method, user, body: init?.body ? String(init.body) : undefined });
      if (method === "GET") {
        const cart = user === "account-a"
          ? { items: [{ product: products[1], quantity: 1 }], itemCount: 1, subtotal: products[1].price }
          : { items: [], itemCount: 0, subtotal: 0 };
        return jsonResponse({ cart, version: 0 });
      }
      if (user === "account-a") return delayedAccountAPut;
      return jsonResponse({ cart: JSON.parse(String(init?.body)).cart, version: 1 });
    }));

    const tree = () => <StrictMode><CommerceProvider accountSync><Probe /></CommerceProvider></StrictMode>;
    const view = render(tree());
    await screen.findByText("connecting:2");
    await waitFor(() => expect(calls.some((call) => call.method === "PUT" && call.user === "account-a")).toBe(true));

    auth.value = { data: { user: { id: "account-b", name: "Bob", email: "bob@example.com" } }, status: "authenticated" };
    view.rerender(tree());
    await screen.findByText("synced:0");
    resolveAccountAPut({ ok: true, json: async () => ({ cart: { items: [], itemCount: 0, subtotal: 0 }, version: 1 }) } as Response);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(calls.filter((call) => call.method === "PUT" && call.user === "account-b")).toHaveLength(0);
    expect(screen.getByText("synced:0")).toBeInTheDocument();
  });
});
