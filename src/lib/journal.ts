export type JournalArticle = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  image: string;
  paragraphs: { heading?: string; body: string }[];
};

export const journalArticles: JournalArticle[] = [
  {
    slug: "the-art-of-repeat-wear",
    title: "The art of wearing it again",
    excerpt: "A considered wardrobe begins with pieces that can move between moods, rituals and seasons.",
    category: "Padma Notes",
    readTime: "4 min read",
    image: "/images/padma-ivory.jpg",
    paragraphs: [
      { body: "Occasion wear does not have to belong to one occasion. The most rewarding pieces are those that invite a second interpretation: a saree worn with a crisp shirt, a lehenga skirt paired with a quieter blouse, or a kurta returned to with flat sandals and an unhurried attitude." },
      { heading: "Begin with the piece", body: "Notice the colour, weight and strongest detail before adding anything else. When the textile carries its own presence, restraint gives it room. Change the jewellery, drape or layer before buying an entirely new look." },
      { heading: "Keep a personal archive", body: "Photograph combinations that felt like you. A small record of blouse pairings, accessories and drapes turns the wardrobe into a living reference rather than a row of forgotten garments." },
    ],
  },
  {
    slug: "choosing-colour-for-celebration",
    title: "Choosing colour for a celebration",
    excerpt: "Think beyond rules. Let light, setting and the feeling of the gathering guide the palette.",
    category: "Style Guide",
    readTime: "3 min read",
    image: "/images/padma-rose.jpg",
    paragraphs: [
      { body: "Colour changes with context. Daylight softens saturated tones, warm evening light deepens them, and intimate ceremonies often welcome subtler shades than a large reception." },
      { heading: "For daytime", body: "Ivory, marigold, sage and softened pinks sit beautifully in natural light. Texture and a quiet metallic detail can create depth without making the look feel heavy." },
      { heading: "For evening", body: "Indigo, jamun, emerald and rani pink hold their presence after sunset. Choose one dominant colour and let jewellery or embroidery provide the contrast." },
    ],
  },
  {
    slug: "caring-for-festive-textiles",
    title: "A gentler way to care for festive textiles",
    excerpt: "A few thoughtful habits help silk, zari and embroidered pieces return beautifully, year after year.",
    category: "Care",
    readTime: "5 min read",
    image: "/images/padma-sage.jpg",
    paragraphs: [
      { body: "Always follow the care instruction supplied with the garment. Different fibres, dyes and embellishments respond differently, so a universal cleaning method can do more harm than good." },
      { heading: "After wearing", body: "Air the piece away from direct sunlight before storing it. Avoid perfume directly on fabric and do not pack away a garment while it is damp." },
      { heading: "For storage", body: "Use breathable cotton or muslin instead of plastic. Refold sarees and heavy pieces periodically so a zari border or embroidered area does not remain stressed along the same crease." },
      { heading: "When in doubt", body: "Consult a cleaner experienced with the exact textile and embellishment. Test any treatment on an inconspicuous area and keep the product care label for reference." },
    ],
  },
];

export function getJournalArticle(slug: string) { return journalArticles.find((article) => article.slug === slug); }
