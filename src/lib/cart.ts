import type { CartItem, CartState, Product, ProductSelection } from "./types";

export const MAX_CART_QUANTITY = 20;

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

function withTotals(items: CartItem[]): CartState {
  return {
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0,
    ),
  };
}

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 0;
  return Math.max(0, Math.min(MAX_CART_QUANTITY, Math.floor(quantity)));
}

export function getLineId(productId: string, selection?: ProductSelection): string {
  return [productId, selection?.color ?? "", selection?.size ?? ""].join("::");
}

function normalizePersistedItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as Partial<CartItem>;
    if (!item.product || typeof item.product !== "object" || typeof item.product.id !== "string" || !Number.isFinite(item.product.price)) return [];
    const quantity = clampQuantity(Number(item.quantity));
    if (quantity < 1) return [];
    const selection = item.selection && typeof item.selection.color === "string" && typeof item.selection.size === "string"
      ? item.selection
      : undefined;
    return [{
      product: item.product,
      quantity,
      ...(selection ? { selection, lineId: getLineId(item.product.id, selection) } : {}),
    }];
  });
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  if (action.type === "replace") {
    return withTotals(normalizePersistedItems((action.state as Partial<CartState>)?.items));
  }

  if (action.type === "add") {
    const addedQuantity = clampQuantity(action.quantity ?? 1);
    if (addedQuantity < 1) return state;
    const lineId = getLineId(action.product.id, action.selection);
    const existing = state.items.find(
      (item) => (item.lineId ?? getLineId(item.product.id, item.selection)) === lineId,
    );

    const items = existing
      ? state.items.map((item) =>
          (item.lineId ?? getLineId(item.product.id, item.selection)) === lineId
            ? { ...item, quantity: clampQuantity(item.quantity + addedQuantity) }
            : item,
        )
      : [
          ...state.items,
          action.selection
            ? {
                product: action.product,
                quantity: addedQuantity,
                selection: action.selection,
                lineId,
              }
            : { product: action.product, quantity: addedQuantity },
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
          ? { ...item, quantity: clampQuantity(action.quantity) }
          : item,
      )
      .filter((item) => item.quantity > 0),
  );
}
