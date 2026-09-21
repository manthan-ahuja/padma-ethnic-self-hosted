import "server-only";
import { commerceStore } from "../commerce-store";
import type { Product } from "../types";

export type CatalogSource = "self-hosted";

export function getCatalogSource(): CatalogSource {
  return "self-hosted";
}

export async function getProducts(query?: string): Promise<Product[]> {
  return commerceStore.listProducts({ query });
}

export async function getCollectionProducts(collectionId: string): Promise<Product[]> {
  return commerceStore.listProducts({ collectionId });
}

export async function getCollections() {
  return (await commerceStore.listCollections()).filter((collection) => collection.active);
}

export async function getCollection(collectionId: string) {
  return (await getCollections()).find((collection) => collection.id === collectionId);
}

export async function getProductByHandle(handle: string): Promise<Product | undefined> {
  return commerceStore.getProduct(handle);
}
