import type { CartState, Product, ProductSelection } from "./types";

export type CartAction =
  | { type: "add"; product: Product; selection?: ProductSelection; quantity?: number }
  | { type: "setQuantity"; productId: string; quantity: number }
  | { type: "remove"; productId: string }
  | { type: "replace"; state: CartState };

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

export function getLineId(productId: string, selection?: ProductSelection): string {
  return [productId, selection?.color ?? "", selection?.size ?? ""].join("::");
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  if (action.type === "replace") return withTotals(action.state.items);

  if (action.type === "add") {
    const lineId = getLineId(action.product.id, action.selection);
    const existing = state.items.find(
      (item) => (item.lineId ?? getLineId(item.product.id, item.selection)) === lineId,
    );

    const items = existing
      ? state.items.map((item) =>
          (item.lineId ?? getLineId(item.product.id, item.selection)) === lineId
            ? { ...item, quantity: item.quantity + (action.quantity ?? 1) }
            : item,
        )
      : [
          ...state.items,
          action.selection
            ? {
                product: action.product,
                quantity: action.quantity ?? 1,
                selection: action.selection,
                lineId,
              }
            : { product: action.product, quantity: action.quantity ?? 1 },
        ];

    return withTotals(items);
  }

  if (action.type === "remove") {
    return withTotals(
      state.items.filter(
        (item) =>
          (item.lineId ?? item.product.id) !== action.productId &&
          item.product.id !== action.productId,
      ),
    );
  }

  return withTotals(
    state.items
      .map((item) =>
        (item.lineId ?? item.product.id) === action.productId ||
        item.product.id === action.productId
          ? { ...item, quantity: action.quantity }
          : item,
      )
      .filter((item) => item.quantity > 0),
  );
}
