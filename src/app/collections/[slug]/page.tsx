import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/catalog-view";
import { PageShell } from "@/components/site-chrome";
import { collectionMeta, productsForCollection } from "@/lib/collections";
import { products } from "@/lib/products";

export function generateStaticParams() {
  return Object.keys(collectionMeta).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const collection = collectionMeta[slug];
  if (!collection) return { title: "Collection not found | Padma Ethnic" };
  return { title: `${collection.title} | Padma Ethnic`, description: collection.description };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = collectionMeta[slug];
  if (!collection) notFound();
  const selected = productsForCollection(products, slug);

  return <PageShell><main>
    <header className="editorial-page-hero compact-hero"><p className="eyebrow">{collection.eyebrow}</p><h1>{collection.title}</h1><p>{collection.description}</p></header>
    <section className="catalog-page" aria-label={collection.title}><CatalogView products={selected} /></section>
  </main></PageShell>;
}
