import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Loading from "./loading";
import Template from "./template";

const navigation = vi.hoisted(() => ({ pathname: "/collections/all" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

describe("route experience", () => {
  it("provides an accessible loading status without exposing decorative branding", () => {
    render(<Loading />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading the next page");
    expect(screen.getByText("PADMA")).toHaveAttribute("aria-hidden", "true");
  });

  it("wraps each route in the page entrance surface", () => {
    const { container } = render(<Template><main>Collection</main></Template>);

    expect(container.firstElementChild).toHaveClass("route-view");
    expect(screen.getByRole("main")).toHaveTextContent("Collection");
  });

  it("restarts the entrance surface for same-segment route changes", () => {
    navigation.pathname = "/collections/all";
    const { container, rerender } = render(<Template><main>Collection</main></Template>);
    const originalSurface = container.firstElementChild;

    navigation.pathname = "/collections/new-arrivals";
    rerender(<Template><main>New arrivals</main></Template>);

    expect(container.firstElementChild).not.toBe(originalSurface);
    expect(screen.getByRole("main")).toHaveTextContent("New arrivals");
  });
});
