/**
 * Merged project model: generated/snapshot GitHub data + local overrides.
 *
 * `data/repos.generated.json` is written by scripts/sync-repos.ts at build time (add
 * `"prebuild": "tsx scripts/sync-repos.ts"` to package.json). When it is absent the committed
 * snapshot is used, so the site always renders. Unassigned repos fall under PLAYGROUND.
 */

import raw from "./repos.snapshot.json";
import { overrides, type ProjectOverride } from "./projects.overrides";
import { domains, type DomainId } from "./domains";

export type RepoData = {
  name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  pushed_at: string;
  fork: boolean;
  /** bytes per language — written by scripts/sync-repos.ts when GITHUB_TOKEN is set */
  languages?: Record<string, number>;
};

const EXCLUDED = new Set(["kirtankumarsanghi"]); // the profile repo

const repos = (raw as RepoData[]).filter((r) => !EXCLUDED.has(r.name));

export type Project = {
  id: string;
  repo: string;
  title: string;
  subtitle: string;
  /** primary domain */
  domain: DomainId;
  /** every domain this project appears in (primary + tags) */
  domains: DomainId[];
  year: string;
  role: string;
  featured: boolean;
  accent: string;
  tagline: string;
  problem?: string;
  approach: string[];
  impact: string[];
  stack: string[];
  metrics: { value: string; label: string }[];
  mock?: ProjectOverride["mock"];
  liveUrl?: string;
  status: ProjectOverride["status"];
  /** true when only GitHub auto data exists — shows "DETAILS COMING SOON" */
  auto: boolean;
  url: string;
  language: string | null;
  topics: string[];
  stars: number;
  languages?: Record<string, number>;
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const PROJECTS: Project[] = repos.map((r) => {
  const o = overrides[r.name];
  const domain: DomainId = o?.domain ?? "playground";
  const tags = o?.tags ?? [];
  return {
    id: slug(r.name),
    repo: r.name,
    title: o?.title ?? r.name,
    subtitle: r.description ?? "",
    domain,
    domains: [domain, ...tags.filter((t) => t !== domain)],
    year: o?.year ?? (r.pushed_at ? r.pushed_at.slice(0, 4) : "—"),
    role: o?.role ?? "",
    featured: o?.featured ?? false,
    accent: o?.accent ?? domains.find((d) => d.id === domain)?.accent ?? "#23262e",
    tagline: o?.tagline ?? "",
    problem: o?.problem,
    approach: o?.approach ?? [],
    impact: o?.impact ?? [],
    stack: o?.stack ?? (r.language ? [r.language] : []),
    metrics: o?.metrics ?? [],
    mock: o?.mock,
    liveUrl: o?.liveUrl ?? (r.homepage || undefined),
    status: o?.status ?? (r.fork ? "fork" : "wip"),
    // no case-study content yet (even if an override sets domain/accent) → "DETAILS COMING SOON"
    auto: !o || !(o.problem || (o.approach && o.approach.length)),
    url: r.html_url,
    language: r.language,
    topics: r.topics ?? [],
    stars: r.stargazers_count ?? 0,
    languages: r.languages,
  };
});

/** featured case studies (rich, résumé-sourced) */
export const projects = PROJECTS.filter((p) => p.featured);
export const allProjects = PROJECTS;
export const projectCount = PROJECTS.length;

export const getProject = (id: string) => PROJECTS.find((p) => p.id === id);
export const projectsInDomain = (id: DomainId) => PROJECTS.filter((p) => p.domains.includes(id));
export const domainCounts = (): Record<string, number> => {
  const m: Record<string, number> = {};
  domains.forEach((d) => (m[d.id] = 0));
  PROJECTS.forEach((p) => p.domains.forEach((d) => (m[d] = (m[d] ?? 0) + 1)));
  return m;
};

export const statusLabel = (s: Project["status"]) =>
  s === "fork" ? "FORK" : s === "wip" ? "WIP" : s === "archived" ? "ARCHIVED" : "SHIPPED";

/** Kept for the About hover previews. */
export type ProjectId = string;
export { domains };
