import resumeZh from "../../content/zh/resume.json";
import resumeEn from "../../content/en/resume.json";
import homepage from "../generated/homepage.json";

const contentByLocale = { zh: resumeZh, en: resumeEn };
const linkLabels = {
  zh: { paper: "论文", code: "代码", page: "主页", blog: "解读", slides: "幻灯", models: "模型" },
  en: { paper: "Paper", code: "Code", page: "Project", blog: "Blog", slides: "Slides", models: "Models" }
};

const paperById = new Map(homepage.papers.map((paper) => [paper.id, paper]));

function localizedLink(link, locale) {
  return { ...link, label: linkLabels[locale]?.[link.kind] || link.label };
}

function githubRepositoryFromLink(link) {
  if (link.kind !== "code") return null;
  try {
    const url = new URL(link.href);
    if (url.hostname.toLowerCase() !== "github.com") return null;
    const [owner, repository] = url.pathname.split("/").filter(Boolean);
    return owner && repository ? `${owner}/${repository}` : null;
  } catch {
    return null;
  }
}

function withGithubStars(link, locale) {
  const repository = link.githubRepository || githubRepositoryFromLink(link);
  const stars = repository ? homepage.githubStars?.[repository] : null;
  if (!Number.isInteger(stars)) return link;
  const suffix = locale === "zh" ? `（${stars}★）` : ` (${stars}★)`;
  return { ...link, label: `${link.label}${suffix}` };
}

function resolvePapers(resume, locale) {
  return homepage.papers.map((paper) => {
    const override = resume.paperOverrides?.[paper.id] || {};
    const links = (override.links || paper.links).map((link) => localizedLink(link, locale));
    const resolved = { ...paper, ...override, links };
    return {
      ...resolved,
      category: override.category || (/preprint/i.test(resolved.venue) ? "preprint" : "publication")
    };
  });
}

function resolvePaperRefs(paperRefs = [], locale) {
  return paperRefs.flatMap((reference) => {
    const paper = paperById.get(reference.id);
    if (!paper) throw new Error(`Unknown paper id in resume content: ${reference.id}`);
    const include = new Set(reference.include || paper.links.map((link) => link.kind));
    return paper.links
      .filter((link) => include.has(link.kind))
      .map((link) => {
        const localized = localizedLink(link, locale);
        return withGithubStars({
          ...localized,
          label: reference.prefix ? `${reference.prefix} ${localized.label}` : localized.label
        }, locale);
      });
  });
}

function resolveInlineRefs(refs = [], locale) {
  return refs.map((reference) => {
    const resolved = withGithubStars(reference, locale);
    const { githubRepository, ...link } = resolved;
    return link;
  });
}

function resolveBullet(bullet, locale) {
  if (typeof bullet === "string") return bullet;
  const refs = bullet.refs
    ? resolveInlineRefs(bullet.refs, locale)
    : resolvePaperRefs(bullet.paperRefs, locale);
  const { paperRefs, ...resolved } = bullet;
  return { ...resolved, refs };
}

function resolveEntry(entry, locale) {
  return {
    ...entry,
    bullets: entry.bullets?.map((bullet) => resolveBullet(bullet, locale)),
    refs: entry.refs ? resolveInlineRefs(entry.refs, locale) : resolvePaperRefs(entry.paperRefs, locale)
  };
}

export function getDocumentData(locale = "zh") {
  const resolvedLocale = contentByLocale[locale] ? locale : "zh";
  const resume = contentByLocale[resolvedLocale];
  const papers = resolvePapers(resume, resolvedLocale);
  const resumeData = {
    ...resume,
    sections: resume.sections.map((section) => ({
      ...section,
      entries: section.entries?.map((entry) => resolveEntry(entry, resolvedLocale)),
      groups: section.groups?.map((group) => ({
        ...group,
        entries: group.entries.map((entry) => resolveEntry(entry, resolvedLocale))
      }))
    })),
    source: homepage.source
  };

  const paperListData = {
    profile: resume.profile,
    ui: resume.ui,
    groups: resume.paperGroups.map((group) => ({
      ...group,
      papers: papers
        .filter((paper) => paper.category === group.id)
        .sort((left, right) => right.year - left.year || left.order - right.order)
    })),
    source: homepage.source,
    citations: homepage.citations,
    total: papers.length,
    yearRange: [
      Math.min(...papers.map((paper) => paper.year)),
      Math.max(...papers.map((paper) => paper.year))
    ]
  };

  return { locale: resolvedLocale, resumeData, paperListData };
}
