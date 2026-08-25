import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const port = 4174;
const configuredBasePath = process.env.RESUME_BASE_PATH || "/";
const basePath = `${configuredBasePath.startsWith("/") ? "" : "/"}${configuredBasePath}${configuredBasePath.endsWith("/") ? "" : "/"}`;
const baseUrl = `http://127.0.0.1:${port}${basePath}`;
const locales = ["zh", "en"];
const documentKinds = [
  {
    id: "one-page",
    query: (locale) => `?locale=${locale}&edition=one-page`,
    pdf: "resume.one-page.pdf",
    preview: "resume.one-page.png"
  },
  {
    id: "publications",
    query: (locale) => `?locale=${locale}&document=publications`,
    pdf: "publications.pdf",
    preview: "publications.png"
  },
  {
    id: "complete",
    query: (locale) => `?locale=${locale}&edition=complete`,
    pdf: "resume.complete.pdf",
    preview: "resume.complete.png"
  }
];
const artifacts = locales.flatMap((locale) => documentKinds.map((document) => ({ locale, ...document })));

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The preview server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Vite preview did not start in time");
}

for (const locale of locales) await mkdir(`output/${locale}/preview`, { recursive: true });

const server = spawn(process.execPath, [
  "node_modules/vite/bin/vite.js",
  "preview",
  "--host", "127.0.0.1",
  "--port", String(port)
], {
  stdio: ["ignore", "inherit", "inherit"]
});

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
  const publicationPageCounts = new Map();

  for (const artifact of artifacts) {
    const page = await context.newPage();
    await page.goto(`${baseUrl}${artifact.query(artifact.locale)}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(50);

    const metrics = await page.locator(".page").evaluateAll((pages) => pages.map((element) => {
      const box = element.getBoundingClientRect();
      const contents = [...element.querySelectorAll(":scope > *:not(.shape)")];
      return {
        width: box.width,
        height: box.height,
        maxBottom: Math.max(...contents.map((child) => child.getBoundingClientRect().bottom - box.top))
      };
    }));

    const label = `${artifact.locale}/${artifact.id}`;
    if (artifact.id === "one-page" && metrics.length !== 1) {
      throw new Error(`${label}: expected 1 page node, found ${metrics.length}`);
    }
    if (artifact.id === "publications") {
      if (metrics.length < 1) throw new Error(`${label}: no publication pages were rendered`);
      publicationPageCounts.set(artifact.locale, metrics.length);
    }
    if (artifact.id === "complete") {
      const publicationPages = publicationPageCounts.get(artifact.locale);
      const expectedPages = publicationPages == null ? null : publicationPages + 1;
      if (expectedPages == null || metrics.length !== expectedPages) {
        throw new Error(`${label}: expected ${expectedPages ?? "a measured page count"}, found ${metrics.length}`);
      }
    }
    metrics.forEach((metric, index) => {
      if (metric.height > 1123.5 || metric.width > 794.5) {
        throw new Error(`${label} page ${index + 1}: A4 overflow (${JSON.stringify(metric)})`);
      }
      if (metric.maxBottom > 1105) {
        throw new Error(`${label} page ${index + 1}: content enters bottom safety margin (${metric.maxBottom}px)`);
      }
    });

    await page.screenshot({ path: `output/${artifact.locale}/preview/${artifact.preview}`, fullPage: true });
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: `output/${artifact.locale}/${artifact.pdf}`,
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      preferCSSPageSize: true
    });
    await page.close();
  }

  await context.close();
  await browser.close();
} finally {
  if (server.exitCode == null && server.signalCode == null) {
    server.kill("SIGTERM");
    await Promise.race([
      once(server, "exit"),
      new Promise((resolve) => setTimeout(resolve, 3000))
    ]);
    if (server.exitCode == null && server.signalCode == null) {
      server.kill("SIGKILL");
      await once(server, "exit");
    }
  }
}
