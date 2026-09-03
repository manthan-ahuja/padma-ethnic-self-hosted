# Padma Ethnic Frontend

A premium, mobile-first Next.js storefront for Padma Ethnic. This repository is a truthful frontend prototype: catalog, cart, wishlist and recently viewed data persist in the browser, while inventory, reviews, customer accounts, email capture and checkout remain clearly identified integration points until a real commerce backend is connected.

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

Expanded browser QA (start the production or development server first):

```bash
npm run qa:expanded
```

The suite checks desktop and mobile overflow, key homepage sections, collection results, search, product variant selection, persistent cart behavior and every new editorial route. Screenshots are written to `qa/expanded-*.png`.

## Routes

### Commerce discovery

- `/collections/all`
- `/collections/sarees`
- `/collections/kurta-sets`
- `/collections/lehengas`
- `/collections/co-ords`
- `/collections/new-arrivals`
- `/collections/bestsellers`
- `/collections/festive-wear`
- `/collections/wedding-edit`
- `/collections/sale`
- `/search`
- `/cart`
- `/wishlist`
- `/products/[id]`

### Brand and editorial

- `/about`
- `/our-craft`
- `/lookbook`
- `/journal`
- `/journal/[slug]`

## Delivered frontend features

- Responsive editorial homepage with occasion, curated-path, price, wedding, trust, founder and community sections
- Category collection pages with size, colour, material, price and occasion filters
- Sort controls and progressive “Load more” catalog presentation
- Availability integration seam that does not invent live stock
- Search across names, categories, colours and materials
- Search suggestions, popular searches, persistent recent searches and no-result recommendations
- Shared browser-persistent cart with colour and size variant lines
- Dedicated cart page with quantities, removals, totals, shipping-progress presentation and disabled checkout integration state
- Shared browser-persistent wishlist and recently viewed products
- Product full-screen image viewer, fit/model notes, size validation, quantity controls, share action, delivery-pincode validation and sticky mobile add-to-bag bar
- Complete-the-look recommendations and an honest verified-review empty state
- About, craft, lookbook and journal experiences with dynamic article routes
- Responsive navigation, metadata, reduced-motion support and accessible control labels

## Deliberately not represented as live

The following require Shopify or an equivalent commerce backend and external services. Their UI states do not claim to be operational:

- Live inventory and low-stock messaging
- Back-in-stock subscriptions
- Checkout, payment, tax and discount validation
- Pincode serviceability, courier ETA and COD eligibility
- Verified customer reviews and customer photographs
- Newsletter delivery and first-order offers
- Live Instagram feed
- Customer accounts and cross-device wishlist synchronization

## Recommended Shopify integration

1. Import final products and variants into Shopify and replace direct imports from `src/lib/products.ts` with Storefront API queries.
2. Create cart lines server-side or with Shopify Cart API, revalidating price, variant and inventory.
3. Replace the disabled cart checkout control with Shopify-hosted checkout.
4. Map collection handles to the existing `/collections/[slug]` routes.
5. Connect real inventory to availability filters, low-stock states and back-in-stock notifications.
6. Connect a logistics service for pincode-specific delivery and COD checks.
7. Add verified-purchase reviews through a provider that can validate Shopify orders.
8. Connect the newsletter and Instagram sections only after official accounts and consent requirements are confirmed.

Never expose Admin API tokens or payment secrets in browser code, and never trust totals submitted by the client.

## Content and asset note

The product names, descriptions, prices and imagery remain editorial prototype content. The current asset set contains one representative image per look, not verified front, back, side, detail or video assets for every SKU. Product cards and galleries therefore avoid presenting unrelated photographs as alternate views. Replace the prototype catalog with licensed Padma assets and confirmed product facts before launch.
