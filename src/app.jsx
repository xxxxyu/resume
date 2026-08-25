import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { getDocumentData } from "./data/index.js";
import { PapersPages } from "./documents/publications.jsx";
import { ResumePage } from "./documents/resume.jsx";
import "./styles/main.css";

function routeFor({ locale, mode, palette }) {
  const params = new URLSearchParams({ locale });
  if (mode === "publications") params.set("document", "publications");
  else params.set("edition", mode);
  if (palette === "mono") params.set("palette", "mono");
  return `?${params.toString()}`;
}

function routeFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const legacyView = params.get("view");
  return {
    locale: params.get("locale") === "en" ? "en" : "zh",
    palette: params.get("palette") === "mono" ? "mono" : "color",
    mode: params.get("document") === "publications" || legacyView === "papers"
      ? "publications"
      : params.get("edition") === "one-page" || legacyView === "resume"
        ? "one-page"
        : "complete"
  };
}

function PreviewLink({ active, children, onNavigate, route }) {
  const handleClick = (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(route);
  };
  return (
    <a className={active ? "active" : ""} aria-current={active ? "page" : undefined} href={routeFor(route)} onClick={handleClick}>
      {children}
    </a>
  );
}

function PreviewToolbar({ onNavigate, route, ui }) {
  const { locale, mode, palette } = route;
  return (
    <nav className="preview-toolbar" aria-label={ui.ariaLabel}>
      <div className="preview-title"><strong>{ui.title}</strong><span>{ui.pageSize}</span></div>
      <div className="preview-controls">
        <div className="preview-tabs preview-locales" aria-label="Language">
          <PreviewLink active={locale === "zh"} onNavigate={onNavigate} route={{ ...route, locale: "zh" }}>中文</PreviewLink>
          <PreviewLink active={locale === "en"} onNavigate={onNavigate} route={{ ...route, locale: "en" }}>English</PreviewLink>
        </div>
        <div className="preview-tabs">
          {ui.tabs.map((tab) => (
            <PreviewLink key={tab.id} active={mode === tab.id} onNavigate={onNavigate} route={{ ...route, mode: tab.id }}>{tab.label}</PreviewLink>
          ))}
        </div>
        <div className="preview-tabs preview-palettes" aria-label={ui.palette.ariaLabel}>
          <PreviewLink active={palette === "color"} onNavigate={onNavigate} route={{ ...route, palette: "color" }}>{ui.palette.color}</PreviewLink>
          <PreviewLink active={palette === "mono"} onNavigate={onNavigate} route={{ ...route, palette: "mono" }}>{ui.palette.mono}</PreviewLink>
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

const initialRoute = routeFromLocation();
document.documentElement.dataset.palette = initialRoute.palette;

function App() {
  const [route, setRoute] = useState(initialRoute);
  const { locale, mode, palette } = route;
  const { resumeData, paperListData } = useMemo(() => getDocumentData(locale), [locale]);

  useLayoutEffect(() => {
    document.documentElement.lang = resumeData.profile.lang;
    document.documentElement.dataset.palette = palette;
    document.body.dataset.locale = locale;
    document.body.dataset.mode = mode;
    document.title = `${resumeData.profile.name} — Resume`;
  }, [locale, mode, palette, resumeData.profile.lang, resumeData.profile.name]);

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = routeFromLocation();
      document.documentElement.dataset.palette = nextRoute.palette;
      setRoute(nextRoute);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (nextRoute) => {
    const nextUrl = routeFor(nextRoute);
    if (window.location.search === nextUrl) return;
    document.documentElement.dataset.palette = nextRoute.palette;
    window.history.pushState(null, "", nextUrl);
    setRoute(nextRoute);
  };

  const documentView = mode === "publications"
    ? <div className="page-stack"><PapersPages data={paperListData} /></div>
    : mode === "complete"
      ? <CompleteDocument resumeData={resumeData} paperListData={paperListData} />
      : <ResumePage data={resumeData} />;

  return (
    <div className="preview-stage">
      <PreviewNotice notice={resumeData.ui.preview.notice} />
      <PreviewToolbar onNavigate={navigate} route={route} ui={resumeData.ui.preview} />
      {documentView}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
