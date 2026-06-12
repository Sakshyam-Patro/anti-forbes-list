/** Shared helpers for OG share cards (Satori). No live fetches — numbers come
 * from the committed daily baseline including its stored close-price delta,
 * so cards match the site to within one trading day. */

import { loadBaseline, loadFounders } from "./data";

export interface OgRow { slug: string; name: string; v: number; kept: number }

export function baselineRanking(): OgRow[] {
  const baseline = loadBaseline();
  const founders = loadFounders();
  return Object.values(founders)
    .map((f) => {
      const created = f.companies.reduce((s, l) => {
        const c = baseline.companies[l.company];
        const delta = ((c.prev_close_usd ?? c.baseline_close_usd) - c.baseline_close_usd) * c.shares_outstanding;
        return s + l.attribution_weight * (c.bessembinder_wc_usd + delta);
      }, 0);
      const kept = baseline.founders[f.slug].forbes_net_worth_usd;
      return { slug: f.slug, name: f.name, v: created - kept, kept };
    })
    .sort((a, b) => b.v - a.v);
}

export function fmtOg(usd: number): string {
  const a = Math.abs(usd);
  return `${usd < 0 ? "−" : ""}$${a >= 0.9995e12 ? (a / 1e12).toFixed(2) + "T" : (a / 1e9).toFixed(0) + "B"}`;
}

/** Vendored Fraunces Bold (OFL) — Satori needs raw font bytes (ttf/otf/woff,
 * not woff2) and cannot use system fonts. Returns null on any failure so
 * cards degrade to Satori's default sans. */
export async function loadDisplayFont(): Promise<ArrayBuffer | null> {
  try {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const buf = readFileSync(
      join(process.env.AFL_ROOT ?? process.cwd(), "assets/fonts/Fraunces-Bold.woff"),
    );
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  } catch {
    return null;
  }
}

export function ogFonts(data: ArrayBuffer | null) {
  return data ? [{ name: "Fraunces", data, style: "normal" as const, weight: 700 as const }] : undefined;
}

export const OG_SERIF = "Fraunces, Georgia, serif";
