import type { Product } from "./types";

export const collectionMeta: Record<string, { title: string; eyebrow: string; description: string }> = {
  all: { title: "All pieces", eyebrow: "The complete edit", description: "Every Padma silhouette, gathered in one considered wardrobe." },
  sarees: { title: "Sarees", eyebrow: "Six yards, reimagined", description: "Drapes shaped by luminous colour, quiet detail and an ease made for now." },
  "kurta-sets": { title: "Kurta sets", eyebrow: "Modern classics", description: "Thoughtful sets for celebrations, intimate gatherings and unhurried days." },
  lehengas: { title: "Lehengas", eyebrow: "For the dance floor", description: "Celebration pieces designed for movement, memory and repeat wear." },
  "co-ords": { title: "Co-ords", eyebrow: "Effortless dressing", description: "Easy separates and fluid silhouettes with a distinctly Indian point of view." },
  "new-arrivals": { title: "New arrivals", eyebrow: "The latest chapter", description: "Freshly added pieces from Padma's evolving wardrobe." },
  bestsellers: { title: "Bestsellers", eyebrow: "Most loved", description: "The silhouettes customers return to first." },
  "festive-wear": { title: "Festive wear", eyebrow: "Made for gathering", description: "Colour-rich pieces for pujas, parties and evenings together." },
  "wedding-edit": { title: "The wedding edit", eyebrow: "Ceremony to celebration", description: "Sarees, lehengas and occasion sets for every invitation." },
  sale: { title: "Special prices", eyebrow: "Considered value", description: "Selected pieces currently available at a reduced price." },
};

export function productsForCollection(products: Product[], slug: string): Product[] {
  if (slug === "all") return products;
  const categoryMap: Record<string, Product["category"]> = { sarees: "Sarees", "kurta-sets": "Kurta Sets", lehengas: "Lehengas", "co-ords": "Co-ords" };
  if (categoryMap[slug]) return products.filter((product) => product.category === categoryMap[slug]);
  if (slug === "new-arrivals") return products.filter((product) => product.badge?.toLowerCase().includes("new"));
  if (slug === "bestsellers") return products.filter((product) => product.badge?.toLowerCase().includes("best"));
  if (slug === "sale") return products.filter((product) => Boolean(product.originalPrice));
  if (slug === "wedding-edit") return products.filter((product) => ["Sarees", "Lehengas"].includes(product.category));
  if (slug === "festive-wear") return products.filter((product) => product.category !== "Co-ords" || product.name.includes("Kaftan"));
  return [];
}
