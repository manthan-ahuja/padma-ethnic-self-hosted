import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const executablePath = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
].filter(Boolean).find((path) => existsSync(path));

if (!executablePath) throw new Error("Chrome was not found");

const browser = await puppeteer.launch({ executablePath, headless: true });
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

try {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: "networkidle0", timeout: 60_000 });
  await page.waitForSelector('[data-scroll-reveal="pending"]', { timeout: 10_000 });

  const initial = await page.evaluate(() => ({
    routeSurface: Boolean(document.querySelector(".route-view")),
    pending: document.querySelectorAll('[data-scroll-reveal="pending"]').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  assert(initial.routeSurface, "Route entrance surface is missing");
  assert(initial.pending > 0, "No below-fold content was prepared for reveal");
  assert(!initial.overflow, "Motion styling introduced horizontal overflow");

  await page.$eval('[data-scroll-reveal="pending"]', (element) => element.scrollIntoView({ block: "center" }));
  await page.waitForFunction(() => Boolean(document.querySelector('[data-scroll-reveal="visible"]')), { timeout: 10_000 });
  await new Promise((resolve) => setTimeout(resolve, 850));
  const revealStyle = await page.$eval('[data-scroll-reveal="visible"]', (element) => {
    const style = getComputedStyle(element);
    return { opacity: Number(style.opacity), transform: style.transform };
  });
  assert(revealStyle.opacity > 0.98, `Revealed content opacity remained ${revealStyle.opacity}`);
  assert(revealStyle.transform === "none" || revealStyle.transform === "matrix(1, 0, 0, 1, 0, 0)", `Reveal transform did not settle: ${revealStyle.transform}`);
  await page.screenshot({ path: "qa/output/motion-desktop.png", fullPage: false });

  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30_000 }),
    page.click('a[href="/collections/new-arrivals"]'),
  ]);
  const routeAnimation = await page.$eval(".route-view", (element) => getComputedStyle(element).animationName);
  assert(routeAnimation.includes("route-enter"), `Route entrance animation is not active: ${routeAnimation}`);

  await page.$eval(".route-view", (element) => { element.dataset.qaRouteSurface = "old"; });
  await page.waitForSelector('a[href="/collections/sarees"]', { timeout: 30_000 });
  await page.click('a[href="/collections/sarees"]');
  await page.waitForFunction(() => location.pathname === "/collections/sarees" && !document.querySelector(".route-view")?.hasAttribute("data-qa-route-surface"), { timeout: 30_000 });
  const sameSegmentAnimation = await page.$eval(".route-view", (element) => getComputedStyle(element).animationName);
  assert(sameSegmentAnimation.includes("route-enter"), "Same-segment route change did not restart the entrance surface");
  await page.close();

  const mobilePage = await browser.newPage();
  await mobilePage.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await mobilePage.goto(baseUrl, { waitUntil: "networkidle0", timeout: 60_000 });
  await mobilePage.evaluate(() => scrollTo(0, Math.min(1200, document.documentElement.scrollHeight - innerHeight)));
  await mobilePage.click('[aria-label="Open menu"]');
  const menuBounds = await mobilePage.$eval('[role="dialog"][aria-label="Navigation menu"]', (element) => {
    const bounds = element.getBoundingClientRect();
    return { top: bounds.top, bottom: bounds.bottom, width: bounds.width, viewportWidth: innerWidth, viewportHeight: innerHeight };
  });
  assert(Math.abs(menuBounds.top) <= 1 && menuBounds.bottom >= menuBounds.viewportHeight - 1, "Mobile navigation no longer covers the viewport after scrolling");
  assert(Math.abs(menuBounds.width - menuBounds.viewportWidth) <= 1, "Mobile navigation width is no longer viewport-bound");
  await mobilePage.keyboard.press("Escape");
  await mobilePage.close();

  const reducedPage = await browser.newPage();
  await reducedPage.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await reducedPage.goto(baseUrl, { waitUntil: "networkidle0", timeout: 60_000 });
  const reduced = await reducedPage.evaluate(() => ({
    pending: document.querySelectorAll('[data-scroll-reveal="pending"]').length,
    hidden: [...document.querySelectorAll("[data-scroll-reveal]")].filter((element) => getComputedStyle(element).opacity === "0").length,
    routeAnimationDuration: getComputedStyle(document.querySelector(".route-view")).animationDuration,
  }));
  assert(reduced.pending === 0, "Reduced-motion mode left reveal elements pending");
  assert(reduced.hidden === 0, "Reduced-motion mode hid content");
  assert(reduced.routeAnimationDuration === "1e-05s" || reduced.routeAnimationDuration === "0.00001s", `Reduced-motion route duration was ${reduced.routeAnimationDuration}`);
  await reducedPage.close();
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Motion QA failed:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("Motion QA passed: scroll/stream reveals, same-segment route entrance, fixed mobile overlay, overflow safety, and reduced-motion behavior verified.");
}
