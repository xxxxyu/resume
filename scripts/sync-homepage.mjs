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

let previousSnapshot = {};
try {
  previousSnapshot = JSON.parse(await readFile(outputPath, "utf8"));
} catch {
  // The first sync has no cached snapshot.
}

function git(...args) {
  return execFileSync("git", args, { cwd: homepageRepo, encoding: "utf8" }).trim();
}

function stripFrontMatter(markdown) {
  return markdown.replace(/^\+\+\+[\s\S]*?\+\+\+\s*/, "").trim();
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

function markdownBullets(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => /^-\s+/.test(line))
    .map((line) => plainText(line.replace(/^-\s+/, "")))
    .filter(Boolean);
}

async function githubStarCount(repository) {
  const cached = previousSnapshot.githubStars?.[repository];
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "xiangyu-resume-sync"
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  try {
    const response = await fetch(`https://api.github.com/repos/${repository}`, { headers });
    if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
    const payload = await response.json();
    if (!Number.isInteger(payload.stargazers_count)) throw new Error("GitHub API returned an invalid star count");
    return payload.stargazers_count;
  } catch (error) {
    if (Number.isInteger(cached)) {
      console.warn(`Using cached stars for ${repository}: ${cached} (${error.message})`);
      return cached;
    }
    throw error;
  }
}

const sourcePaths = Object.fromEntries(
  Object.entries(config.sources).map(([key, value]) => [key, path.join(homepageRepo, value)])
);

const papersToml = parse(await readFile(sourcePaths.papers, "utf8"));
const profileMarkdown = await readFile(sourcePaths.profile, "utf8");
const aboutMarkdown = await readFile(sourcePaths.about, "utf8");
const awardsMarkdown = await readFile(sourcePaths.awards, "utf8");
const experiencesMarkdown = await readFile(sourcePaths.experiences, "utf8");
const citationBadge = JSON.parse(await readFile(sourcePaths.citations, "utf8"));
const citationTotal = Number.parseInt(citationBadge.message, 10);
if (!Number.isInteger(citationTotal)) throw new Error(`Invalid citation total in ${sourcePaths.citations}`);
const githubStars = Object.fromEntries(await Promise.all(
  (config.githubRepositories || []).map(async (repository) => [repository, await githubStarCount(repository)])
));

const snapshot = {
  source: {
    repository: "https://github.com/xxxxyu/xxxxyu.github.io",
    commit: git("rev-parse", "HEAD"),
    commitDate: git("show", "-s", "--format=%cI", "HEAD"),
    branch: git("branch", "--show-current"),
    files: config.sources
  },
  profile: plainText(stripFrontMatter(profileMarkdown)),
  about: plainText(stripFrontMatter(aboutMarkdown)),
  awards: markdownBullets(awardsMarkdown),
  experiences: markdownBullets(experiencesMarkdown),
  citations: {
    total: citationTotal,
    source: config.sources.citations
  },
  githubStars,
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
console.log(`Synced ${snapshot.papers.length} papers, ${citationTotal} citations, and ${Object.keys(githubStars).length} GitHub star counts from ${snapshot.source.commit.slice(0, 7)} to ${path.relative(projectRoot, outputPath)}`);
