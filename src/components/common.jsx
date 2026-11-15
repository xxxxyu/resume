import React from "react";

function HighlightedText({ text, highlights = [], accents = [], className = "text-highlight" }) {
  const phrases = [...new Set([...highlights, ...accents])].filter(Boolean).sort((a, b) => b.length - a.length);
  if (!phrases.length) return text ?? null;
  const expression = new RegExp(`(${phrases.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  const highlighted = new Set(phrases);
  const accented = new Set(accents);
  return text.split(expression).map((part, index) => highlighted.has(part)
    ? <strong className={accented.has(part) ? "text-accent" : className} key={`${part}-${index}`}>{part}</strong>
    : part
  );
}

export function RichText({ value }) {
  if (typeof value === "string") return value;
  if (!value) return null;
  return (
    <>
      {value.title && <span className="text-title">{value.title}</span>}
      {value.meta && <span className="text-meta"><HighlightedText text={value.meta} highlights={value.distinctions} className="text-distinction" /></span>}
      <HighlightedText text={value.text} highlights={value.highlights} accents={value.accents} />
    </>
  );
}

export function InlineRefs({ refs }) {
  if (!refs?.length) return null;
  return (
    <span className="refs">
      {refs.map((reference, index) => (
        <React.Fragment key={`${reference.href}-${reference.label}`}>
          {index > 0 && <span className="ref-separator">/</span>}
          <a href={reference.href}>{reference.label}</a>
        </React.Fragment>
      ))}
    </span>
  );
}

function MarginRefs({ refs, title }) {
  if (!refs?.length) return null;
  const projectPages = refs.filter((reference) => reference.kind === "page");
  const links = projectPages.length ? projectPages : refs;
  return (
    <div className="entry-margin-refs">
      {links.map((reference) => (
        <a key={`${reference.href}-${reference.label}`} href={reference.href} aria-label={`${title} — ${reference.label}`}>
          <span>{reference.label}</span><span className="margin-link-arrow" aria-hidden="true">↗</span>
        </a>
      ))}
    </div>
  );
}

export function Entry({ entry, marginRefs = false }) {
  const hasHead = entry.title || entry.meta || entry.date;
  const showMarginRefs = marginRefs && entry.refs?.length > 0;
  return (
    <article className={hasHead ? "entry" : "entry entry-plain"}>
      {showMarginRefs && <MarginRefs refs={entry.refs} title={entry.title || entry.meta || "Links"} />}
      {hasHead && (
        <div className={`entry-head ${entry.date ? "" : "entry-head-full"}`}>
          <div className="entry-identity">
            <h3>{entry.title}</h3>
            {entry.engagement && <span className="entry-engagement">{entry.engagement}</span>}
            {entry.role && <span className="entry-role"><RichText value={entry.role} /></span>}
            {entry.venue && <span className="entry-venue">{entry.venue}</span>}
            {entry.meta && <span className="entry-meta">{entry.meta}</span>}
            {entry.recognition && <span className="entry-recognition">{entry.recognition}</span>}
          </div>
          {entry.date && <time>{entry.date}</time>}
        </div>
      )}
      {entry.lines?.map((line, index) => <p key={index}><RichText value={line} /></p>)}
      {entry.bullets && (
        <ul>
          {entry.bullets.map((bullet, index) => (
            <li key={index}>
              <RichText value={bullet} />
              {bullet?.refs && <InlineRefs refs={bullet.refs} />}
            </li>
          ))}
        </ul>
      )}
      {!showMarginRefs && entry.refs?.length > 0 && <div className="entry-direct-refs"><InlineRefs refs={entry.refs} /></div>}
    </article>
  );
}

export function PageShapes() {
  return <><div className="shape shape-left" /><div className="shape shape-red" /><div className="shape shape-bottom" /></>;
}

export function Contact({ profile }) {
  return (
    <address>
      {profile.contact.map((item) => item.href
        ? <a key={item.label} href={item.href}>{item.label}</a>
        : <span key={item.label}>{item.label}</span>
      )}
    </address>
  );
}
