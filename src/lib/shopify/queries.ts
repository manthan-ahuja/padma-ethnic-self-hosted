export const PRODUCT_FIELDS = `#graphql
  fragment PadmaProduct on Product {
    id handle title description productType tags
    featuredImage { url altText width height }
    images(first: 12) { nodes { url altText width height } }
    priceRange { minVariantPrice { amount currencyCode } }
    compareAtPriceRange { minVariantPrice { amount currencyCode } }
    options { name values }
    variants(first: 100) {
      nodes { id title availableForSale price { amount currencyCode } selectedOptions { name value } }
    }
    material: metafield(namespace: "custom", key: "material") { value }
    care: metafield(namespace: "custom", key: "care") { value }
    included: metafield(namespace: "custom", key: "included") { value }
    origin: metafield(namespace: "custom", key: "origin") { value }
    deliveryEstimate: metafield(namespace: "custom", key: "delivery_estimate") { value }
    sku: metafield(namespace: "custom", key: "sku") { value }
  }
`;

export const PRODUCTS_QUERY = `#graphql
  ${PRODUCT_FIELDS}
  query PadmaProducts($first: Int!, $query: String, $sortKey: ProductSortKeys!) {
    products(first: $first, query: $query, sortKey: $sortKey) { nodes { ...PadmaProduct } }
  }
`;

export const PRODUCT_BY_HANDLE_QUERY = `#graphql
  ${PRODUCT_FIELDS}
  query PadmaProductByHandle($handle: String!) { product(handle: $handle) { ...PadmaProduct } }
`;

export const CART_CREATE_MUTATION = `#graphql
  mutation PadmaCartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart { id checkoutUrl totalQuantity cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } } }
      userErrors { field message code }
      warnings { message code }
    }
  }
`;
