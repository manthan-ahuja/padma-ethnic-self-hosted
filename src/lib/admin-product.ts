import { CommerceValidationError, type ProductCreateInput } from "./commerce-store";
import type { ProductCategory, ProductImage } from "./types";

const categories: ProductCategory[] = ["Sarees", "Kurta Sets", "Lehengas", "Co-ords"];

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function textList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => text(item)).filter(Boolean))];
}

function optionalMoney(value: unknown) {
  if (value == null || value === "") return undefined;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new CommerceValidationError("Prices must be zero or greater.");
  return amount;
}

export function parseAdminProductPayload(value: unknown): ProductCreateInput {
  if (!value || typeof value !== "object") throw new CommerceValidationError("Invalid product details.");
  const input = value as Record<string, unknown>;
  const name = text(input.name);
  const category = text(input.category) as ProductCategory;
  const description = text(input.description);
  const material = text(input.material);
  const colors = textList(input.colors);
  const sizes = textList(input.sizes);
  if (!name || !description || !material) throw new CommerceValidationError("Name, description, and material are required.");
  if (!categories.includes(category)) throw new CommerceValidationError("Choose a valid category.");
  if (!colors.length || !sizes.length) throw new CommerceValidationError("Choose at least one colour and one size.");

  const gallery: ProductImage[] = Array.isArray(input.gallery) ? input.gallery.map((item) => {
    const image = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return { src: text(image.src), alt: text(image.alt, name), ...(text(image.position) ? { position: text(image.position) } : {}) };
  }).filter((image) => image.src) : [];
  if (!gallery.length) throw new CommerceValidationError("Upload at least one product image.");

  const rawVariants = Array.isArray(input.variants) ? input.variants : [];
  const variantMap = new Map<string, ProductCreateInput["variants"][number]>();
  for (const item of rawVariants) {
    const variant = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const color = text(variant.color);
    const size = text(variant.size);
    const price = Number(variant.price);
    const inventoryQuantity = Number(variant.inventoryQuantity);
    if (!colors.includes(color) || !sizes.includes(size)) throw new CommerceValidationError("Variant options must match the selected colours and sizes.");
    if (!Number.isFinite(price) || price < 0) throw new CommerceValidationError("Every variant needs a valid price.");
    if (!Number.isInteger(inventoryQuantity) || inventoryQuantity < 0) throw new CommerceValidationError("Every size needs a non-negative whole-number stock quantity.");
    variantMap.set(`${color}\u0000${size}`, {
      title: `${color} / ${size}`, color, size, price, inventoryQuantity,
      active: variant.active !== false,
    });
  }
  const variants = colors.flatMap((color) => sizes.map((size) => variantMap.get(`${color}\u0000${size}`)));
  if (variants.some((variant) => !variant)) throw new CommerceValidationError("Add a variant for every colour and size combination.");

  const originalPrice = optionalMoney(input.originalPrice);
  return {
    name,
    category,
    price: Math.min(...variants.map((variant) => variant!.price)),
    ...(originalPrice == null ? {} : { originalPrice }),
    image: gallery[0].src,
    hoverImage: gallery[1]?.src ?? gallery[0].src,
    gallery,
    badge: text(input.badge) || undefined,
    colors,
    sizes,
    description,
    material,
    features: textList(input.features),
    care: text(input.care, "Follow the garment care label."),
    included: text(input.included, name),
    origin: text(input.origin, "Crafted in India"),
    deliveryEstimate: text(input.deliveryEstimate, "4–8 business days"),
    imagePosition: text(input.imagePosition) || undefined,
    occasions: textList(input.occasions),
    isNew: input.isNew === true,
    isBestseller: input.isBestseller === true,
    fit: text(input.fit) || undefined,
    modelInfo: text(input.modelInfo) || undefined,
    measurements: text(input.measurements) || undefined,
    active: input.active !== false,
    variants: variants as ProductCreateInput["variants"],
  };
}
