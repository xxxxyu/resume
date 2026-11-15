// Keep this initializer self-contained so static review exports can use the same layout.
export function observeResumeMarginRefs(root) {
  if (!root) return () => {};
  let frame;
  let disposed = false;
  const gap = 6;

  function topWithin(element, ancestor) {
    let top = 0;
    for (let node = element; node && node !== ancestor; node = node.offsetParent) {
      top += node.offsetTop;
    }
    return top;
  }

  function layout() {
    if (disposed) return;
    for (const section of root.querySelectorAll(".resume-section")) {
      const label = section.querySelector(".section-label");
      let nextTop = topWithin(label, section) + label.offsetHeight + gap;
      const rails = section.querySelectorAll(".entry-margin-refs");
      for (const rail of rails) {
        const entry = rail.closest(".entry");
        const entryTop = topWithin(entry, section);
        const heading = entry.querySelector("h3");
        const headingLine = parseFloat(getComputedStyle(heading || entry).lineHeight) || 0;
        const linkLine = parseFloat(getComputedStyle(rail).lineHeight) || 0;
        const inset = Math.max(0, (headingLine - linkLine) / 2);
        const top = Math.max(entryTop + inset, nextTop);
        rail.style.setProperty("--margin-refs-offset", `${top - entryTop}px`);
        nextTop = top + rail.offsetHeight + gap;
      }
      // A short final entry must not leave its links over the next section's label.
      section.style.setProperty("--resume-rail-height", rails.length ? `${nextTop - gap}px` : "0px");
    }
  }

  function schedule() {
    if (disposed) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(layout);
  }

  layout();
  const observer = new ResizeObserver(schedule);
  root.querySelectorAll(".section-label, .entry, .entry-margin-refs").forEach((node) => observer.observe(node));
  document.fonts.ready.then(schedule);
  window.addEventListener("beforeprint", layout);
  window.addEventListener("afterprint", schedule);
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener("beforeprint", layout);
    window.removeEventListener("afterprint", schedule);
  };
}
