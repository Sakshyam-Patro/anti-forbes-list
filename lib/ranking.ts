/** Assembles the live ranking: curated YAML + daily baseline + 15-min live layer. */

import "server-only";
import { type Baseline, type CompanyYaml, type FounderYaml, loadBaseline, loadCompanies, loadFounders } from "./data";
import { type CompanyState, cwc, wcfo, wcfoStrict } from "./compute/wcfo";
import { liveNetWorths, livePrices } from "./sources/live";

export interface RankedFounder {
  slug: string; name: string;
  wcfoUsd: number; wcfoStrictUsd: number;
  keptUsd: number; keptAsOf: string; keptSource: string;
  givingUsd: number | null;
  createdUsd: number;          // total wealth created = wcfo + kept
  keptShare: number | null;    // kept / created, in [0,1]; null when created <= 0
  inherited: boolean;
  companies: { slug: string; name: string; ticker: string; weight: number; cwcUsd: number }[];
}

export interface RankingResult {
  rows: RankedFounder[];
  asOf: string;
  degraded: boolean;
  baseline: Baseline;
  founders: Record<string, FounderYaml>;
  companies: Record<string, CompanyYaml>;
  companyStates: Record<string, CompanyState & { priceSource: string; priceAsOf: string }>;
}

export async function buildRanking(): Promise<RankingResult> {
  const baseline = loadBaseline();
  const founders = loadFounders();
  const companies = loadCompanies();

  const symbolToSlug: Record<string, string> = {};
  for (const c of Object.values(companies)) symbolToSlug[c.yahoo_symbol ?? c.ticker] = c.slug;
  const uriToSlug: Record<string, string> = {};
  const uris: string[] = [];
  for (const f of Object.values(founders)) {
    const members = f.status === "family-aggregate" ? (f.members ?? []) : [f.forbes_uri];
    for (const m of members) {
      uriToSlug[m] = f.slug;
      uris.push(m);
    }
  }

  const [prices, netWorths] = await Promise.all([
    livePrices(Object.keys(symbolToSlug), baseline, symbolToSlug),
    liveNetWorths(uris, baseline, uriToSlug),
  ]);

  const companyStates: RankingResult["companyStates"] = {};
  for (const c of Object.values(companies)) {
    const sym = c.yahoo_symbol ?? c.ticker;
    const q = prices[sym];
    const b = baseline.companies[c.slug];
    companyStates[c.slug] = {
      bessembinderWcUsd: b.bessembinder_wc_usd,
      capNowUsd: q.price * b.shares_outstanding,
      capBaselineUsd: b.baseline_close_usd * b.shares_outstanding,
      priceSource: q.source,
      priceAsOf: q.asOf,
    };
  }

  let degraded = false;
  const rows: RankedFounder[] = Object.values(founders).map((f) => {
    const weights = Object.fromEntries(f.companies.map((l) => [l.company, l.attribution_weight]));
    const members = f.status === "family-aggregate" ? (f.members ?? []) : [f.forbes_uri];
    let kept = 0, keptAsOf = "", keptSource = "";
    for (const m of members) {
      const nw = netWorths[m];
      kept += nw.usd;
      keptAsOf = nw.asOf;
      keptSource = nw.source;
      if (nw.source === "daily baseline") degraded = true;
    }
    const giving = f.giving?.lifetime_usd ?? null;
    const v = wcfo(weights, companyStates, kept);
    const created = v + kept;
    return {
      slug: f.slug, name: f.name,
      wcfoUsd: v,
      wcfoStrictUsd: wcfoStrict(weights, companyStates, kept, giving ?? 0),
      keptUsd: kept, keptAsOf, keptSource,
      givingUsd: giving,
      createdUsd: created,
      // fraction the founder kept for themselves; undefined when the company
      // destroyed value (created <= 0) or the founder kept more than the
      // company created (kept > created, e.g. net worth dominated by other
      // assets while the company barely cleared the T-bill bar) — a "% of
      // total" above 100% has no meaning
      keptShare: created > 0 && kept <= created ? kept / created : null,
      inherited: f.inherited ?? false,
      companies: f.companies.map((l) => ({
        slug: l.company,
        name: companies[l.company].name,
        ticker: companies[l.company].ticker,
        weight: l.attribution_weight,
        cwcUsd: cwc(companyStates[l.company]),
      })),
    };
  });

  rows.sort((a, b) => b.wcfoUsd - a.wcfoUsd);
  return {
    rows,
    asOf: new Date().toISOString(),
    degraded,
    baseline, founders, companies, companyStates,
  };
}

export function fmtT(usd: number): string {
  const t = usd / 1e12;
  if (Math.abs(t) >= 1) return `$${t.toFixed(2)}T`;
  return `$${(usd / 1e9).toFixed(0)}B`;
}
export function fmtB(usd: number): string {
  return `$${(usd / 1e9).toFixed(1)}B`;
}
