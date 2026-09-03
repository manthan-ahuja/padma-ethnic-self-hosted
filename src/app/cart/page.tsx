import type { Metadata } from "next";
import { CartPageContent } from "@/components/cart-page-content";
import { PageShell } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Shopping bag | Padma Ethnic", description: "Review your selected Padma pieces." };

export default function CartPage() { return <PageShell><CartPageContent /></PageShell>; }
