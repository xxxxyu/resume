import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const sourcePdfs = [
  path.join(root, "output/zh/resume.one-page.pdf"),
  path.join(root, "output/en/resume.one-page.pdf")
];
const target = path.join(root, "docs/assets/resume-preview.png");
const tempRoot = path.join(root, "tmp");

function rasterize(pdfPath, outputBase) {
  const result = spawnSync("pdftoppm", [
    "-f", "1",
    "-l", "1",
    "-singlefile",
    "-png",
    "-r", "144",
    pdfPath,
    outputBase
  ], { encoding: "utf8" });

  if (result.error?.code === "ENOENT") {
    throw new Error("pdftoppm is required. Install Poppler, then run this command again.");
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || `pdftoppm exited with status ${result.status}`);
  }
}

for (const pdfPath of sourcePdfs) {
  try {
    await stat(pdfPath);
  } catch {
    throw new Error(`Missing ${path.relative(root, pdfPath)}. Run npm run render:cached first.`);
  }
}

await mkdir(tempRoot, { recursive: true });
await mkdir(path.dirname(target), { recursive: true });
const workDir = await mkdtemp(path.join(tempRoot, "readme-preview-"));

try {
  const rasterPaths = sourcePdfs.map((_, index) => path.join(workDir, `page-${index + 1}.png`));
  sourcePdfs.forEach((pdfPath, index) => rasterize(pdfPath, rasterPaths[index].replace(/\.png$/, "")));

  const images = await Promise.all(rasterPaths.map(async (imagePath) => {
    const encoded = (await readFile(imagePath)).toString("base64");
    return `data:image/png;base64,${encoded}`;
  }));

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; background: #e9e7e2; }
      .preview {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 56px;
        width: 1920px;
        padding: 72px 112px;
        background: #e9e7e2;
      }
      img {
        display: block;
        width: 100%;
        height: auto;
        background: #fffefa;
        outline: 1px solid #aaa59b;
        box-shadow: 0 1px 12px rgb(41 40 37 / 12%);
      }
    </style>
  </head>
  <body>
    <main class="preview">
      <img src="${images[0]}" alt="Chinese resume first page">
      <img src="${images[1]}" alt="English resume first page">
    </main>
  </body>
</html>`;
  const htmlPath = path.join(workDir, "preview.html");
  await writeFile(htmlPath, html, "utf8");

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1400 }, deviceScaleFactor: 1 });
    await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
    await page.locator(".preview").screenshot({ path: target });
  } finally {
    await browser.close();
  }

  console.log(`Wrote ${path.relative(root, target)}`);
} finally {
  await rm(workDir, { recursive: true, force: true });
}
