import assert from "node:assert/strict";

// These checks run against both the live app and the self-contained HTML export.
export async function assertPageBounds(target, label, { draft = false } = {}) {
  const metrics = await target.locator(".page").evaluateAll((pages) => pages.map((page) => {
    const box = page.getBoundingClientRect();
    const sections = page.querySelectorAll(".resume-section");
    const content = sections.length ? sections[sections.length - 1] : page.querySelector(".paper-list");
    const footer = page.querySelector(".document-footer, .paper-footer").getBoundingClientRect();
    const paperLimit = page.querySelector(".paper-page-limit");
    return {
      width: box.width,
      height: box.height,
      contentBottom: content.getBoundingClientRect().bottom - box.top,
      contentLimit: (paperLimit ? paperLimit.getBoundingClientRect().top : footer.top - 6) - box.top,
      footerBottom: footer.bottom - box.top
    };
  }));
  assert(metrics.length, `${label}: no document pages`);
  for (const [index, metric] of metrics.entries()) {
    const pageLabel = `${label} page ${index + 1}`;
    assert(Math.abs(metric.width - 210 * 96 / 25.4) < 1, `${pageLabel}: width is not A4`);
    if (!draft) assert(Math.abs(metric.height - 297 * 96 / 25.4) < 1, `${pageLabel}: height is not A4`);
    assert(metric.contentBottom <= metric.contentLimit + 0.5, `${pageLabel}: content enters reserved footer space (${JSON.stringify(metric)})`);
    assert(metric.footerBottom <= metric.height, `${pageLabel}: footer falls outside the page`);
  }
  return metrics;
}

export async function assertResumeLayout(target, label) {
  const selector = [
    '[data-section="research"] .research-group:not([data-emphasis="supporting"]) .entry li',
    '[data-section="industry"] li',
    '[data-section="honors"] li'
  ].join(", ");
  const lines = await target.locator(selector).evaluateAll((items) => items.map((item) => {
    const range = document.createRange();
    range.selectNodeContents(item);
    const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
    const style = getComputedStyle(item);
    const rows = [];
    for (const rect of rects) {
      if (!rows.some((top) => Math.abs(rect.top - top) < parseFloat(style.lineHeight) / 2)) rows.push(rect.top);
    }
    return {
      text: item.textContent,
      rows: rows.length,
      width: Math.max(...rects.map((rect) => rect.right)) - Math.min(...rects.map((rect) => rect.left)),
      available: item.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    };
  }));
  const wrapped = lines.filter((line) => line.rows !== 1 || line.width > line.available + 1);
  assert.deepEqual(wrapped, [], `${label}: compact resume lines wrap`);

  const overlaps = await target.locator(".resume-section").evaluateAll((sections) => sections.flatMap((section) => {
    let bottom = section.querySelector(".section-label").getBoundingClientRect().bottom;
    const errors = [];
    for (const rail of section.querySelectorAll(".entry-margin-refs")) {
      const box = rail.getBoundingClientRect();
      if (box.top < bottom - 1) errors.push(rail.textContent);
      bottom = box.bottom;
    }
    return errors;
  }));
  assert.deepEqual(overlaps, [], `${label}: overlapping margin links`);
  return lines;
}
