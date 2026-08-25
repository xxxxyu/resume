import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { getDocumentData } from "./data/index.js";
import { PapersPages } from "./documents/publications.jsx";
import { ResumePage } from "./documents/resume.jsx";
import "./styles/main.css";

function routeFor(locale, mode) {
  const params = new URLSearchParams({ locale });
  if (mode === "publications") params.set("document", "publications");
  else params.set("edition", mode);
  return `?${params.toString()}`;
}

function PreviewToolbar({ locale, mode, ui }) {
  return (
    <nav className="preview-toolbar" aria-label={ui.ariaLabel}>
      <div className="preview-title"><strong>{ui.title}</strong><span>{ui.pageSize}</span></div>
      <div className="preview-controls">
        <div className="preview-tabs preview-locales" aria-label="Language">
          <a className={locale === "zh" ? "active" : ""} aria-current={locale === "zh" ? "page" : undefined} href={routeFor("zh", mode)}>中文</a>
          <a className={locale === "en" ? "active" : ""} aria-current={locale === "en" ? "page" : undefined} href={routeFor("en", mode)}>English</a>
        </div>
        <div className="preview-tabs">
          {ui.tabs.map((tab) => (
            <a key={tab.id} className={mode === tab.id ? "active" : ""} aria-current={mode === tab.id ? "page" : undefined} href={routeFor(locale, tab.id)}>{tab.label}</a>
          ))}
        </div>
      </div>
      <button type="button" onClick={() => window.print()}>{ui.print}</button>
    </nav>
  );
}

function PreviewNotice({ notice }) {
  return (
    <aside className="preview-notice" aria-label={notice.ariaLabel}>
      {notice.items.map((item) => (
        <p key={item.label}>
          <strong>{item.label}</strong>
          <span>
            {item.segments.map((segment, index) => typeof segment === "string"
              ? <React.Fragment key={index}>{segment}</React.Fragment>
              : <a key={index} href={segment.href}>{segment.label}</a>
            )}
          </span>
        </p>
      ))}
    </aside>
  );
}

function CompleteDocument({ resumeData, paperListData }) {
  const [paperPageCount, setPaperPageCount] = useState(2);
  const pageCount = paperPageCount + 1;
  return (
    <div className="page-stack">
      <ResumePage data={resumeData} pageCount={pageCount} showContinuation />
      <PapersPages data={paperListData} pageOffset={1} onPageCount={setPaperPageCount} />
    </div>
  );
}

const a4ScreenWidth = 210 * 96 / 25.4;
const previewGutter = 24;

function updatePreviewScale() {
  const viewportWidth = document.documentElement.clientWidth;
  const scale = Math.min(1, Math.max(0.1, (viewportWidth - previewGutter) / a4ScreenWidth));
  document.documentElement.style.setProperty("--preview-scale", scale.toFixed(4));
}

updatePreviewScale();
window.addEventListener("resize", updatePreviewScale, { passive: true });

const params = new URLSearchParams(window.location.search);
const legacyView = params.get("view");
const locale = params.get("locale") === "en" ? "en" : "zh";
const mode = params.get("document") === "publications" || legacyView === "papers"
  ? "publications"
  : params.get("edition") === "one-page" || legacyView === "resume"
    ? "one-page"
    : "complete";
const { resumeData, paperListData } = getDocumentData(locale);

document.documentElement.lang = resumeData.profile.lang;
document.body.dataset.locale = locale;
document.body.dataset.mode = mode;
document.title = `${resumeData.profile.name} — Resume`;

const documentView = mode === "publications"
  ? <div className="page-stack"><PapersPages data={paperListData} /></div>
  : mode === "complete"
    ? <CompleteDocument resumeData={resumeData} paperListData={paperListData} />
    : <ResumePage data={resumeData} />;

createRoot(document.getElementById("root")).render(
  <div className="preview-stage">
    <PreviewNotice notice={resumeData.ui.preview.notice} />
    <PreviewToolbar locale={locale} mode={mode} ui={resumeData.ui.preview} />
    {documentView}
  </div>
);
