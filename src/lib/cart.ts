import type { CartState, Product } from "./types";

export type CartAction =
  | { type: "add"; product: Product }
  | { type: "setQuantity"; productId: string; quantity: number }
  | { type: "remove"; productId: string };

export const initialCartState: CartState = {
  items: [],
  itemCount: 0,
  subtotal: 0,
};

function withTotals(items: CartState["items"]): CartState {
  return {
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0,
    ),
  };
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  if (action.type === "add") {
    const existing = state.items.find(
      (item) => item.product.id === action.product.id,
    );

    const items = existing
      ? state.items.map((item) =>
          item.product.id === action.product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      : [...state.items, { product: action.product, quantity: 1 }];

    return withTotals(items);
  }

  if (action.type === "remove") {
    return withTotals(
      state.items.filter((item) => item.product.id !== action.productId),
    );
  }

  return withTotals(
    state.items
      .map((item) =>
        item.product.id === action.productId
          ? { ...item, quantity: action.quantity }
          : item,
      )
      .filter((item) => item.quantity > 0),
  );
}
