import { describe, expect, it } from "vitest";
import { cartReducer, initialCartState } from "@/lib/cart";
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
});
