import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { preview } from "vite";
import { launchDocumentBrowser, waitForDocumentFonts } from "./lib/browser-fonts.mjs";
import { assertPageBounds, assertResumeLayout } from "./lib/browser-layout.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const locales = ["zh", "en"];
const documents = [
  { id: "one-page", query: "edition=one-page", basename: "resume.one-page" },
  { id: "publications", query: "document=publications", basename: "publications" },
  { id: "complete", query: "edition=complete", basename: "resume.complete" }
];
const server = await preview({ root, preview: { host: "127.0.0.1", port: 4174, strictPort: true } });
let browser;
try {
  const baseUrl = server.resolvedUrls.local[0];
  browser = await launchDocumentBrowser();
  // Use desktop geometry for validation; narrow screen previews are scaled by the app.
  const context = await browser.newContext({ viewport: { width: 1100, height: 1400 }, deviceScaleFactor: 2 });
  for (const locale of locales) {
    const output = path.join(root, "output", locale);
    await mkdir(path.join(output, "preview"), { recursive: true });
    let publicationPageCount;
    for (const document of documents) {
      const label = `${locale}/${document.id}`;
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${baseUrl}?locale=${locale}&${document.query}`, { waitUntil: "networkidle" });
      await waitForDocumentFonts(page);
      const metrics = await assertPageBounds(page, label);
      await assertResumeLayout(page, label);
      if (document.id === "one-page") assert.equal(metrics.length, 1, `${label}: expected one page`);
      if (document.id === "publications") publicationPageCount = metrics.length;
      if (document.id === "complete") assert.equal(metrics.length, publicationPageCount + 1, `${label}: incomplete publication list`);
      // A display-label edit must not silently detach the Scholar link again.
      assert.equal(await page.locator('.papers-header a:not([href]), .papers-header a[href=""]').count(), 0, `${label}: missing citation link`);

      await page.screenshot({ path: path.join(output, "preview", `${document.basename}.png`), fullPage: true });
      await page.emulateMedia({ media: "print" });
      await waitForDocumentFonts(page);
      const printMetrics = await assertPageBounds(page, `${label}/print`);
      await assertResumeLayout(page, `${label}/print`);
      assert.equal(printMetrics.length, metrics.length, `${label}: page count changed in print`);
      assert.deepEqual(errors, [], `${label}: browser errors`);
      await page.pdf({
        path: path.join(output, `${document.basename}.pdf`),
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
        preferCSSPageSize: true
      });
      await page.close();
      console.log(`${label}: ${metrics.length} A4 page(s), screen and print checks passed`);
    }
  }
} finally {
  await browser?.close();
  await server.close();
}
