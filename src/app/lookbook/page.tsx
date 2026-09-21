import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageShell } from "@/components/site-chrome";
import { getProducts } from "@/lib/commerce/repository";
export const metadata: Metadata = { title: "Lookbook | Padma Ethnic", description: "An editorial preview of Padma's colour-rich contemporary Indian wardrobe." };
export default async function LookbookPage() { const featured = (await getProducts()).slice(0, 6); return <PageShell><main className="lookbook-page"><header className="editorial-page-hero"><p className="eyebrow">Lookbook · Chapter 01</p><h1>Utsav:<br /><em>colour in motion</em></h1><p>An editorial study in rose, indigo, ivory and green, composed for ceremony and the hours around it.</p></header><section className="lookbook-grid">{featured.map((product, index) => <Link href={`/products/${product.id}`} key={product.id} className={`lookbook-card lookbook-card-${index + 1}`}><span><Image src={index % 2 ? product.hoverImage : product.image} alt={product.name} fill sizes="(max-width: 700px) 100vw, 50vw" /></span><div><p>{String(index + 1).padStart(2, "0")} · {product.category}</p><h2>{product.name}</h2><b>View the piece <ArrowUpRight size={15} /></b></div></Link>)}</section><aside className="lookbook-note"><p>Campaign note</p><span>The current visual edit establishes Padma&apos;s art direction. Final launch imagery should be replaced with original front, back, detail and movement photography for every product.</span></aside></main></PageShell>; }
