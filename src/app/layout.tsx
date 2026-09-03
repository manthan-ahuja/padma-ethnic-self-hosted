import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { CommerceProvider } from "@/components/commerce-provider";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Padma Ethnic Wear — Contemporary Indian Heirlooms",
  description:
    "Discover Padma Ethnic's contemporary sarees, kurta sets, lehengas and occasion wear—rooted in Indian craft and made for now.",
  keywords: ["Indian ethnic wear", "sarees", "kurta sets", "lehengas", "Padma Ethnic"],
  openGraph: {
    title: "Padma Ethnic",
    description: "Tradition, beautifully alive.",
    type: "website",
    locale: "en_IN",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${cormorant.variable} ${manrope.variable}`}>
      <body><CommerceProvider>{children}</CommerceProvider></body>
    </html>
  );
}
