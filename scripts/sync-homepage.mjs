import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(path.join(projectRoot, "resume.config.json"), "utf8"));
const configuredRepo = process.env.HOMEPAGE_REPO || config.homepageRepo;
const homepageRepo = path.resolve(projectRoot, configuredRepo);
const homepageUrl = "https://xxxxyu.github.io";
const outputPath = path.join(projectRoot, "src/generated/homepage.json");

function git(...args) {
  return execFileSync("git", args, { cwd: homepageRepo, encoding: "utf8" }).trim();
}

function plainText(markdown) {
  return markdown
    .replace(/<[^>]+>/g, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/^>\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function paperId(title) {
  const prefix = title.split(":", 1)[0].trim();
  const aliases = new Map([
    ["Replicate What Varies", "patchwork"],
    ["Zetta ζ", "zetta"],
    ["Embodied.cpp", "embodied-cpp"],
    ["DWI", "dwi"],
    ["Building Efficient Inference Systems for Resource-Constrained Edge AI Deployment", "rising-stars"],
    ["ActProbe", "actprobe"],
    ["EmbodiSkill", "embodiskill"],
    ["OxyGen", "oxygen"],
    ["Vec-LUT", "vec-lut"],
    ["An Empirical Study of LLM Reasoning Ability Under Strict Output Length Constraint", "length-constrained-reasoning"],
    ["Squeezer", "squeezer"],
    ["ChainStream", "chainstream"],
    ["FlexNN", "flexnn"],
    ["Personal LLM Agents", "personal-llm-agents"],
    ["DIMMining", "dimmining"]
  ]);
  if (aliases.has(prefix)) return aliases.get(prefix);
  return prefix.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeLinks(paper) {
  const labels = {
    paper_url: ["paper", "论文"],
    code_url: ["code", "代码"],
    page_url: ["page", "主页"],
    blog_url: ["blog", "解读"],
    slides_url: ["slides", "幻灯"],
    model_url: ["models", "模型"]
  };
  const canonicalLinks = Object.entries(labels).flatMap(([key, [kind, label]]) =>
    paper[key] ? [{
      kind,
      label,
      href: paper[key].startsWith("/") ? new URL(paper[key], homepageUrl).href : paper[key]
    }] : []
  );
  const pressLinks = (paper.press_links || []).flatMap(({ label, url }) =>
    label && url ? [{
      kind: "press",
      label,
      href: url.startsWith("/") ? new URL(url, homepageUrl).href : url
    }] : []
  );
  return [...canonicalLinks, ...pressLinks];
}

function normalizeNotes(notes = "") {
  return plainText(notes).replace(/\s+,/g, ",");
}

const sourcePaths = Object.fromEntries(
  Object.entries(config.sources).map(([key, value]) => [key, path.join(homepageRepo, value)])
);

const papersToml = parse(await readFile(sourcePaths.papers, "utf8"));
const scholarStats = JSON.parse(await readFile(sourcePaths.citations, "utf8"));
const citationTotal = scholarStats.total;
if (!Number.isSafeInteger(citationTotal) || citationTotal < 0) {
  throw new Error(`Invalid citation total in ${sourcePaths.citations}`);
}
const snapshot = {
  source: {
    repository: "https://github.com/xxxxyu/xxxxyu.github.io",
    commit: git("rev-parse", "HEAD"),
    commitDate: git("show", "-s", "--format=%cI", "HEAD"),
    branch: git("branch", "--show-current"),
    files: config.sources
  },
  citations: {
    total: citationTotal,
    source: config.sources.citations
  },
  papers: papersToml.papers.map((paper, index) => ({
    id: paperId(paper.title),
    order: index + 1,
    title: paper.title,
    authors: paper.authors,
    venue: paper.venue,
    year: paper.year,
    notes: normalizeNotes(paper.notes),
    featured: Boolean(paper.featured),
    links: normalizeLinks(paper)
  }))
};

await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`Synced ${snapshot.papers.length} papers, ${citationTotal} source citations from ${snapshot.source.commit.slice(0, 7)} to ${path.relative(projectRoot, outputPath)}`);
