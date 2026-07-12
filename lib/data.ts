/** Server-only loaders for the committed data layer (Tier 1 + Tier 2). */

import "server-only";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

// On Vercel/CI process.cwd() is the project root; AFL_ROOT overrides for
// launchers that start the server from elsewhere.
const ROOT = process.env.AFL_ROOT ?? process.cwd();

export interface Citation { url: string; note?: string; accessed?: string }
export interface OwnershipPoint { as_of: string; pct_outstanding: number; source: Citation }
export interface CompanyLink {
  company: string;
  role: "founder" | "cofounder" | "builder";
  attribution_weight: number;
  weight_source: Citation;
  ownership_history?: OwnershipPoint[];
  /** false = ownership is of unlisted units/deemed-beneficial, so pct x public
   * market cap is not a valid dollar figure and must not be displayed */
  stake_of_listed_class?: boolean;
}
export interface FounderYaml {
  slug: string; name: string; forbes_uri: string;
  status?: "living" | "deceased" | "family-aggregate";
  inherited?: boolean; members?: string[];
  companies: CompanyLink[];
  giving?: { lifetime_usd: number; basis: string; source: Citation };
  special_notes?: string[];
}
export interface CompanyYaml {
  slug: string; name: string; ticker: string; cik: string;
  bessembinder_names: string[]; yahoo_symbol?: string;
  baseline_close: { value: number; source: Citation };
  listing_date?: string;
  shares_override?: { value: number; source: Citation };
  founders: string[]; notes?: string[];
}
export interface Baseline {
  generated_at: string; methodology_version: string; baseline_date: string;
  companies: Record<string, {
    name: string; ticker: string; bessembinder_wc_usd: number;
    baseline_close_usd: number; shares_outstanding: number;
    shares_as_of: string; shares_source: string; prev_close_usd: number | null;
  }>;
  founders: Record<string, { name: string; forbes_net_worth_usd: number; forbes_as_of: string }>;
}

function loadDir<T>(dir: string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const f of readdirSync(join(ROOT, dir))) {
    if (!f.endsWith(".yaml")) continue;
    const doc = parse(readFileSync(join(ROOT, dir, f), "utf8")) as T & { slug: string };
    out[doc.slug] = doc;
  }
  return out;
}

export function loadBaseline(): Baseline {
  return JSON.parse(readFileSync(join(ROOT, "data/derived/baseline.json"), "utf8"));
}
export function loadFounders(): Record<string, FounderYaml> {
  return loadDir<FounderYaml>("data/curated/founders");
}
export function loadCompanies(): Record<string, CompanyYaml> {
  return loadDir<CompanyYaml>("data/curated/companies");
}
export function loadMethodology(): string {
  return readFileSync(join(ROOT, "METHODOLOGY.md"), "utf8");
}
