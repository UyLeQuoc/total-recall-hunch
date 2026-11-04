/**
 * Real screens of the live site for the film, into apps/video/.build/shots. Testing the demo hunch saves a
 * practice draft, as any visitor's would; nothing is put on record and nothing reaches Walrus Memory.
 *   bun shots.ts
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";

const ROOT = new URL("../..", import.meta.url).pathname;
const OUT = join(ROOT, "apps", "video", ".build", "shots");
const SITE = process.env.HUNCH_SITE ?? "https://testyourhunch.vercel.app";
const HUNCH =
  "When the books and Polymarket disagree by 1+ points on an NBA game, the books are right.";
const PICK = "p_0q47076d2o6c5t5e";
const T = 90_000;

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: T });
  await page.waitForTimeout(1200);
}

async function shoot(page: Page, name: string, full = false): Promise<void> {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: full });
  console.log("  ✓", name);
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "light",
  });
  const page = await context.newPage();

  await page.goto(SITE);
  await page.getByLabel("Your hunch").waitFor({ timeout: T });
  await settle(page);
  await shoot(page, "home");

  await page.getByLabel("Your hunch").fill(HUNCH);
  await page.getByLabel("Test it").click();
  await page.getByText(/games checked/).waitFor({ timeout: T });
  await settle(page);
  await shoot(page, "hunch");
  await shoot(page, "hunch-full", true);

  await page.goto(`${SITE}/games`);
  await page.locator("[aria-expanded]").first().waitFor({ timeout: T });
  await settle(page);
  await shoot(page, "games");
  await page.locator("[aria-expanded]", { hasText: "SAC" }).first().click();
  await page
    .getByText(/Leaning on|away from/)
    .first()
    .waitFor({ timeout: T });
  await settle(page);
  await shoot(page, "research");
  await shoot(page, "research-full", true);

  for (const [path, name, wait] of [
    [`/p/${PICK}`, "verify", /reads back from Sui/],
    ["/learning", "learning", /Brier/],
    ["/status", "status", /Tatum/],
  ] as const) {
    await page.goto(`${SITE}${path}`);
    await page.getByText(wait).first().waitFor({ timeout: T });
    await settle(page);
    await shoot(page, name);
    await shoot(page, `${name}-full`, true);
  }
} finally {
  await browser.close();
}
