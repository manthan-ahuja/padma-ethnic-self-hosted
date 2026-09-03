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
- Dedicated cart page with quantities, removals, totals, shipping progress and Shopify-hosted checkout handoff when configured
- Shared browser-persistent wishlist and recently viewed products
- Product full-screen image viewer, fit/model notes, size validation, quantity controls, share action, delivery-pincode validation and sticky mobile add-to-bag bar
- Complete-the-look recommendations and an honest verified-review empty state
- About, craft, lookbook and journal experiences with dynamic article routes
- Responsive navigation, metadata, reduced-motion support and accessible control labels

## Deliberately not represented as live

The following require Shopify or an equivalent commerce backend and external services. Their UI states do not claim to be operational:

- Live inventory and low-stock messaging
- Back-in-stock subscriptions
- Checkout, payment, tax and discount validation while Shopify credentials are absent
- Pincode serviceability, courier ETA and COD eligibility
- Verified customer reviews and customer photographs
- Newsletter delivery and first-order offers
- Live Instagram feed
- Customer accounts and cross-device wishlist synchronization

## Shopify backend integration

The storefront now includes a server-only Shopify Storefront API adapter. When the required environment variables exist, Shopify becomes authoritative for product names, handles, descriptions, images, prices, variants and availability. Product selections carry Shopify variant IDs into the browser cart, and the cart page creates a real Shopify Cart before redirecting to Shopify-hosted checkout.

When the variables are absent, the website intentionally stays in `local-preview` mode and checkout remains disabled. A configured Shopify request failure is surfaced rather than silently mixing stale local prices with live data.

### Shopify Admin setup

1. Create or open the Padma Ethnic Shopify store.
2. In Shopify Admin, add the **Headless** sales channel (preferred) or create a custom storefront app.
3. Create a storefront and grant only these Storefront API permissions:
   - unauthenticated product/catalog read access,
   - unauthenticated inventory read access,
   - unauthenticated checkout/cart write access.
4. Copy the **Storefront API access token**. Do not use or expose an Admin API token.
5. Copy `.env.example` to `.env.local` and replace the placeholder values locally:

```env
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-storefront-token
SHOPIFY_API_VERSION=2026-07
```

6. Restart `npm run dev`. Do not commit `.env.local`.
7. Publish every product to the Headless/custom storefront sales channel. Draft or unpublished products will not appear.

### Product data conventions

Use Shopify product handles as storefront URLs: `/products/<handle>`.

Set Shopify **Product type** to one of:

- `Sarees`
- `Kurta Sets`
- `Lehengas`
- `Co-ords`

Use tags such as `New`, `Bestseller`, `Festive`, `Wedding`, `Everyday`, `Limited`, and `Sale` to drive curated storefront views and badges. Create actual Shopify variants for every size/colour combination; a variant without a real Shopify merchandise ID cannot enter live checkout.

The adapter optionally reads these product metafields in namespace `custom`:

- `material`
- `care`
- `included`
- `origin`
- `delivery_estimate`
- `sku`

Shopify Admin controls the catalog and inventory. Wishlist and recently viewed data remain browser-local. Customer accounts, verified-review tooling, back-in-stock subscriptions, logistics-specific pincode checks, newsletters and Instagram require separate integrations.

### Security model

- Shopify tokens are used only by server modules and the server checkout route.
- No Admin API credential is required by this storefront.
- The checkout endpoint accepts only Shopify ProductVariant GIDs and bounded integer quantities.
- Shopify revalidates inventory, totals, tax, delivery and discounts before payment.
- Payment details are collected only by Shopify-hosted checkout.

## Content and asset note

The product names, descriptions, prices and imagery remain editorial prototype content. The current asset set contains one representative image per look, not verified front, back, side, detail or video assets for every SKU. Product cards and galleries therefore avoid presenting unrelated photographs as alternate views. Replace the prototype catalog with licensed Padma assets and confirmed product facts before launch.
