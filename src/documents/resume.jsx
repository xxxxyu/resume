import React from "react";
import { Contact, Entry, PageShapes } from "../components/common.jsx";

function ResearchGroup({ group }) {
  return (
    <div className="research-group">
      <header className="research-group-head">
        <div className="research-group-title">
          <h3>{group.title}</h3>
          {group.english && <span>{group.english}</span>}
        </div>
        <time>{group.period}</time>
      </header>
      <div className="research-group-entries">
        {group.entries.map((entry, index) => <Entry key={index} entry={entry} />)}
      </div>
    </div>
  );
}

function ResumeSection({ section }) {
  return (
    <section className="resume-section">
      <header className="section-label">
        <span className="section-index">{section.index}</span>
        <h2>{section.label}</h2>
        <span className="section-english">{section.english}</span>
      </header>
      <div className="section-content">
        {section.groups
          ? section.groups.map((group) => <ResearchGroup key={group.title} group={group} />)
          : section.entries.map((entry, index) => <Entry key={index} entry={entry} />)}
      </div>
    </section>
  );
}

export function ResumePage({ data, pageNumber = 1, pageCount = 1, showContinuation = false }) {
  const { profile } = data;
  return (
    <main className="page resume-page" lang={profile.lang} data-document="resume">
      <PageShapes />
      <header className="resume-header">
        <div className="name-block">
          <h1>{profile.name}</h1>
          <div className="latin-name">{profile.latinName}</div>
          <div className="affiliation">{profile.affiliation}</div>
          <div className="fields">{profile.fields}</div>
        </div>
        <Contact profile={profile} />
      </header>
      {data.sections.map((section) => <ResumeSection key={section.index} section={section} />)}
      {showContinuation && (
        <div className="paper-continuation-cue document-continuation-cue">
          <span>{data.ui.resume.footer}</span>
          <b aria-hidden="true">→</b>
        </div>
      )}
      <footer className="document-footer"><span>{pageNumber} / {pageCount}</span></footer>
    </main>
  );
}
