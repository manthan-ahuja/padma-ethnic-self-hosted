import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";
const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const candidates = [process.env.CHROME_PATH,"C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].filter(Boolean);
const executablePath = candidates.find((candidate) => existsSync(candidate));
if (!executablePath) throw new Error("Chrome not found");
const browser = await puppeteer.launch({ executablePath, headless:true, args:["--no-sandbox","--disable-gpu"] });
const errors=[];
const checks={};
async function pageFor(width=1440,height=1000){const page=await browser.newPage();await page.setViewport({width,height,deviceScaleFactor:1});page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});page.on("pageerror",e=>errors.push(e.message));return page;}
async function visit(page,path){const response=await page.goto(`${baseUrl}${path}`,{waitUntil:"domcontentloaded",timeout:60000});if(!response || response.status()>=400) throw new Error(`${path} returned ${response?.status()}`);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await new Promise(r=>setTimeout(r,500));}
let page=await pageFor();
await visit(page,"/");
await page.screenshot({path:"qa/expanded-home-desktop.png",fullPage:true});
checks.home=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,edits:Boolean(document.querySelector(".home-edits")),wedding:Boolean(document.querySelector(".wedding-campaign")),community:Boolean(document.querySelector(".community-preview")),searchHref:document.querySelector('a[aria-label="Search"]')?.getAttribute("href")}));
await page.close();
page=await pageFor(390,844);await visit(page,"/");await page.screenshot({path:"qa/expanded-home-mobile.png",fullPage:false});checks.mobileHome=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,bagVisible:getComputedStyle(document.querySelector(".bag-button")).display!=="none"}));await page.close();
page=await pageFor();await visit(page,"/collections/sarees");await page.screenshot({path:"qa/expanded-collection.png",fullPage:false});checks.collection=await page.evaluate(()=>({title:document.querySelector("h1")?.textContent,count:document.querySelectorAll(".collection-product-grid .product-card").length,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth}));
await visit(page,"/search?q=indigo");checks.search=await page.evaluate(()=>({value:document.querySelector("#catalog-search")?.value,results:document.querySelectorAll(".search-results .product-card").length}));await page.close();page=await pageFor();
await visit(page,"/products/neelambari-silk-saree");await page.waitForSelector('input[value="Free Size"]');await page.click('input[value="Free Size"]');await page.waitForFunction(()=>document.querySelector('input[value="Free Size"]')?.checked);await page.click(".product-add-button");await page.waitForSelector('[role="status"]');await page.screenshot({path:"qa/expanded-product-desktop.png",fullPage:false});checks.product=await page.evaluate(()=>({confirmation:document.querySelector('[role="status"]')?.textContent,delivery:Boolean(document.querySelector(".delivery-checker")),sticky:Boolean(document.querySelector(".mobile-purchase-bar")),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth}));
await visit(page,"/cart");await page.screenshot({path:"qa/expanded-cart.png",fullPage:false});checks.cart=await page.evaluate(()=>({hasItem:document.body.textContent.includes("Neelambari Silk Saree"),hasVariant:document.body.textContent.includes("Free Size"),checkoutDisabled:document.querySelector(".order-summary .checkout-button")?.disabled}));
for(const path of ["/about","/our-craft","/lookbook","/journal","/journal/the-art-of-repeat-wear","/wishlist"]){await visit(page,path);checks[path]=await page.evaluate(()=>({h1:document.querySelector("h1")?.textContent,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth}));}
await page.close();
page=await pageFor(390,844);await visit(page,"/products/neelambari-silk-saree");await page.screenshot({path:"qa/expanded-product-mobile.png",fullPage:false});checks.mobileProduct=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,sticky:getComputedStyle(document.querySelector(".mobile-purchase-bar")).display!=="none"}));await page.close();
await browser.close();
console.log(JSON.stringify({checks,errors},null,2));
const failed=checks.home.overflow||!checks.home.edits||!checks.home.wedding||!checks.home.community||checks.home.searchHref!=="/search"||checks.mobileHome.overflow||!checks.mobileHome.bagVisible||checks.collection.title!=="Sarees"||checks.collection.count<1||checks.collection.overflow||checks.search.results<1||!checks.product.confirmation?.includes("Added 1")||!checks.product.delivery||checks.product.overflow||!checks.cart.hasItem||!checks.cart.hasVariant||checks.cart.checkoutDisabled!==true||checks.mobileProduct.overflow||!checks.mobileProduct.sticky||Object.entries(checks).filter(([key])=>key.startsWith("/")).some(([,value])=>value.overflow||!value.h1)||errors.length;
if(failed) process.exitCode=1;
