import { describe, expect, it } from "vitest";
import { cartReducer, initialCartState, MAX_CART_QUANTITY, mergeCartStates, rebaseCartChanges, selectCartAfterAccountFetch, selectConnectedCart } from "@/lib/cart";
import { products } from "@/lib/products";

const product = products[0];

describe("cartReducer", () => {
  it("adds a product and increments its quantity when added again", () => {
    const once = cartReducer(initialCartState, { type: "add", product });
    const twice = cartReducer(once, { type: "add", product });

    expect(twice.items).toEqual([{ product, quantity: 2 }]);
  });

  it("removes an item when quantity is reduced below one", () => {
    const added = cartReducer(initialCartState, { type: "add", product });
    const emptied = cartReducer(added, {
      type: "setQuantity",
      productId: product.id,
      quantity: 0,
    });

    expect(emptied.items).toEqual([]);
  });

  it("calculates total quantity and value", () => {
    const state = cartReducer(initialCartState, { type: "add", product });

    expect(state.itemCount).toBe(1);
    expect(state.subtotal).toBe(8990);
  });

  it("keeps different colour and size selections as separate lines", () => {
    const blue = cartReducer(initialCartState, {
      type: "add",
      product,
      selection: { color: "Indigo", size: "Free Size" },
    });
    const pink = cartReducer(blue, {
      type: "add",
      product,
      selection: { color: "Rani Pink", size: "Free Size" },
    });

    expect(pink.items).toHaveLength(2);
    expect(pink.items.map((item) => item.selection?.color)).toEqual([
      "Indigo",
      "Rani Pink",
    ]);
  });

  it("caps a cart line at the checkout API limit", () => {
    const state = cartReducer(initialCartState, { type: "add", product, quantity: MAX_CART_QUANTITY });
    const incremented = cartReducer(state, { type: "add", product });
    const manuallyRaised = cartReducer(incremented, { type: "setQuantity", productId: product.id, quantity: 999 });

    expect(manuallyRaised.items[0].quantity).toBe(MAX_CART_QUANTITY);
    expect(manuallyRaised.itemCount).toBe(MAX_CART_QUANTITY);
  });

  it("keeps the server cart when reconnecting the same account", () => {
    const saved = cartReducer(initialCartState, { type: "add", product, quantity: 1 });
    const staleLocal = cartReducer(initialCartState, { type: "add", product, quantity: 4 });

    expect(selectConnectedCart("customer-1", "customer-1", saved, staleLocal)).toEqual(saved);
    expect(selectConnectedCart(null, "customer-1", saved, staleLocal).itemCount).toBe(5);
  });

  it("rebases cart changes made while account data is loading", () => {
    const saved = cartReducer(initialCartState, { type: "add", product, quantity: 1 });
    const localAtRequest = saved;
    const localAfterClick = cartReducer(localAtRequest, { type: "add", product: products[1], quantity: 1 });

    const rebased = rebaseCartChanges(saved, localAtRequest, localAfterClick);
    expect(rebased.itemCount).toBe(2);
    expect(rebased.items.map((item) => item.product.id)).toContain(products[1].id);
  });

  it("preserves rejected local edits when retrying a version conflict", () => {
    const baseline = cartReducer(initialCartState, { type: "add", product, quantity: 1 });
    const edited = cartReducer(baseline, { type: "add", product, quantity: 1 });
    const latestServer = cartReducer(baseline, { type: "add", product, quantity: 2 });

    const recovered = selectCartAfterAccountFetch({
      ownerId: "customer-1", userId: "customer-1", savedCart: latestServer,
      localAtRequest: edited, localNow: edited, confirmedBaseline: baseline,
    });

    expect(recovered.items[0].quantity).toBe(4);
  });

  it("does not merge an anonymous cart twice after its initial save conflicts", () => {
    const baseline = cartReducer(initialCartState, { type: "add", product, quantity: 1 });
    const alreadyMerged = cartReducer(baseline, { type: "add", product, quantity: 1 });
    const latestServer = cartReducer(baseline, { type: "add", product, quantity: 1 });

    const recovered = selectCartAfterAccountFetch({
      ownerId: null, userId: "customer-1", savedCart: latestServer,
      localAtRequest: alreadyMerged, localNow: alreadyMerged, confirmedBaseline: baseline,
    });

    expect(recovered.items[0].quantity).toBe(3);
  });

  it("discards malformed persisted cart lines", () => {
    const state = cartReducer(initialCartState, { type: "replace", state: { items: [{}] } as never });
    expect(state).toEqual(initialCartState);
  });

  it("merges a shopper's local cart into their saved account cart", () => {
    const saved = cartReducer(initialCartState, { type: "add", product, quantity: 2 });
    const local = cartReducer(initialCartState, { type: "add", product });

    expect(mergeCartStates(saved, local).items[0].quantity).toBe(3);
  });
});
