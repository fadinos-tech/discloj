// Play Store screenshots via Playwright + system Edge
import { chromium } from "playwright";
const shots = [["home","/"],["journey","/#/en/journey"],["place","/#/en/place/an/AN01"],["map","/#/en/map"],["bible","/#/en/place/ec/EC00"],["videos","/#/en/videos"]];
const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
for (const [name, path] of shots) {
  await page.goto("http://localhost:8080" + path, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `dist/play-store/screen-${name}.png` });
  console.log("shot", name);
}
await browser.close();
