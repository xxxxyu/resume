import { chromium } from "playwright";

export function launchDocumentBrowser() {
  // Headless Linux defaults to full hinting and rounds glyph advances to pixels.
  // Keep fractional text metrics so A4 line breaks match the macOS review.
  return chromium.launch({ headless: true, args: ["--font-render-hinting=none"] });
}

export async function waitForDocumentFonts(page) {
  await page.evaluate(async () => {
    const samples = [
      ["Source Sans 3", "W4A16 GPU-hours"],
      ["Source Serif 4", "Research"],
      ["Noto Sans SC Resume", "研究经历"],
      ["Noto Serif SC Resume", "李翔宇"]
    ];
    // fonts.ready also resolves after failed loads; explicitly load and verify each face.
    await Promise.all(samples.map(([family, text]) => document.fonts.load(`400 12px "${family}"`, text)));
    await document.fonts.ready;
    const faces = [...document.fonts];
    for (const [family] of samples) {
      if (!faces.some((face) => face.family.replaceAll('"', "") === family && face.status === "loaded")) {
        throw new Error(`Required font did not load: ${family}`);
      }
    }
    for (let frame = 0; frame < 3; frame += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  });
}
