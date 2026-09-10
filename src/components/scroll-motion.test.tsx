import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollMotion } from "./scroll-motion";

vi.mock("next/navigation", () => ({
  usePathname: () => "/collections/all",
}));

type ObserverCallback = IntersectionObserverCallback;

class IntersectionObserverMock {
  static instances: IntersectionObserverMock[] = [];
  callback: ObserverCallback;
  observed: Element[] = [];

  constructor(callback: ObserverCallback) {
    this.callback = callback;
    IntersectionObserverMock.instances.push(this);
  }

  observe = (element: Element) => {
    this.observed.push(element);
  };

  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = () => [];
  root = null;
  rootMargin = "0px";
  thresholds = [0];

  reveal(element: Element) {
    this.callback(
      [{ isIntersecting: true, target: element } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

describe("ScrollMotion", () => {
  beforeEach(() => {
    IntersectionObserverMock.instances = [];
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    );
  });

  it("keeps the first section visible and reveals later content when it enters the viewport", async () => {
    render(
      <>
        <ScrollMotion />
        <main>
          <section data-testid="hero">Hero</section>
          <section data-testid="story">Story</section>
        </main>
      </>,
    );

    const hero = document.querySelector('[data-testid="hero"]')!;
    const story = document.querySelector('[data-testid="story"]')!;

    await waitFor(() => expect(IntersectionObserverMock.instances).toHaveLength(1));
    expect(hero).not.toHaveAttribute("data-scroll-reveal");
    expect(story).toHaveAttribute("data-scroll-reveal", "pending");

    act(() => IntersectionObserverMock.instances[0].reveal(story));

    expect(story).toHaveAttribute("data-scroll-reveal", "visible");
    expect(IntersectionObserverMock.instances[0].unobserve).toHaveBeenCalledWith(story);
  });

  it("does not hide content that is already in the viewport", async () => {
    const story = document.createElement("section");
    story.dataset.scrollRevealItem = "";
    story.getBoundingClientRect = vi.fn().mockReturnValue({ top: 100, bottom: 300 });
    document.body.append(story);

    render(<ScrollMotion />);

    await waitFor(() => expect(story.dataset.scrollReveal).toBe("visible"));
    expect(IntersectionObserverMock.instances[0].observed).not.toContain(story);
    story.remove();
  });

  it("registers content that streams in after navigation has already started", async () => {
    render(<><ScrollMotion /><main><section>Current page</section></main></>);

    const streamedSection = document.createElement("section");
    streamedSection.textContent = "Streamed collection";
    document.querySelector("main")?.append(streamedSection);

    await waitFor(() => expect(streamedSection.dataset.scrollReveal).toBe("pending"));
    expect(IntersectionObserverMock.instances.at(-1)?.observed).toContain(streamedSection);
  });

  it("shows all content immediately when reduced motion is requested", async () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);

    render(
      <>
        <ScrollMotion />
        <main>
          <section>Hero</section>
          <section data-testid="story">Story</section>
        </main>
      </>,
    );

    const story = document.querySelector('[data-testid="story"]')!;
    await waitFor(() => expect(story).toHaveAttribute("data-scroll-reveal", "visible"));
    expect(IntersectionObserverMock.instances).toHaveLength(0);
  });
});
