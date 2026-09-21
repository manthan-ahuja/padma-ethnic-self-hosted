import type { Metadata } from "next";
import { CheckoutExperience } from "@/components/checkout-experience";
import { PageShell } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Checkout | Padma Ethnic", description: "Secure Padma delivery and payment checkout." };

export default function CheckoutPage() {
  return <PageShell><CheckoutExperience /></PageShell>;
}
