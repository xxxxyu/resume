import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import { observeResumeMarginRefs } from "../src/layout/resume-links.js";
import { waitForDocumentFonts } from "./lib/browser-fonts.mjs";
import { assertPageBounds, assertResumeLayout } from "./lib/browser-layout.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "output/review");
const contentDraft = process.argv.includes("--content-draft");
const checkSystemFontFallback = process.argv.includes("--system-font-fallback");
await mkdir(output, { recursive: true });

// Embedded previews do not necessarily have a file base URL or permission to read sibling files.
// Keep the same bundled fonts as the production site, but make these HTML files self-contained.
let css = await readFile(path.join(root, "src/styles/main.css"), "utf8");
const fontPaths = [...new Set([...css.matchAll(/url\("(\/fonts\/[^\"]+)"\)/g)].map((match) => match[1]))];
for (const fontPath of fontPaths) {
  const bytes = await readFile(path.join(root, "public", fontPath));
  css = css.replaceAll(`url("${fontPath}")`, `url("data:font/woff2;base64,${bytes.toString("base64")}")`);
}
css += `
  .draft-note { max-width: 210mm; margin: 0 auto 14px; padding: 0 14mm; color: #716d66; font-size: 13px; }
  @media print { .draft-note { display: none; } }
`;
if (contentDraft) css += `
  .page.resume-page { height: auto; min-height: 297mm; overflow: visible; }
  .resume-page::after { content: ''; position: absolute; top: 297mm; left: 0; right: 0; border-top: 1px dashed var(--red); pointer-events: none; }
  .resume-page .document-footer { position: static; margin-top: 5mm; }
`;

async function inspect(target, label, { checkPageBounds = true } = {}) {
  await waitForDocumentFonts(target);
  try {
    if (checkPageBounds) await assertPageBounds(target, label, { draft: contentDraft });
    return await assertResumeLayout(target, label);
  } catch (error) {
    const basename = `failure.${label.replaceAll("/", ".")}`;
    await target.locator(".resume-page").screenshot({ path: path.join(output, `${basename}.png`) });
    const blocks = await target.locator(".resume-header, .resume-section, .entry-head, .entry p, .entry li, h3").evaluateAll((elements) => elements.map((element) => ({
      selector: element.className || element.tagName,
      text: element.textContent,
      height: element.getBoundingClientRect().height,
      width: element.getBoundingClientRect().width,
      lineHeight: getComputedStyle(element).lineHeight,
      font: getComputedStyle(element).font,
      letterSpacing: getComputedStyle(element).letterSpacing
    })));
    const owner = typeof target.page === "function" ? target.page() : target;
    const session = await owner.context().newCDPSession(owner);
    await session.send("DOM.enable");
    await session.send("CSS.enable");
    const { root: documentRoot } = await session.send("DOM.getDocument");
    const { nodeIds } = await session.send("DOM.querySelectorAll", { nodeId: documentRoot.nodeId, selector: "h3" });
    for (const nodeId of nodeIds) {
      const { outerHTML } = await session.send("DOM.getOuterHTML", { nodeId });
      const { fonts } = await session.send("CSS.getPlatformFontsForNode", { nodeId });
      blocks.push({ html: outerHTML, fonts });
    }
    await session.detach();
    await writeFile(path.join(output, `${basename}.json`), JSON.stringify(blocks, null, 2));
    throw error;
  }
}

const server = await createServer({ root, server: { middlewareMode: true }, appType: "custom" });
let browser;
try {
  const { getDocumentData } = await server.ssrLoadModule("/src/data/index.js");
  const { ResumePage } = await server.ssrLoadModule("/src/documents/resume.jsx");
  browser = await chromium.launch({ headless: true });
  for (const locale of ["zh", "en"]) {
    const { resumeData } = getDocumentData(locale);
    const content = renderToStaticMarkup(React.createElement(ResumePage, { data: resumeData }));
    const note = contentDraft
      ? (locale === "zh" ? "内容审阅稿 · 虚线为 A4 页底" : "Content review · Dashed line marks A4")
      : (locale === "zh" ? "A4 审阅稿" : "A4 review");
    const html = `<!doctype html><html lang="${resumeData.profile.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${resumeData.profile.name} — ${note}</title><style>${css}</style></head><body><p class="draft-note">${note}</p><div class="preview-stage">${content}</div><script>(${observeResumeMarginRefs.toString()})(document.querySelector('.resume-page'));</script></body></html>`;
    const file = path.join(output, `resume.${locale}.html`);
    await writeFile(file, html);

    const page = await browser.newPage({ viewport: { width: 1100, height: 1400 }, deviceScaleFactor: 1.5 });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(pathToFileURL(file).href);
    const direct = await inspect(page, `${locale}/file`);
    await page.screenshot({ path: path.join(output, `resume.${locale}.png`), fullPage: true });
    await page.locator('[data-section="research"]').screenshot({ path: path.join(output, `research.${locale}.png`) });
    await page.locator('[data-section="open-source"]').screenshot({ path: path.join(output, `open-source.${locale}.png`) });
    await page.locator(".resume-header").screenshot({ path: path.join(output, `header.${locale}.png`) });
    const tailClip = await page.locator('.resume-page').evaluate((element) => {
      const first = element.querySelector('[data-section="industry"]').getBoundingClientRect();
      const last = element.querySelector('[data-section="honors"]').getBoundingClientRect();
      return { x: first.x, y: first.y - 4, width: first.width, height: last.bottom - first.y + 8 };
    });
    await page.screenshot({ path: path.join(output, `industry-honors.${locale}.png`), clip: tailClip });

    // Exercise an opaque-origin embedded preview, with all external requests blocked.
    await page.route("**/*", (route) => route.abort());
    await page.setContent('<iframe sandbox="allow-scripts" style="width:100%;height:2400px;border:0"></iframe>');
    await page.locator("iframe").evaluate((iframe, contents) => { iframe.srcdoc = contents; }, html);
    const embedded = page.frames().find((frame) => frame !== page.mainFrame());
    assert(embedded, "Embedded review frame was not created");
    await embedded.waitForSelector(".resume-page");
    const inline = await inspect(embedded, `${locale}/embedded`);
    assert.deepEqual(inline, direct, `${locale}: embedded and direct text layouts differ`);
    await embedded.locator('[data-section="research"]').screenshot({ path: path.join(output, `research.${locale}.embedded.png`) });
    // System fonts differ across operating systems. This opt-in diagnostic is useful
    // for debugging a local viewer, but is not a requirement for the embedded export.
    if (checkSystemFontFallback) {
      const fallbackStyle = await embedded.addStyleTag({
        content: ".entry p, .entry li, .entry li * { font-family: system-ui, sans-serif !important; }"
      });
      await inspect(embedded, `${locale}/system-font-fallback`, { checkPageBounds: false });
      await fallbackStyle.evaluate((element) => element.remove());
    }
    await page.emulateMedia({ media: 'print' });
    await inspect(embedded, `${locale}/print`);
    assert.deepEqual(errors, [], `${locale}: browser errors`);
    console.log(`${locale}: ${contentDraft ? 'content draft (A4 fit pending)' : 'A4 bounds pass'}; ${direct.length} compact content lines pass; file/embedded geometry matches`);
    await page.close();
  }
} finally {
  await browser?.close();
  await server.close();
}
