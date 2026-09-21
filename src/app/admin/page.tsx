import type { Metadata } from "next";
import Link from "next/link";
import { AdminDashboard } from "@/components/admin-dashboard";
import { PageShell } from "@/components/site-chrome";
import { getAdminSession } from "@/lib/admin-auth";
import { commerceStore } from "@/lib/commerce-store";

export const metadata: Metadata = { title: "Commerce admin | Padma Ethnic", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) return <PageShell><main className="admin-page admin-denied"><p className="eyebrow">Restricted</p><h1>Admin access required</h1><p>Sign in with an email listed in the server&apos;s ADMIN_EMAILS setting.</p><Link className="primary-cta" href="/account">Go to account</Link></main></PageShell>;
  const [products, orders, collections, discounts] = await Promise.all([
    commerceStore.listProducts({ activeOnly: false }), commerceStore.listOrders(), commerceStore.listCollections(), commerceStore.listDiscounts(),
  ]);
  return <PageShell><AdminDashboard products={products} orders={orders} collections={collections} discounts={discounts} /></PageShell>;
}
