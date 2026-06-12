/**
 * Tier 3: the 15-minute live layer.
 *
 * Fetches are wrapped in Next's data cache with revalidate: 900, so however
 * many pages render, each upstream is hit at most once per window. Every
 * fetch degrades to the committed daily baseline; pages must always render.
 *
 * Prices: Twelve Data when TWELVEDATA_API_KEY is set (production; batch call,
 * ~728 credits/day inside the free 800), else Yahoo's chart quote (dev), else
 * baseline prev_close.
 */

import type { Baseline } from "../data";

const REVALIDATE = 900;
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

export interface LiveQuote { price: number; asOf: string; source: string }
export interface LiveNetWorth { usd: number; asOf: string; source: string }

function marketLikelyOpen(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  const mins = et.getHours() * 60 + et.getMinutes();
  return day >= 1 && day <= 5 && mins >= 9 * 60 + 30 && mins <= 16 * 60;
}

const FETCH_TIMEOUT_MS = 6000;

async function twelveData(symbols: string[]): Promise<Record<string, number>> {
  const key = process.env.TWELVEDATA_API_KEY;
  if (!key) throw new Error("no TWELVEDATA_API_KEY");
  const url = `https://api.twelvedata.com/price?symbol=${symbols.join(",")}&apikey=${key}`;
  const res = await fetch(url, {
    next: { revalidate: REVALIDATE },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`twelvedata ${res.status}`);
  const j = (await res.json()) as Record<string, { price?: string }>;
  const out: Record<string, number> = {};
  for (const s of symbols) {
    const p = symbols.length === 1 ? (j as { price?: string }).price : j[s]?.price;
    if (p) out[s] = parseFloat(p);
  }
  return out;
}

async function yahooQuote(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1d`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: REVALIDATE },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
    if (!res.ok) return null;
    const j = await res.json();
    return j?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

export async function livePrices(
  symbols: string[],
  baseline: Baseline,
  symbolToSlug: Record<string, string>,
): Promise<Record<string, LiveQuote>> {
  const out: Record<string, LiveQuote> = {};
  const fallback = (sym: string): LiveQuote => {
    const c = baseline.companies[symbolToSlug[sym]];
    return {
      price: c.prev_close_usd ?? c.baseline_close_usd,
      asOf: baseline.generated_at,
      source: "daily baseline",
    };
  };

  if (!marketLikelyOpen()) {
    for (const s of symbols) out[s] = fallback(s);
    return out;
  }

  let td: Record<string, number> = {};
  try {
    td = await twelveData(symbols);
  } catch {
    /* fall through per-symbol */
  }
  const now = new Date().toISOString();
  const missing = symbols.filter((s) => !td[s]);
  const yahoo = await Promise.all(missing.map((s) => yahooQuote(s)));
  const ymap = Object.fromEntries(missing.map((s, i) => [s, yahoo[i]]));
  for (const s of symbols) {
    if (td[s]) {
      out[s] = { price: td[s], asOf: now, source: "Twelve Data" };
    } else if (ymap[s]) {
      out[s] = { price: ymap[s]!, asOf: now, source: "Yahoo Finance" };
    } else {
      out[s] = fallback(s);
    }
  }
  return out;
}

const RTB_URL =
  "https://www.forbes.com/forbesapi/person/rtb/0/position/true.json?fields=uri,finalWorth,timestamp";

export async function liveNetWorths(
  uris: string[],
  baseline: Baseline,
  uriToSlug: Record<string, string>,
): Promise<Record<string, LiveNetWorth>> {
  const out: Record<string, LiveNetWorth> = {};
  const fallback = (uri: string): LiveNetWorth => {
    const f = baseline.founders[uriToSlug[uri]];
    return { usd: f?.forbes_net_worth_usd ?? 0, asOf: f?.forbes_as_of ?? "", source: "daily baseline" };
  };

  if (process.env.FORBES_ENABLED === "0") {
    for (const u of uris) out[u] = fallback(u);
    return out;
  }
  try {
    const res = await fetch(RTB_URL, {
      headers: { "User-Agent": BROWSER_UA },
      next: { revalidate: REVALIDATE },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`forbes ${res.status}`);
    const j = await res.json();
    const byUri = new Map<string, { finalWorth: number; timestamp: number }>(
      j.personList.personsLists.map((p: { uri: string; finalWorth: number; timestamp: number }) => [p.uri, p]),
    );
    for (const u of uris) {
      const p = byUri.get(u);
      out[u] = p?.finalWorth
        ? { usd: p.finalWorth * 1e6, asOf: new Date(p.timestamp).toISOString(), source: "Forbes RTB" }
        : fallback(u);
    }
  } catch {
    for (const u of uris) out[u] = fallback(u);
  }
  return out;
}
