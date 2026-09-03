import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search, ShoppingBag } from "lucide-react";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product-detail";
import { getProductById, products } from "@/lib/products";

export function generateStaticParams() {
  return products.map((product) => ({ id: product.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) return { title: "Product not found — Padma Ethnic Wear" };

  return {
    title: `${product.name} — Padma Ethnic Wear`,
    description: `${product.description} ${product.material}.`,
    openGraph: {
      title: `${product.name} — Padma Ethnic Wear`,
      description: product.description,
      images: [{ url: product.image, alt: product.name }],
      type: "website",
      locale: "en_IN",
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) notFound();

  const related = products
    .filter((item) => item.id !== product.id && item.category === product.category)
    .slice(0, 3);

  return (
    <div className="product-page-shell">
      <div className="detail-announcement">
        <span>Complimentary shipping across India</span>
        <span>✦</span>
        <span>Easy 7-day returns</span>
      </div>

      <header className="detail-site-header">
        <Link href="/#collection" className="detail-back-link">
          <ArrowLeft size={17} /> <span>Back to collection</span>
        </Link>
        <Link href="/" className="detail-brand" aria-label="Padma Ethnic Wear home">
          <Image src="/brand/padma-lotus.png" alt="" width={42} height={30} sizes="42px" />
          <span>PADMA</span>
          <small>ETHNIC WEAR</small>
        </Link>
        <div className="detail-header-actions">
          <button type="button" aria-label="Search"><Search size={19} /></button>
          <button type="button" aria-label="Open shopping bag"><ShoppingBag size={19} /><span>0</span></button>
        </div>
      </header>

      <nav className="product-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span>/</span>
        <Link href="/#collection">{product.category}</Link><span>/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <ProductDetail product={product} />

      <section className="size-guide-section" id="size-guide" aria-labelledby="size-guide-title">
        <div>
          <p className="eyebrow">Find your fit</p>
          <h2 id="size-guide-title">Size guide</h2>
          <p>Garment measurements may vary slightly because every Padma piece is finished by hand.</p>
        </div>
        <div className="size-guide-table" role="region" aria-label="Garment size guide" tabIndex={0}>
          <table>
            <thead><tr><th>Size</th><th>Bust</th><th>Waist</th><th>Hip</th></tr></thead>
            <tbody>
              <tr><th>XS</th><td>32–33&quot;</td><td>25–26&quot;</td><td>35–36&quot;</td></tr>
              <tr><th>S</th><td>34–35&quot;</td><td>27–28&quot;</td><td>37–38&quot;</td></tr>
              <tr><th>M</th><td>36–37&quot;</td><td>29–30&quot;</td><td>39–40&quot;</td></tr>
              <tr><th>L</th><td>38–40&quot;</td><td>31–33&quot;</td><td>41–43&quot;</td></tr>
              <tr><th>XL</th><td>41–43&quot;</td><td>34–36&quot;</td><td>44–46&quot;</td></tr>
              <tr><th>XXL</th><td>44–46&quot;</td><td>37–39&quot;</td><td>47–49&quot;</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {related.length > 0 && (
        <section className="related-products" aria-labelledby="related-title">
          <p className="eyebrow">Continue discovering</p>
          <h2 id="related-title">You may also love</h2>
          <div className="related-grid">
            {related.map((item) => (
              <Link key={item.id} href={`/products/${item.id}`}>
                <span className="related-image"><Image src={item.image} alt={item.name} fill sizes="(max-width: 700px) 85vw, 30vw" style={{ objectPosition: item.imagePosition }} /></span>
                <span className="related-copy"><strong>{item.name}</strong><span>View piece <ArrowRight size={14} /></span></span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer className="detail-footer">
        <Image src="/brand/padma-logo-transparent.png" alt="Padma Ethnic Wear — Est. 2026" width={145} height={142} sizes="145px" />
        <p>Contemporary Indian wear, made with intention.</p>
        <div><span>© 2026 Padma Ethnic</span><span>India · INR</span><span>Privacy · Terms</span></div>
      </footer>
    </div>
  );
}
