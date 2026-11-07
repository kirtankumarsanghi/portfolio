/**
 * Build-time GitHub sync. Writes src/data/repos.snapshot.json so the Work explorer stays current.
 *
 * Usage (add to package.json):
 *   "scripts": { "sync:repos": "tsx scripts/sync-repos.ts", "prebuild": "npm run sync:repos" }
 *
 * Set GITHUB_TOKEN (read-only, public_repo) to raise the rate limit from 60/hr to 5000/hr.
 * On any failure the existing snapshot is left untouched, so builds never break.
 *
 *   npx tsx scripts/sync-repos.ts
 */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const USER = "kirtankumarsanghi";
const API = `https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`;
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "repos.snapshot.json");
const EXCLUDED = new Set(["kirtankumarsanghi"]); // profile repo

type Repo = {
  name: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  pushed_at: string;
  fork: boolean;
};

async function main() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "kirtan.dev-portfolio-sync",
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
  };

  let repos: Repo[];
  try {
    const res = await fetch(API, { headers });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    repos = (await res.json()) as Repo[];
  } catch (err) {
    console.warn(`[sync-repos] fetch failed (${(err as Error).message}) — keeping the committed snapshot.`);
    return;
  }

  const clean = repos
    .filter((r) => !EXCLUDED.has(r.name) && !r.archived)
    .map((r) => ({
      name: r.name,
      description: r.description ?? "",
      language: r.language ?? "",
      topics: (r.topics ?? []).slice(0, 12),
      html_url: r.html_url,
      homepage: r.homepage ?? "",
      stargazers_count: r.stargazers_count ?? 0,
      pushed_at: r.pushed_at ?? "",
      fork: !!r.fork,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // language byte split per repo (one extra call each) — only with a token, to stay inside rate limits
  if (process.env.GITHUB_TOKEN) {
    await Promise.all(
      clean.map(async (r) => {
        try {
          const res = await fetch(`https://api.github.com/repos/${USER}/${r.name}/languages`, { headers });
          if (res.ok) (r as typeof r & { languages?: Record<string, number> }).languages = (await res.json()) as Record<string, number>;
        } catch {
          /* keep going */
        }
      }),
    );
  }

  await writeFile(OUT, `${JSON.stringify(clean, null, 2)}\n`, "utf8");
  console.log(`[sync-repos] wrote ${clean.length} repos → src/data/repos.snapshot.json`);
  const unassigned = clean.filter((r) => !hasOverride(r.name));
  if (unassigned.length) {
    console.log(`[sync-repos] no override (→ PLAYGROUND): ${unassigned.map((r) => r.name).join(", ")}`);
  }
}

// keep the override list in sync without importing TS from a script context
const OVERRIDE_NAMES = new Set([
  "Nirixon",
  "ResQSync",
  "Cognivia",
  "Taalmel-Sync",
  "Echona",
  "Saarthi_Smart_Resource_Allocation_Platform",
  "Unbiased-ai",
  "THRYVE",
  "UNISPHERE",
]);
const hasOverride = (name: string) => OVERRIDE_NAMES.has(name);

main().catch((e) => {
  console.warn(`[sync-repos] ${e.message}`);
  process.exitCode = 0; // never fail the build
});
