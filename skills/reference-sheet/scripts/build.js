#!/usr/bin/env node
// Assemble a reference sheet version and print it to PDF, then report layout problems.
// Usage: node build.js <version-dir> <out-name> [--only KEY[,KEY…]]
//   Reads <version-dir>/src/template.html and <version-dir>/src/sections/*.html (in filename order),
//   writes <version-dir>/<out-name>.html and <version-dir>/<out-name>.pdf.
//   --only KEY: build just the section(s) with id="m-KEY", in the same layout (a cheap per-section preview;
//   the section starts at the top of page 1, so its page breaks differ from the full sheet).
//   Reports where each section lands (pages and length in printed columns; needs pdftotext from poppler-utils).
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
  const args = process.argv.slice(2), oi = args.indexOf("--only");
  const only = oi >= 0 ? (args.splice(oi, 2)[1] || "").split(",").filter(Boolean) : null;
  const [verDir, name] = args;
  if (!verDir || !name || (only && !only.length)) {
    console.error("usage: node build.js <version-dir> <out-name> [--only KEY[,KEY…]]"); process.exit(2);
  }
  const src = path.join(verDir, "src");
  let secList = fs.readdirSync(path.join(src, "sections")).filter(f => f.endsWith(".html")).sort()
    .map(f => fs.readFileSync(path.join(src, "sections", f), "utf8"));
  if (only) {
    secList = secList.filter(h => only.some(k => new RegExp(`id=["']m-${k}["']`).test(h)));
    if (!secList.length) { console.error(`no section with id m-${only.join(", m-")}`); process.exit(2); }
  }
  const secs = secList.join("\n");
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
    const sheet = document.querySelector(".sheet"), cs = getComputedStyle(sheet);
    const cols = parseInt(cs.columnCount) || 1, gap = parseFloat(cs.columnGap) || 0;
    const colW = (sheet.clientWidth - gap * (cols - 1)) / cols;
    // An element split across a column break has several fragments; its scroll/offset widths are then
    // meaningless, so judge each fragment against the column width instead.
    const overflows = e => {
      const rects = e.getClientRects();
      if (rects.length > 1) return [...rects].some(r => r.width > colW + 1);
      return e.scrollWidth > e.clientWidth + 2 || e.offsetWidth > e.parentElement.clientWidth + 1;
    };
    return {
      cols,
      sections: [...document.querySelectorAll("section.mod")].map(s => ({
        id: s.id, title: ((s.querySelector("h2") || {}).textContent || "").replace(/\s+/g, " ").trim() })),
      katex: [...document.querySelectorAll(".katex-error")].map(e => where(e) + " :: " + (e.getAttribute("title") || e.textContent)),
      shrunk: [...document.querySelectorAll(".formula[data-shrunk]")].map(e => where(e) + " :: " + snip(e)),
      overflow: [...document.querySelectorAll(".formula, table.tbl, pre, .ex, .tip, p, li, figure")]
        .filter(overflows)
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
  sectionLayout(outPdf, report.sections, report.cols).forEach(l => console.log(l));
  console_.forEach(m => console.log("console: " + m));
})().catch(e => { console.error(e.message || e); process.exit(1); });

// Find each section's <h2> title in the PDF (pdftotext -bbox), then report its pages and length in printed
// columns. Position of a point = (page-1)*cols + column + fraction down the column; a section's length is the
// next section's start position minus its own. On the last page Chrome balances the columns, so there each
// column holds only the balanced height (the lowest text on that page), not a full column.
function sectionLayout(pdf, sections, cols) {
  let xml;
  try { xml = execSync(`pdftotext -bbox "${pdf}" -`, { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 28 }).toString(); }
  catch { return ["section layout: skipped (pdftotext not found; install poppler-utils)"]; }
  const dec = t => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  const words = []; let pg = 0, W = 612, H = 792;
  for (const m of xml.matchAll(/<page width="([\d.]+)" height="([\d.]+)">|<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)) {
    if (m[1]) { pg++; W = +m[1]; H = +m[2]; continue; }
    words.push({ pg, W, H, x: +m[3], y0: +m[4], y1: +m[6], t: dec(m[7]) });
  }
  if (!words.length) return [];
  const M = 0.3 * 72; // page margin in pt (matches the PDF margin above)
  const colOf = w => Math.min(cols - 1, Math.max(0, Math.floor((w.x - M) / ((w.W - 2 * M) / cols))));
  const frac = (w, y) => Math.min(1, Math.max(0, (y - M) / (w.H - 2 * M)));
  const lastPg = Math.max(...words.map(w => w.pg));
  const lastWords = words.filter(w => w.pg === lastPg);
  const balH = Math.max(...lastWords.map(w => frac(w, w.y1)));   // balanced column height on the last page
  const pos = (w, y) => (w.pg - 1) * cols + (w.pg === lastPg ? colOf(w) * balH : colOf(w)) + frac(w, y);
  const lastCol = Math.max(...lastWords.map(colOf));
  const endPos = (lastPg - 1) * cols + lastCol * balH + Math.max(...lastWords.filter(w => colOf(w) === lastCol).map(w => frac(w, w.y1)));
  // Start of each section: the occurrence of its title words set in the largest type (the <h2>).
  const starts = sections.map(s => {
    const tw = s.title.split(/\s+/).filter(Boolean);
    let best = null;
    for (let i = 0; tw.length && i + tw.length <= words.length; i++) {
      if (tw.every((t, j) => words[i + j].t === t) && (!best || words[i].y1 - words[i].y0 > best.y1 - best.y0 + 0.5)) best = words[i];
    }
    return best;
  });
  const out = ["section layout (pages, length in printed columns):"];
  sections.forEach((s, k) => {
    const w = starts[k];
    if (!w) { out.push(`  ${s.id}: title not found in PDF`); return; }
    const nxt = starts.slice(k + 1).find(Boolean);
    const len = (nxt ? pos(nxt, nxt.y0) : endPos) - pos(w, w.y0), endPg = nxt ? nxt.pg : lastPg;
    out.push(`  ${s.id}: page${w.pg === endPg ? " " + w.pg : `s ${w.pg}-${endPg}`}, ~${len.toFixed(1)} columns`);
  });
  return out;
}
