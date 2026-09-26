import { chromium } from "playwright";
import fs from "node:fs";

const baseURL = process.env.QA_BASE_URL;
if (!baseURL) throw new Error("Missing QA_BASE_URL");
fs.mkdirSync("e2e/.auth", { recursive: true });
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(`${baseURL.replace(/\/$/, "")}/auth/login`, { waitUntil: "domcontentloaded" });
console.log("LOGIN NEEDED: SuperAdmin");
const deadline = Date.now() + 5 * 60 * 1000;
while (Date.now() < deadline) {
  if (!page.url().includes("/auth/login")) break;
  await page.waitForTimeout(1000);
}
if (page.url().includes("/auth/login")) {
  await browser.close();
  throw new Error("SuperAdmin login not completed within 5 minutes.");
}
await context.storageState({ path: "e2e/.auth/superadmin.json" });
console.log("SUPERADMIN_SESSION_SAVED");
await browser.close();
