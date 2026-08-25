import React, { useLayoutEffect, useRef, useState } from "react";
import { InlineRefs, PageShapes } from "../components/common.jsx";

function Authors({ value }) {
  const parts = value.split(/(Xiangyu Li\*?|翔宇 李\*?)/g);
  return parts.map((part, index) => /^(Xiangyu Li|翔宇 李)/.test(part)
    ? <strong key={index}>{part}</strong>
    : part
  );
}

function PaperNotes({ value }) {
  const aePattern = /(Results (?:Reproduced|Replicated) @AE)/gi;
  return (
    <span className="paper-note">
      {value.split(aePattern).map((part, index) => /^Results (?:Reproduced|Replicated) @AE$/i.test(part)
        ? <span className="paper-note-ae" key={index}>{part}</span>
        : part
      )}
    </span>
  );
}

function PaperItem({ paper, number }) {
  const venue = String(paper.venue).includes(String(paper.year))
    ? paper.venue
    : `${paper.venue} · ${paper.year}`;
  return (
    <article className={`paper-item ${paper.featured ? "paper-featured" : ""}`} data-paper-id={paper.id}>
      <div className="paper-index">{String(number).padStart(2, "0")}</div>
      <div className="paper-content">
        <h2>{paper.title}</h2>
        <div className="paper-authors"><Authors value={paper.authors} /></div>
        <div className="paper-detail">
          <span className="paper-venue">{venue}</span>
          {paper.notes && <PaperNotes value={paper.notes} />}
          <InlineRefs refs={paper.links} />
        </div>
      </div>
    </article>
  );
}

function PaperGroup({ group }) {
  return (
    <div className="paper-group" data-paper-group={group.id}>
      <header className="paper-group-header">
        <h2>{group.label}</h2>
        <span>{group.english}</span>
      </header>
      <div className="paper-group-items">
        {group.papers.map((paper, index) => <PaperItem key={paper.id} paper={paper} number={group.startIndex + index + 1} />)}
      </div>
    </div>
  );
}

function PapersPage({ data, groups, pageNumber, pageCount, hasNextPage, groupGap }) {
  const { profile } = data;
  const ui = data.ui.papers;
  const scholarHref = profile.contact.find((item) => item.label === "Google Scholar")?.href;
  return (
    <main
      className="page papers-page"
      lang={profile.lang}
      data-document="papers"
      data-page={pageNumber}
      style={groupGap == null ? undefined : { "--paper-group-gap": `${groupGap}px` }}
    >
      <PageShapes />
      <header className="papers-header">
        <div>
          <div className="papers-kicker">{ui.kicker}</div>
          <h1>{ui.title}</h1>
          <p>
            {profile.name} <span>/</span> {profile.latinName}　·　{ui.totalPrefix}{data.total}{ui.totalSuffix}
            {data.citations?.total != null && <>　·　<a href={scholarHref}>{ui.citationLabel} {data.citations.total}</a></>}
            <>　·　{data.yearRange[0]}–{data.yearRange[1]}</>
          </p>
        </div>
        <div className="papers-source"><span>{profile.updated}</span></div>
      </header>
      <section className="paper-list" aria-label={ui.ariaLabel}>
        {groups.map((group) => <PaperGroup key={`${group.id}-${group.startIndex}`} group={group} />)}
      </section>
      <div className="paper-page-limit" aria-hidden="true" />
      {hasNextPage && (
        <div className="paper-continuation-cue">
          <span>{ui.continuationText}</span>
          <b aria-hidden="true">→</b>
        </div>
      )}
      <footer className="paper-footer">
        <span>{ui.footerLegend}</span>
        <span>{pageNumber} / {pageCount}</span>
      </footer>
    </main>
  );
}

function initialPaperPage(groups) {
  let startIndex = 0;
  return groups.map((group) => {
    const resolved = { ...group, startIndex };
    startIndex += group.papers.length;
    return resolved;
  });
}

function measuredPaperPages(data, measureRoot, availableHeight) {
  const measuredGroups = [...measureRoot.querySelectorAll(":scope > .paper-group")];
  const pages = [];
  let page = { groups: [], used: 0 };
  let globalIndex = 0;

  const startPage = () => {
    if (page.groups.length) pages.push(page.groups);
    page = { groups: [], used: 0 };
  };

  data.groups.forEach((group, groupIndex) => {
    const measuredGroup = measuredGroups[groupIndex];
    const headerHeight = measuredGroup.querySelector(".paper-group-header").getBoundingClientRect().height;
    const groupMargin = Number.parseFloat(getComputedStyle(measuredGroup).marginTop) || 0;
    const itemHeights = [...measuredGroup.querySelectorAll(".paper-item")]
      .map((item) => item.getBoundingClientRect().height);
    let segment = null;

    group.papers.forEach((paper, paperIndex) => {
      const itemHeight = itemHeights[paperIndex];
      const openingHeight = segment ? 0 : headerHeight + (page.groups.length ? groupMargin : 0);

      if (page.groups.length && page.used + openingHeight + itemHeight > availableHeight) {
        startPage();
        segment = null;
      }

      if (!segment) {
        segment = { ...group, papers: [], startIndex: globalIndex };
        page.groups.push(segment);
        page.used += headerHeight + (page.groups.length > 1 ? groupMargin : 0);
      }

      segment.papers.push(paper);
      page.used += itemHeight;
      globalIndex += 1;
    });
  });

  startPage();
  return pages;
}

function measuredPaperGroupGap(measureRoot) {
  const itemHeights = [...measureRoot.querySelectorAll(".paper-item")]
    .map((item) => item.getBoundingClientRect().height)
    .sort((left, right) => left - right);
  const middle = Math.floor(itemHeights.length / 2);
  const typicalItemHeight = itemHeights.length % 2
    ? itemHeights[middle]
    : (itemHeights[middle - 1] + itemHeights[middle]) / 2;
  const groupHeaders = [...measureRoot.querySelectorAll(".paper-group-header")];
  const groupHeaderHeight = (groupHeaders[1] || groupHeaders[0]).getBoundingClientRect().height;
  return Math.max(0, typicalItemHeight - groupHeaderHeight);
}

export function PapersPages({ data, pageOffset = 0, onPageCount }) {
  const measureRef = useRef(null);
  const [pages, setPages] = useState(() => [initialPaperPage(data.groups)]);
  const [groupGap, setGroupGap] = useState(null);

  useLayoutEffect(() => {
    let cancelled = false;

    const paginate = () => {
      const measureRoot = measureRef.current;
      const visiblePage = document.querySelector('[data-document="papers"]');
      if (!measureRoot || !visiblePage) return;
      const resolvedGroupGap = measuredPaperGroupGap(measureRoot);
      if (groupGap == null || Math.abs(resolvedGroupGap - groupGap) > 0.25) {
        if (!cancelled) setGroupGap(resolvedGroupGap);
        return;
      }
      const listTop = visiblePage.querySelector(".paper-list").getBoundingClientRect().top;
      const limitTop = visiblePage.querySelector(".paper-page-limit").getBoundingClientRect().top;
      const resolvedPages = measuredPaperPages(data, measureRoot, limitTop - listTop);
      if (!cancelled) setPages(resolvedPages);
    };

    paginate();
    document.fonts.ready.then(paginate);
    window.addEventListener("resize", paginate);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", paginate);
    };
  }, [data, groupGap]);

  useLayoutEffect(() => {
    onPageCount?.(pages.length);
  }, [onPageCount, pages.length]);

  return (
    <>
      {pages.map((groups, index) => (
        <PapersPage
          key={index}
          data={data}
          groups={groups}
          pageNumber={pageOffset + index + 1}
          pageCount={pageOffset + pages.length}
          hasNextPage={index < pages.length - 1}
          groupGap={groupGap}
        />
      ))}
      <div
        className="paper-measure"
        ref={measureRef}
        aria-hidden="true"
        style={groupGap == null ? undefined : { "--paper-group-gap": `${groupGap}px` }}
      >
        {initialPaperPage(data.groups).map((group) => <PaperGroup key={group.id} group={group} />)}
      </div>
    </>
  );
}
