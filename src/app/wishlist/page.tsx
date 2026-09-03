import type { Metadata } from "next";
import { PageShell } from "@/components/site-chrome";
import { WishlistContent } from "@/components/wishlist-content";
export const metadata: Metadata = { title: "Wishlist | Padma Ethnic" };
export default function WishlistPage() { return <PageShell><WishlistContent /></PageShell>; }
