import React from "react";

export function RichText({ value }) {
  if (typeof value === "string") return value;
  if (value?.label) {
    return <><b>{value.label}</b><span className="label-divider"> / </span>{value.text}</>;
  }
  if (!value?.highlights?.length) return value?.text ?? null;
  const expression = new RegExp(`(${value.highlights.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  const highlighted = new Set(value.highlights);
  return value.text.split(expression).map((part, index) => highlighted.has(part)
    ? <strong key={`${part}-${index}`}>{part}</strong>
    : part
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

export function Entry({ entry }) {
  const hasHead = entry.title || entry.meta || entry.date;
  return (
    <article className={`entry ${hasHead ? "" : "entry-plain"} ${entry.kind ? `entry-${entry.kind}` : ""}`}>
      {hasHead && (
        <div className={`entry-head ${entry.date ? "" : "entry-head-full"}`}>
          <div className="entry-identity">
            <h3>{entry.title}</h3>
            {entry.role && <span className="entry-role">{entry.role}</span>}
            {entry.venue && <span className={`entry-venue ${entry.venue.toLowerCase() === "under review" ? "entry-venue-review" : ""}`}>{entry.venue}</span>}
            {entry.distinction && <span className="entry-distinction">{entry.distinction}</span>}
            {entry.meta && <span className="entry-meta">{entry.meta}</span>}
            {entry.kind === "publication" && <InlineRefs refs={entry.refs} />}
          </div>
          {entry.date && <time>{entry.date}</time>}
        </div>
      )}
      {entry.lines?.map((line, index) => <p key={index}><RichText value={line} /></p>)}
      {!entry.bullets && entry.kind !== "publication" && entry.refs?.length > 0 && <div className="entry-direct-refs"><InlineRefs refs={entry.refs} /></div>}
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
      {entry.bullets && entry.refs?.length > 0 && <div className="entry-direct-refs"><InlineRefs refs={entry.refs} /></div>}
    </article>
  );
}

export function PageShapes() {
  return <><div className="shape shape-left" /><div className="shape shape-red" /><div className="shape shape-bottom" /></>;
}

export function Contact({ profile }) {
  return (
    <address>
      <div>{profile.updated}</div>
      {profile.contact.map((item) => item.href
        ? <a key={item.label} href={item.href}>{item.label}</a>
        : <span key={item.label}>{item.label}</span>
      )}
    </address>
  );
}
