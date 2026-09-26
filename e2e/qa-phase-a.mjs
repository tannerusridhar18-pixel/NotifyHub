import { chromium } from "playwright";
import fs from "node:fs";

const baseURL = process.env.NOTIFYHUB_BASE_URL || "http://localhost:3000";
const users = JSON.parse(process.env.NOTIFYHUB_QA_USERS_JSON || "{}");
const roles = ["superadmin", "principal", "dean", "hod_cse", "hod_ece", "deptadmin_cse", "deptadmin_ece", "faculty_cse", "faculty_ece", "student_cse_a", "student_cse_b", "student_ece_a"];
const results = [];
const browser = await chromium.launch({ headless: true });
fs.mkdirSync("e2e/artifacts", { recursive: true });

async function check(name, fn) {
  try { results.push({ name, status: await fn() }); }
  catch (error) { results.push({ name, status: "FAIL", detail: String(error) }); }
}

for (const role of roles) {
  const credentials = users[role];
  if (!credentials) {
    results.push({ name: `${role}: login and role dashboard`, status: "UNVERIFIED" });
    continue;
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("response", (response) => { if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`); });
  await check(`${role}: login and role dashboard`, async () => {
    await page.goto(`${baseURL}/auth/login`, { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email/i).fill(credentials.email);
    await page.getByLabel(/password/i).fill(credentials.password);
    await page.getByRole("button", { name: /sign in|login/i }).click();
    await page.waitForLoadState("networkidle");
    return page.url();
  });
  await check(`${role}: no console/network failures`, async () => consoleErrors.length || failedRequests.length ? "FAIL" : "PASS");
  await context.storageState({ path: `e2e/artifacts/${role}.json` });
  await context.close();
}

await browser.close();
const pass = results.filter((x) => x.status === "PASS" || (typeof x.status === "string" && x.status.startsWith("http"))).length;
const fail = results.filter((x) => x.status === "FAIL").length;
const unverified = results.filter((x) => x.status === "UNVERIFIED").length;
console.log(`PASS=${pass} FAIL=${fail} UNVERIFIED=${unverified}`);
fs.writeFileSync("e2e/phase-a-results.json", JSON.stringify(results, null, 2));
