"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const REVEAL_SELECTOR = [
  "main > section:not(:first-child)",
  "main > article:not(:first-child)",
  ".product-page-shell > section:not(:first-of-type)",
  ".product-grid > .product-card",
  ".journal-grid > article",
  ".lookbook-grid > a",
  ".values-section article",
  ".craft-process article",
  ".home-edit-grid > a",
  ".community-images > span",
  "[data-scroll-reveal-item]",
].join(",");

function reveal(element: HTMLElement) {
  element.dataset.scrollReveal = "visible";
}

export function ScrollMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion || !("IntersectionObserver" in window)) {
      document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach(reveal);
      return;
    }

    const registered = new WeakSet<HTMLElement>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -7%", threshold: 0.12 },
    );

    const register = (element: HTMLElement, index = 0) => {
      if (registered.has(element)) return;
      registered.add(element);

      const bounds = element.getBoundingClientRect();
      if (bounds.bottom > 0 && bounds.top < window.innerHeight * 0.93) {
        reveal(element);
        return;
      }

      element.dataset.scrollReveal = "pending";
      element.style.setProperty("--reveal-order", String(index % 4));
      observer.observe(element);
    };

    const registerTree = (node: Node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches(REVEAL_SELECTOR)) register(node);
      node.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach(register);
    };

    document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach(register);
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(registerTree);
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
