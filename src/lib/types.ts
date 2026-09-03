export type ProductCategory = "Sarees" | "Kurta Sets" | "Lehengas" | "Co-ords";

export interface ProductImage {
  src: string;
  alt: string;
  position?: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  originalPrice?: number;
  image: string;
  hoverImage: string;
  gallery: ProductImage[];
  badge?: string;
  colors: string[];
  sizes: string[];
  description: string;
  material: string;
  features: string[];
  care: string;
  included: string;
  origin: string;
  deliveryEstimate: string;
  sku: string;
  imagePosition?: string;
  occasions?: string[];
  isNew?: boolean;
  isBestseller?: boolean;
  fit?: string;
  modelInfo?: string;
  measurements?: string;
}

export interface ProductSelection {
  color?: string;
  size?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selection?: ProductSelection;
  lineId?: string;
}

export interface CartState {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
}
