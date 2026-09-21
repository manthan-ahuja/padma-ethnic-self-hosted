# Padma Ethnic — Self-Hosted Commerce

A complete, independent Padma Ethnic storefront and commerce backend. Products, variants, inventory, collections, customers, carts, addresses, checkout, orders, and administration are stored in Padma's own libSQL database.

This is the self-hosted sibling of the original provider-backed project. It runs independently on port 3001 by default and does not require an external commerce platform.

## Stack

- Next.js 16 App Router, React 19, and TypeScript
- Auth.js with Google OAuth and email/password accounts
- libSQL/SQLite for commerce and customer data
- Salted Node.js scrypt password hashes
- Vitest and Testing Library
- Puppeteer Core browser QA

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev -- --port 3001
```

Open http://localhost:3001.

Set `NEXTAUTH_SECRET` to a long random value. Google OAuth is optional for customers but required for administrators so ownership of an allowlisted email is verified. To use `/admin`, set `ADMIN_EMAILS` to the Google-authenticated administrator email:

```env
ADMIN_EMAILS=you@example.com
```

The local database is created automatically at `.data/padma.db` and seeded with the eight prototype Padma products, their colour/size variants, ten units of inventory per variant, and starter collections.

## Commerce capabilities

### Storefront

- Database-backed products, colour/size variants, per-variant prices and inventory, uploaded media, availability, and collections
- Server-rendered catalogue, search, collection, product, wishlist, lookbook, and cart routes
- Anonymous and account-connected carts with optimistic version conflict handling
- Variant-aware product selection and authoritative checkout validation
- Responsive checkout with saved delivery addresses and cash on delivery
- Percentage, fixed-amount, and free-shipping coupon codes with minimum-order and usage-limit rules
- Transactional order creation and inventory deduction
- Idempotent checkout attempts to prevent duplicate orders or double stock deductions
- Customer-owned address and order history

### Administration

The protected `/admin` dashboard provides:

- Full product creation and editing across descriptive, merchandising, media, option, price, and inventory fields
- Automatic sequential product numbers starting at `1001` and generated variant SKUs such as `PE-1001-NAVY-M`
- Standard colour and size selectors, custom option values, and an automatically generated variant matrix
- Separate price and stock quantities for every colour/size combination
- Multi-image uploads backed by Vercel Blob
- Product publishing and archiving
- Coupon creation and editing for percentage, fixed-amount, and free-shipping discounts
- Collection creation and product assignment
- Order listing and status updates

Every admin page and API request requires both a verified Google-authenticated identity and a matching email in the server-only `ADMIN_EMAILS` allowlist. Password signup is disabled for allowlisted addresses. Mutation APIs also reject cross-origin browser requests.

### Inventory and order safety

- Prices and stock come from the server database, never browser totals.
- Checkout derives the customer from the signed Auth.js session.
- Delivery addresses must belong to that customer.
- Inventory is decremented with conditional writes inside a database transaction.
- Any unavailable item rolls back the entire order and every inventory change.
- `(customer, idempotency key)` is unique, so retries return the existing order.
- Inventory adjustments are recorded in an audit ledger.
- Password hashes, database tokens, OAuth secrets, and admin configuration remain server-side.

## Routes

Storefront:

- `/`
- `/collections/[slug]`
- `/products/[id]`
- `/search`
- `/wishlist`
- `/cart`
- `/checkout`
- `/account`

Administration:

- `/admin`
- `/api/admin/products`
- `/api/admin/products/[id]`
- `/api/admin/discounts`
- `/api/admin/media`
- `/api/admin/inventory/[id]`
- `/api/admin/collections`
- `/api/admin/orders`
- `/api/admin/orders/[id]`

Customer commerce:

- `/api/checkout`
- `/api/account/cart`
- `/api/account/addresses`
- `/api/account/orders`

## Database configuration

Local development:

```env
CUSTOMER_DATABASE_URL=file:.data/padma.db
CUSTOMER_DATABASE_AUTH_TOKEN=
COMMERCE_DATABASE_URL=file:.data/padma.db
COMMERCE_DATABASE_AUTH_TOKEN=
```

Both URLs must point to the same database because customers, addresses, orders, catalogue, and inventory participate in one commerce data model.

For production, use one durable managed libSQL database and set both URL/token pairs to that database. Maintain backups and controlled schema migrations before launch.

## Payments

Cash on delivery is the currently operational checkout method. The order model includes a payment method and payment reference seam for a future hosted payment provider.

Do not mark online orders as paid from a browser callback. A future online-payment integration must verify signed server-to-server webhooks, make webhook processing idempotent, and only then update payment/order state.

## Quality checks

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
npm audit --omit=dev --audit-level=high
```

## Production limitations

Before a public launch, add:

- A real online payment provider and verified webhook processing, if prepaid orders are required
- Shipping serviceability, courier labels, tracking, and automated fulfillment
- Tax invoices and jurisdiction-specific tax rules
- Gift cards and advanced discount combinations/stacking
- Email verification, password reset, transactional order emails, and explicit identity linking
- A shared/distributed rate limiter for multi-instance deployment
- Managed migrations, automated backups, monitoring, and alerting
- Returns, refunds, and restocking workflows

The included catalogue content and imagery are prototypes and must be replaced with confirmed product facts and licensed production assets before launch.
