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

export function mergeCartStates(saved: CartState, local: CartState): CartState {
  const normalizedSaved = cartReducer(initialCartState, { type: "replace", state: saved });
  const normalizedLocal = cartReducer(initialCartState, { type: "replace", state: local });
  return normalizedLocal.items.reduce(
    (state, item) => cartReducer(state, {
      type: "add",
      product: item.product,
      selection: item.selection,
      quantity: item.quantity,
    }),
    normalizedSaved,
  );
}

export function rebaseCartChanges(saved: CartState, localAtRequest: CartState, localNow: CartState): CartState {
  const savedState = cartReducer(initialCartState, { type: "replace", state: saved });
  const baseState = cartReducer(initialCartState, { type: "replace", state: localAtRequest });
  const currentState = cartReducer(initialCartState, { type: "replace", state: localNow });
  const byLine = (state: CartState) => new Map(state.items.map((item) => [item.lineId ?? getLineId(item.product.id, item.selection), item]));
  const base = byLine(baseState);
  const current = byLine(currentState);
  let result = savedState;

  for (const lineId of new Set([...base.keys(), ...current.keys()])) {
    const baseQuantity = base.get(lineId)?.quantity ?? 0;
    const currentItem = current.get(lineId);
    const delta = (currentItem?.quantity ?? 0) - baseQuantity;
    if (delta === 0) continue;
    const savedItem = result.items.find((item) => (item.lineId ?? getLineId(item.product.id, item.selection)) === lineId);
    const nextQuantity = (savedItem?.quantity ?? 0) + delta;
    if (nextQuantity <= 0) {
      result = cartReducer(result, { type: "remove", productId: lineId });
    } else if (savedItem) {
      result = cartReducer(result, { type: "setQuantity", productId: lineId, quantity: nextQuantity });
    } else if (currentItem) {
      result = cartReducer(result, {
        type: "add",
        product: currentItem.product,
        selection: currentItem.selection,
        quantity: nextQuantity,
      });
    }
  }
  return result;
}

export function selectCartAfterAccountFetch({ ownerId, userId, savedCart, localAtRequest, localNow, confirmedBaseline }: {
  ownerId: string | null;
  userId: string;
  savedCart: CartState;
  localAtRequest: CartState;
  localNow: CartState;
  confirmedBaseline: CartState | null;
}): CartState {
  if (confirmedBaseline) return rebaseCartChanges(savedCart, confirmedBaseline, localNow);
  if (ownerId) return rebaseCartChanges(savedCart, localAtRequest, localNow);
  return selectConnectedCart(ownerId, userId, savedCart, localNow);
}

export function selectConnectedCart(ownerId: string | null, _userId: string, saved: CartState, local: CartState) {
  if (ownerId) return saved;
  return mergeCartStates(saved, local);
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
          (item.lineId ?? getLineId(item.product.id, item.selection)) !== action.productId &&
          item.product.id !== action.productId,
      ),
    );
  }

  return withTotals(
    state.items
      .map((item) =>
        (item.lineId ?? getLineId(item.product.id, item.selection)) === action.productId ||
        item.product.id === action.productId
          ? { ...item, quantity: clampQuantity(action.quantity) }
          : item,
      )
      .filter((item) => item.quantity > 0),
  );
}
