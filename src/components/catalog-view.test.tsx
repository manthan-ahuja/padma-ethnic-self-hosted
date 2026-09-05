import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CatalogView } from "@/components/catalog-view";
import { CommerceProvider } from "@/components/commerce-provider";
import { products } from "@/lib/products";

describe("CatalogView", () => {
  it("applies a price range supplied by a curated price link", () => {
    const sample = [
      { ...products[0], price: 8_000 },
      { ...products[1], price: 12_000 },
    ];

    render(<CommerceProvider><CatalogView products={sample} initialPrice="10000-15000" /></CommerceProvider>);

    expect(screen.getByText("1 piece")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: sample[1].name })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: sample[0].name })).not.toBeInTheDocument();
  });
});
