import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3002";
const candidates = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
].filter(existsSync);
const browser = await puppeteer.launch({
  executablePath: candidates[0],
  headless: true,
  args: ["--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
const failures = [];
const imageResponses = [];
page.on("requestfailed", (request) => failures.push({ url: request.url(), error: request.failure()?.errorText }));
page.on("response", (response) => {
  if (response.url().includes("padma-hero") || response.url().includes("_next/image")) {
    imageResponses.push({ url: response.url(), status: response.status() });
  }
});
await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
await new Promise((resolve) => setTimeout(resolve, 10_000));
const state = await page.$eval(".hero-image", (image) => {
  const rect = image.getBoundingClientRect();
  const style = getComputedStyle(image);
  const parentRect = image.parentElement?.getBoundingClientRect();
  return {
    src: image.src,
    srcset: image.srcset,
    sizes: image.sizes,
    loading: image.loading,
    fetchPriority: image.fetchPriority,
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    currentSrc: image.currentSrc,
    rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
    parentRect: parentRect && { width: parentRect.width, height: parentRect.height, top: parentRect.top, left: parentRect.left },
    display: style.display,
    visibility: style.visibility,
    opacity: style.opacity,
  };
});
console.log(JSON.stringify({ state, imageResponses, failures }, null, 2));
await browser.close();
