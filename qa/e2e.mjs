import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3001";
const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const executablePath = chromeCandidates.find((candidate) => existsSync(candidate));

if (!executablePath) {
  throw new Error("Chrome was not found. Set CHROME_PATH to run browser QA.");
}

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--disable-gpu"],
});

let page = await browser.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await page.goto(baseUrl, { waitUntil: "networkidle0" });
await page.screenshot({ path: "qa/mobile-brand.png", fullPage: false });

const mobile = await page.evaluate(() => {
  const bag = document.querySelector(".bag-button");
  const viewportWidth = document.documentElement.clientWidth;
  return {
    bagVisible: Boolean(bag && getComputedStyle(bag).display !== "none"),
    horizontalOverflow: document.documentElement.scrollWidth > viewportWidth,
    logoLoaded: Boolean(
      document.querySelector(".brand-lotus")?.complete &&
      document.querySelector(".brand-lotus")?.naturalWidth > 0
    ),
  };
});

await page.close();
page = await browser.newPage();
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForFunction(
  () =>
    document.querySelector(".brand-lotus")?.naturalWidth > 0 &&
    document.querySelector(".hero-image")?.naturalWidth > 0,
  { timeout: 30_000 },
);
await page.$eval(".hero-image", (image) => image.decode());
await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
await page.screenshot({ path: "qa/desktop-brand.png", fullPage: false });

let cartText = "";
await page.click("#collection .filter-row button:nth-child(2)");
const names = await page.$$eval(".product-copy h3", (nodes) =>
  nodes.map((node) => node.textContent),
);
await page.$eval(".footer", (node) => node.scrollIntoView());
await page.waitForFunction(
  () => document.querySelector(".footer-logo")?.naturalWidth > 0,
  { timeout: 30_000 },
);
const footerLogoLoaded = await page.$eval(
  ".footer-logo",
  (node) => node.complete && node.naturalWidth > 0,
);
await page.screenshot({ path: "qa/footer-brand.png", fullPage: false });

const productUrl = `${baseUrl}/products/neelambari-silk-saree`;
await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForFunction(
  () => document.querySelector(".product-gallery-image")?.naturalWidth > 0,
  { timeout: 30_000 },
);
await page.$eval(".product-gallery-image", (image) => image.decode());
await page.screenshot({ path: "qa/product-desktop.png", fullPage: false });
const productContent = await page.evaluate(() => ({
  title: document.querySelector("#product-title")?.textContent,
  material: document.querySelector(".product-facts")?.textContent?.includes("Pure handwoven silk"),
  delivery: document.querySelector(".product-facts")?.textContent?.includes("4–7 business days"),
  desktopOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
}));
await page.click(".product-gallery-main");
await page.waitForSelector('[role="dialog"][aria-label$="full-screen gallery"]');
const galleryOpened = Boolean(await page.$('[role="dialog"][aria-label$="full-screen gallery"]'));
await page.click('button[aria-label="Close full-screen gallery"]');
await page.click('button[aria-label="Increase quantity"]');
await page.click(".product-add-button");
await page.waitForSelector('[role="status"]');
const selectionConfirmed = await page.$eval('[role="status"]', (node) => node.textContent?.includes("Added 2 × Neelambari Silk Saree"));
await page.goto(`${baseUrl}/cart`, { waitUntil: "networkidle0", timeout: 60_000 });
await page.waitForSelector(".order-summary");
cartText = await page.$eval(".order-summary", (node) => node.textContent ?? "");

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForFunction(
  () => document.querySelector(".product-gallery-image")?.naturalWidth > 0,
  { timeout: 30_000 },
);
await page.$eval(".product-gallery-image", (image) => image.decode());
await page.screenshot({ path: "qa/product-mobile.png", fullPage: false });
const productMobileOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
);

const result = {
  mobile,
  cartContainsSubtotal: cartText?.includes("Subtotal") ?? false,
  sareeFilterNames: names,
  footerLogoLoaded,
  productDetail: {
    ...productContent,
    galleryOpened,
    selectionConfirmed,
    mobileOverflow: productMobileOverflow,
  },
  consoleErrors: errors,
};
console.log(JSON.stringify(result, null, 2));
await browser.close();

if (
  !mobile.bagVisible ||
  mobile.horizontalOverflow ||
  !mobile.logoLoaded ||
  !result.cartContainsSubtotal ||
  !footerLogoLoaded ||
  productContent.title !== "Neelambari Silk Saree" ||
  !productContent.material ||
  !productContent.delivery ||
  productContent.desktopOverflow ||
  !galleryOpened ||
  !selectionConfirmed ||
  productMobileOverflow ||
  names.some((name) => !name?.includes("Saree")) ||
  errors.length > 0
) {
  process.exitCode = 1;
}
