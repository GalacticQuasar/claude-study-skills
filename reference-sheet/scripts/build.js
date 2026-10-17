#!/usr/bin/env node
// Assemble a reference sheet version and print it to PDF, then report layout problems.
// Usage: node build.js <version-dir> <out-name>
//   Reads <version-dir>/src/template.html and <version-dir>/src/sections/*.html (in filename order),
//   writes <version-dir>/<out-name>.html and <version-dir>/<out-name>.pdf.
//   Images are referenced as img/NAME.png, relative to the HTML, so they live in <version-dir>/img/.
// Needs Node and Playwright (any of: local/global `playwright`, `@playwright/test`, `@playwright/cli`).
// Env: PLAYWRIGHT_MODULE=<path to playwright module>, CHROME_PATH=<chromium executable> to override detection.
const fs = require("fs"), path = require("path"), os = require("os"), { execSync } = require("child_process");

function loadPlaywright() {
  const names = [process.env.PLAYWRIGHT_MODULE, "playwright", "playwright-core"].filter(Boolean);
  try {
    const g = execSync("npm root -g", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    for (const n of ["playwright", "playwright-core", "@playwright/test/node_modules/playwright",
      "@playwright/cli/node_modules/playwright"]) names.push(path.join(g, n));
  } catch {}
  for (const n of names) { try { return require(n); } catch {} }
  throw new Error("Playwright not found. Install it (npm i -g playwright && npx playwright install chromium) or set PLAYWRIGHT_MODULE.");
}

function chromeCandidates() {
  const out = [process.env.CHROME_PATH].filter(Boolean);
  const cache = path.join(os.homedir(), process.platform === "darwin" ? "Library/Caches/ms-playwright" : ".cache/ms-playwright");
  if (fs.existsSync(cache)) {
    const dirs = fs.readdirSync(cache).filter(d => /^chromium-\d+$/.test(d))
      .sort((a, b) => +b.split("-")[1] - +a.split("-")[1]);
    for (const d of dirs) for (const rel of ["chrome-linux64/chrome", "chrome-linux/chrome",
      "chrome-mac/Chromium.app/Contents/MacOS/Chromium", "chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium"])
      out.push(path.join(cache, d, rel));
  }
  return out.filter(p => fs.existsSync(p));
}

async function launch(chromium) {
  try { return await chromium.launch(); } catch (e) {
    for (const p of chromeCandidates()) { try { return await chromium.launch({ executablePath: p }); } catch {} }
    throw e;
  }
}

(async () => {
  const [verDir, name] = process.argv.slice(2);
  if (!verDir || !name) { console.error("usage: node build.js <version-dir> <out-name>"); process.exit(2); }
  const src = path.join(verDir, "src");
  const secs = fs.readdirSync(path.join(src, "sections")).filter(f => f.endsWith(".html")).sort()
    .map(f => fs.readFileSync(path.join(src, "sections", f), "utf8")).join("\n");
  const outHtml = path.resolve(verDir, name + ".html"), outPdf = path.resolve(verDir, name + ".pdf");
  fs.writeFileSync(outHtml, fs.readFileSync(path.join(src, "template.html"), "utf8").replace("<!--SECTIONS-->", secs));

  const { chromium } = loadPlaywright();
  const browser = await launch(chromium);
  // Viewport width ≈ printable width of Letter at 0.3in margins (7.9in at 96dpi), so screen layout matches print.
  const page = await browser.newPage({ viewport: { width: 758, height: 1000 } });
  await page.emulateMedia({ media: "print" });
  const console_ = [];
  page.on("console", m => { if (m.type() === "warning" || m.type() === "error") console_.push(m.text()); });
  page.on("requestfailed", r => console_.push("failed to load " + r.url()));
  await page.goto("file://" + outHtml, { waitUntil: "networkidle" });
  await page.waitForSelector("body[data-rendered]", { timeout: 20000 });

  const report = await page.evaluate(() => {
    const where = e => (e.closest("section") || {}).id || "?";
    const snip = e => e.textContent.replace(/\s+/g, " ").trim().slice(0, 70);
    return {
      katex: [...document.querySelectorAll(".katex-error")].map(e => where(e) + " :: " + (e.getAttribute("title") || e.textContent)),
      shrunk: [...document.querySelectorAll(".formula[data-shrunk]")].map(e => where(e) + " :: " + snip(e)),
      overflow: [...document.querySelectorAll(".formula, table.tbl, pre, .ex, .tip, p, li, figure")]
        .filter(e => e.scrollWidth > e.clientWidth + 2 || e.offsetWidth > e.parentElement.clientWidth + 1)
        .map(e => where(e) + " " + e.tagName.toLowerCase() + "." + e.className + " :: " + snip(e)),
      images: [...document.querySelectorAll("img")].filter(i => !i.complete || !i.naturalWidth).map(i => i.getAttribute("src")),
    };
  });
  await page.pdf({ path: outPdf, format: "Letter", printBackground: true,
    margin: { top: "0.3in", bottom: "0.3in", left: "0.3in", right: "0.3in" } });
  await browser.close();

  const pages = (fs.readFileSync(outPdf, "latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(`wrote ${outHtml}\nwrote ${outPdf} (${pages} pages)`);
  const show = (label, xs) => { console.log(`${label}: ${xs.length}`); xs.forEach(x => console.log("  " + x)); };
  show("katex errors", report.katex);
  show("missing images", report.images);
  show("overflowing elements", report.overflow);
  show("formulas auto-shrunk to fit (check they're still readable)", report.shrunk);
  console_.forEach(m => console.log("console: " + m));
})().catch(e => { console.error(e.message || e); process.exit(1); });
