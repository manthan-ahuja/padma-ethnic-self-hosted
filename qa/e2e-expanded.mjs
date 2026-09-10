import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const chromePath = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const outputDir = path.resolve("qa/output");
await fs.mkdir(outputDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--disable-dev-shm-usage"],
});

const failures = [];
const observations = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

async function createPage(viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) errors.push(`console: ${message.text()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  page.on("requestfailed", (request) => {
    const reason = request.failure()?.errorText ?? "unknown";
    if (reason === "net::ERR_ABORTED" && request.url().includes("_rsc=")) return;
    errors.push(`request failed: ${request.url()} (${reason})`);
  });
  return { page, errors };
}

async function visit(page, route) {
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.evaluate(() => document.fonts.ready);
  assert(response && response.status() < 400, `${route}: returned HTTP ${response?.status() ?? "no response"}`);
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    return {
      duration: Math.round(nav?.duration ?? 0),
      domContentLoaded: Math.round(nav?.domContentLoadedEventEnd ?? 0),
      load: Math.round(nav?.loadEventEnd ?? 0),
      width: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
  assert(metrics.width <= metrics.clientWidth + 1, `${route}: horizontal overflow (${metrics.width}px > ${metrics.clientWidth}px)`);
  assert(metrics.duration < 5_000, `${route}: navigation exceeded 5 seconds (${metrics.duration}ms)`);
  observations.push({ route, ...metrics });
  return { metrics, response };
}

async function waitForImages(page, route) {
  await page.evaluate(async () => {
    const images = [...document.images].filter((image) => image.loading !== "lazy" || image.getBoundingClientRect().top < innerHeight * 2);
    await Promise.all(images.map((image) => image.complete ? undefined : new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
      setTimeout(resolve, 10_000);
    })));
  });
  const broken = await page.$$eval("img", (images) => images.filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src));
  assert(broken.length === 0, `${route}: ${broken.length} broken image(s): ${broken.join(", ")}`);
}

async function renderFullPage(page, fileName) {
  await page.evaluate(async () => {
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    for (let top = 0; top <= max; top += Math.max(400, innerHeight * .8)) {
      scrollTo(0, top);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    scrollTo(0, 0);
    document.querySelectorAll(".category-showcase, .collection-section, .home-edits, .wedding-campaign, .home-trust-strip, .craft-story, .founder-note, .community-preview, .newsletter, .footer").forEach((element) => {
      element.style.contentVisibility = "visible";
    });
  });
  await page.screenshot({ path: path.join(outputDir, fileName), fullPage: true });
}

async function testDesktop() {
  const { page, errors } = await createPage({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  const { response: homeResponse } = await visit(page, "/");
  const securityHeaders = homeResponse.headers();
  assert(securityHeaders["x-content-type-options"] === "nosniff", "Homepage: X-Content-Type-Options header missing");
  assert(securityHeaders["x-frame-options"] === "DENY", "Homepage: X-Frame-Options header missing");
  await page.waitForSelector(".product-card .product-image-link", { timeout: 20_000 });
  await waitForImages(page, "/");
  const productHref = await page.$eval(".product-card .product-image-link", (link) => link.getAttribute("href"));
  assert(Boolean(productHref), "Homepage: first product has no destination");

  const internalLinks = await page.$$eval('a[href^="/"]', (links) => [...new Set(links.map((link) => link.getAttribute("href")).filter(Boolean))]);
  for (const href of internalLinks) {
    const response = await page.evaluate(async (url) => {
      const result = await fetch(url, { method: "GET" });
      return result.status;
    }, href);
    assert(response < 400, `Broken internal link ${href}: HTTP ${response}`);
  }

  await renderFullPage(page, "home-desktop.png");
  await visit(page, productHref);
  await waitForImages(page, productHref);
  const productTitle = await page.$eval("h1", (heading) => heading.textContent?.trim() ?? "");
  const category = await page.$eval(".product-detail-category", (element) => element.textContent?.trim() ?? "");
  if (/saree/i.test(productTitle)) assert(category.toUpperCase() === "SAREES", `${productHref}: saree is categorized as ${category}`);

  const sizeInput = await page.$('input[name="size"]:not(:checked)');
  if (sizeInput) await sizeInput.click();
  const colourInput = await page.$('input[name="colour"]:not(:checked)');
  if (colourInput) await colourInput.click();
  await page.click(".product-add-button");
  await page.waitForSelector('[role="status"]', { timeout: 5_000 });
  const addStatus = await page.$eval('[role="status"]', (node) => node.textContent ?? "");
  assert(/Added/i.test(addStatus), `${productHref}: Add to bag did not confirm success`);

  await visit(page, "/cart");
  const itemCount = await page.$$eval(".cart-page-item", (items) => items.length);
  assert(itemCount > 0, "/cart: added product was not persisted");
  const checkout = await page.$(".checkout-button");
  assert(Boolean(checkout), "/cart: checkout button missing");
  if (checkout) assert(!(await checkout.evaluate((button) => button.disabled)), "/cart: Shopify checkout button unexpectedly disabled");
  await renderFullPage(page, "cart-desktop.png");

  await visit(page, "/search?q=saree");
  const results = await page.$$eval(".product-card", (cards) => cards.length);
  assert(results > 0, "/search?q=saree: expected a live product result");

  await visit(page, "/");
  await page.click(".heart-button");
  await visit(page, "/wishlist");
  assert((await page.$$eval(".product-card", (cards) => cards.length)) > 0, "/wishlist: wished product was not persisted");

  for (const route of ["/collections/all", "/collections/sarees", "/about", "/our-craft", "/lookbook", "/journal", "/journal/the-art-of-repeat-wear"]) {
    await visit(page, route);
  }

  assert(errors.length === 0, `Desktop runtime errors:\n${errors.join("\n")}`);
  await page.close();
}

async function testMobileAndScroll() {
  const { page, errors } = await createPage({ width: 390, height: 844, deviceScaleFactor: 2 });
  await visit(page, "/");
  await page.click('[aria-label="Open menu"]');
  assert(Boolean(await page.$('[role="dialog"][aria-label="Navigation menu"]')), "Mobile: menu did not open");
  await page.keyboard.press("Escape");
  assert(!(await page.$('[role="dialog"][aria-label="Navigation menu"]')), "Mobile: Escape did not close menu");

  const scrollResult = await page.evaluate(async () => {
    const deltas = [];
    let previous = performance.now();
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    for (let step = 1; step <= 60; step += 1) {
      await new Promise((resolve) => requestAnimationFrame((now) => {
        deltas.push(now - previous);
        previous = now;
        scrollTo(0, max * (step / 60));
        resolve();
      }));
    }
    deltas.sort((a, b) => a - b);
    return { p95: Math.round(deltas[Math.floor(deltas.length * .95)] * 10) / 10, max: Math.round(deltas.at(-1) * 10) / 10 };
  });
  observations.push({ route: "/ (mobile scroll)", ...scrollResult });
  assert(scrollResult.p95 < 50, `Mobile scroll: p95 frame interval was ${scrollResult.p95}ms`);

  const productHref = await page.$eval(".product-card .product-image-link", (link) => link.getAttribute("href"));
  await visit(page, productHref);
  assert(Boolean(await page.$(".mobile-purchase-bar")), "Mobile product: sticky purchase bar missing");
  await renderFullPage(page, "product-mobile.png");
  assert(errors.length === 0, `Mobile runtime errors:\n${errors.join("\n")}`);
  await page.close();
}

async function testCheckoutHandoff() {
  const { page } = await createPage({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await visit(page, "/products/saree");
  await page.click("button.product-add-button");
  await visit(page, "/cart");
  const disabled = await page.$eval("button.checkout-button", (button) => button.disabled);
  assert(!disabled, "Secure checkout remained disabled after adding the live Shopify variant");
  const responsePromise = page.waitForResponse((response) => response.url().includes("/api/shopify/cart"), { timeout: 30_000 });
  const navigationPromise = page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.click("button.checkout-button");
  const [cartResponse] = await Promise.all([responsePromise, navigationPromise]);
  assert(cartResponse.ok(), `Checkout API returned HTTP ${cartResponse.status()}`);
  const destination = new URL(page.url());
  assert(destination.protocol === "https:" && destination.hostname.includes("shopify"), `Checkout did not hand off to Shopify: ${page.url()}`);
  observations.push({ route: "/cart → Shopify checkout", status: cartResponse.status(), destination: destination.hostname });
  await page.close();
}

try {
  await testDesktop();
  await testMobileAndScroll();
  await testCheckoutHandoff();
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, "qa-metrics.json"), `${JSON.stringify({ baseUrl, observations, failures }, null, 2)}\n`);
if (failures.length) {
  console.error(`Expanded QA failed (${failures.length} issue${failures.length === 1 ? "" : "s"}):\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(`Expanded QA passed: ${observations.length} route/performance checks, desktop and mobile interactions, links, images, persistence and scroll smoothness.`);
}
