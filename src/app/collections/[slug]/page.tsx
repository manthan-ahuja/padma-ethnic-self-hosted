import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView, type PriceFilter } from "@/components/catalog-view";
import { PageShell } from "@/components/site-chrome";
import { collectionMeta, productsForCollection } from "@/lib/collections";
import { getCollection, getCollectionProducts, getCollections, getProducts } from "@/lib/commerce/repository";

export async function generateStaticParams() {
  const stored = await getCollections();
  return [...new Set([...Object.keys(collectionMeta), ...stored.map((collection) => collection.id)])].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const editorial = collectionMeta[slug];
  const stored = await getCollection(slug);
  const collection = editorial ?? stored;
  if (!collection) return { title: "Collection not found | Padma Ethnic" };
  return { title: `${collection.title} | Padma Ethnic`, description: collection.description };
}

export default async function CollectionPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ price?: string }> }) {
  const { slug } = await params;
  const { price = "" } = await searchParams;
  const editorial = collectionMeta[slug];
  const stored = await getCollection(slug);
  if (!editorial && !stored) notFound();
  const products = stored ? await getCollectionProducts(slug) : productsForCollection(await getProducts(), slug);
  const title = editorial?.title ?? stored!.title;
  const description = editorial?.description ?? stored!.description;
  const eyebrow = editorial?.eyebrow ?? "Curated collection";
  const initialPrice: PriceFilter = ["under-10000", "10000-15000", "over-15000"].includes(price) ? price as PriceFilter : "";

  return <PageShell><main>
    <header className="editorial-page-hero compact-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></header>
    <section className="catalog-page" aria-label={title}><CatalogView products={products} initialPrice={initialPrice} /></section>
  </main></PageShell>;
}
