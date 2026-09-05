# Padma Ethnic QA and Optimization Report

Date: 5 September 2026
Target: production build at `http://127.0.0.1:3100`
Scope: desktop/mobile routes, interactions, cart and Shopify checkout handoff, performance, accessibility, security, loading, scroll behavior, and launch readiness.

## Executive result

The custom storefront is stable and substantially optimized. The final automated browser run passed 19 route/performance observations with no recorded failures. The visible product-to-cart-to-Shopify checkout handoff reached `padma-ethnic-tpvw9zki.myshopify.com` with HTTP 200; no payment or order was attempted.

The application is not ready for public launch because the Shopify catalogue contains only one sample-quality product and factual legal policies are not yet available.

## Final verification

- Vitest: 26/26 tests passed across 6 files.
- ESLint: passed.
- Next.js 16.3.3 production build: passed; 27 static pages generated and dynamic routes compiled.
- Browser QA: passed 19 route/performance observations, desktop/mobile interactions, internal links, images, local persistence, scroll behavior, and checkout handoff.
- Shopify product query: passed.
- Shopify `cartCreate` and hosted checkout URL verification: passed.
- Production dependency audit: 0 known vulnerabilities.
- CSS asset on the clean final production server: HTTP 200 `text/css`.
- Security headers verified: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive Permissions Policy.

## Lighthouse lab measurements

| Measurement | Before | Final |
|---|---:|---:|
| Performance | 89 | 96 |
| Accessibility | 96 | 100 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |
| First Contentful Paint | 1.3 s | 1.0 s |
| Largest Contentful Paint | 3.4 s | 2.3 s |
| Speed Index | 3.9 s | 1.0 s |
| Total Blocking Time | 110 ms | 180 ms |
| Cumulative Layout Shift | 0 | 0 |
| Interactive | 3.5 s | 3.2 s |
| Transfer size | 455 KiB | 398 KiB |
| Maximum Potential Input Delay | 680 ms | 270 ms |

Lighthouse numbers are local synthetic measurements and can vary between runs. The final audit had no failed binary audits. Accessibility failures for contrast and visible/accessibility-label mismatch were corrected.

## Browser timing and smoothness evidence

- Desktop homepage load: 295 ms in the final local run.
- Desktop product page load: 77 ms.
- Desktop cart load: 31 ms.
- Mobile homepage load: 258 ms.
- Mobile product page load: 61 ms.
- Mobile scripted scroll: 16.8 ms p95 and 16.8 ms maximum frame interval.
- No horizontal overflow was detected at 1440 px, 1280 px, or 390 px.
- Shopify checkout handoff: local cart API HTTP 200; destination host `padma-ethnic-tpvw9zki.myshopify.com`.

## Defects corrected and retested

### High priority

1. Product category mismatch
   - Shopify sample `Saree` was displayed as a Kurta Set when product type and tags were empty.
   - Fixed title-aware category inference as a defensive fallback.
   - Retest: mapper unit test and `/collections/sarees` browser route passed.
   - Long-term action: set accurate product type and tags in Shopify Admin.

2. Lookbook conversion links returned 404
   - Lookbook used the local fallback catalogue while product routes used live Shopify products.
   - Fixed Lookbook to use the Shopify-authoritative repository.
   - Retest: internal-link and Lookbook route QA passed.

3. Single-variant add-to-cart usability
   - One-size products could require a redundant size selection, and Shopify's synthetic `Default` option was shown to customers.
   - Fixed automatic sole-size selection and suppressed synthetic option text while retaining the underlying variant ID.
   - Retest: focused component tests and visible checkout journey passed.

4. Variant pricing
   - Product/cart price could remain at the minimum product price after selecting a differently priced Shopify variant.
   - Fixed live selected-variant price display and cart-line price capture.
   - Retest: regression test verifies a ₹1,300 variant appears as ₹1,300 and produces a ₹1,300 cart subtotal.

5. Cart quantity/API mismatch
   - Browser cart could exceed the Shopify API endpoint's maximum quantity of 20, causing checkout failure.
   - Fixed reducer-level clamping, disabled increment controls at the limit, and normalized persisted quantities.
   - Retest: reducer boundary tests passed.

6. Persisted cart corruption
   - Arbitrary or stale localStorage objects could crash cart total calculation.
   - Fixed validation and normalization of persisted lines.
   - Retest: malformed persisted-line regression passed.

7. Keyboard and modal behavior
   - Menus, cart drawer, and gallery lacked reliable Escape handling, focus placement/return, and body-scroll restoration.
   - Fixed all three interaction families.
   - Retest: component keyboard/focus tests and mobile browser menu test passed.

### Medium priority

8. Search contradiction
   - A zero-results message appeared with unlabelled recommendation product cards.
   - Removed unrelated cards from the true zero-results state and hardened recent-search localStorage parsing.

9. Price-edit links
   - Homepage price-edit tiles linked to the same unfiltered collection.
   - Added explicit URL price bands and initial catalogue filter support.
   - Retest: catalogue regression test passed.

10. Product information noise
    - Empty Features and unnecessary size-guide controls were shown for products without the underlying data.
    - Made these sections conditional and rewrote backend-oriented review copy for customers.

11. Backend request hangs
    - Shopify GraphQL fetches had no upper time bound.
    - Added a 10-second abort timeout.

12. Loading and scroll performance
    - Reduced unnecessary secondary-card image loading and deferred below-the-fold rendering while preserving intrinsic geometry.
    - Final Lighthouse Performance reached 96; scripted mobile scrolling held 16.8 ms p95.

13. Security/repository hygiene
    - Added baseline HTTP security headers and removed the `X-Powered-By` disclosure.
    - Removed 640 tracked Chrome-profile files (about 88 MB of browser state), purged that path from all local Git history, and ignored all future QA profiles/generated reports.
    - No Git remote is configured; the sanitized repository can be connected or shared without reintroducing that browser profile.

## Investigated report that was not a product defect

An independent run observed CSS HTTP 500 and raw, overlapping HTML while the production build directory was being replaced under an already-running Next server. A clean build and process restart corrected this: the final hashed stylesheet returns HTTP 200 as `text/css`, fresh desktop/mobile screenshots are styled, and all interaction tests pass. Deployment must build a new immutable release before switching traffic rather than modifying `.next` beneath a live server.

## Remaining launch blockers

### Critical: legal and business facts are missing

Do not publish generated legal claims. Confirm the following before writing Privacy, Terms, Shipping, Returns/Refunds, Contact, and checkout-policy pages:

- Legal business/entity name and operating/trading name.
- Business and return postal addresses.
- Support email and phone/WhatsApp contact.
- Dispatch timeframe, delivery regions, shipping fees, and free-shipping threshold.
- Return eligibility, return window, exchange rules, exclusions, damaged-item process, and refund timing.
- Cancellation rules.
- COD availability and fees.
- Governing jurisdiction.
- Privacy contact and the actual analytics/marketing/payment services used.

### Critical: Shopify product data is sample quality

Current live product evidence:

- Title: `Saree`.
- Description: `First sample`.
- Material: `See Shopify product description`.
- Model measurements and production details are absent.
- Only one live product was verified.

Populate the complete catalogue with accurate titles, descriptions, product types, tags, prices, compare-at prices, variants, inventory, media, materials, care, included items, origins, SKUs, and collection memberships.

### Production activation

- Complete factual legal policies and expose them in storefront/footer and Shopify checkout.
- Transfer/activate the Shopify store and select a paid plan when ready.
- Configure domain, shipping, taxes, payments, notification templates, and test mode with the owner.
- Perform a controlled test order only after payment/test configuration and explicit approval.

## Dependency maintenance

`npm audit --omit=dev` reports zero vulnerabilities. Several non-security updates are available, including Next.js 16.3.4, eslint-config-next 16.3.4, Puppeteer Core 25.10.0, Lucide React 1.41.0, and minor Testing Library type/test updates. Major versions of ESLint, TypeScript, Vitest, and Node types should be upgraded separately with dedicated regression testing rather than during this stabilization pass.
