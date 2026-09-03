# Padma Ethnic Frontend

A premium, mobile-first storefront for an Indian clothing label. This phase is frontend-only and uses local mock catalog data while preserving clean integration points for Supabase and Cashfree.

## Stack

- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS 4 foundation with a custom editorial design system
- Lucide icons
- Vitest + Testing Library
- Puppeteer Core for real-Chrome interaction QA

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Quality checks

```bash
npm test
npm run lint
npm run build
```

Optional browser QA (start the dev server first):

```bash
npm run qa:e2e
```

If the site is running on another port:

```bash
BASE_URL=http://127.0.0.1:3001 npm run qa:e2e
```

Set `CHROME_PATH` if Chrome is not in a standard Windows, Linux, or macOS location.

## Current frontend features

- Responsive editorial homepage
- Mobile navigation
- Category-led discovery and product filtering
- Product wishlist interactions
- Functional cart drawer with quantity controls and totals
- INR price formatting
- Newsletter and craft-story sections
- SEO and Open Graph metadata
- Reduced-motion support and accessible control labels

## Backend integration plan

### Supabase

The current catalog lives in `src/lib/products.ts` and conforms to the `Product` interface in `src/lib/types.ts`. During the backend phase:

1. Create Supabase tables for products, variants, categories, inventory, profiles, addresses, orders, and order items.
2. Replace direct imports from `products.ts` with a typed repository under `src/lib/supabase/`.
3. Fetch public catalog data in Server Components while keeping cart and filters interactive.
4. Add Supabase Auth for accounts, saved addresses, wishlists, and order history.
5. Generate database types from Supabase and map them to the existing frontend domain interfaces.

### Cashfree

The cart drawer currently ends at a visual checkout button. During the payment phase:

1. Create the order server-side after revalidating product prices and stock.
2. Generate a Cashfree payment session from a secure Next.js route or Supabase Edge Function.
3. Launch Cashfree Checkout only with the server-issued session ID.
4. Verify the signed webhook server-side before marking an order paid.
5. Add pending, success, failed, and retry checkout states to the frontend.

Never expose Cashfree secret keys in browser code or trust totals submitted by the client.

## Content note

The current product names, descriptions, prices, and photography are placeholder editorial content for design development. Replace them with Padma Ethnic's licensed brand assets and final catalog before launch.
