import { Storefront } from "@/components/storefront";
import { getProducts } from "@/lib/commerce/repository";

export default async function Home() {
  const products = await getProducts();
  return <Storefront products={products} />;
}
