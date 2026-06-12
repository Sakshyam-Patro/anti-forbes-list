import { NextResponse } from "next/server";
import { loadBaseline } from "@/lib/data";
import { buildRanking } from "@/lib/ranking";

export const revalidate = 900;

export async function GET() {
  const baseline = loadBaseline();
  const r = await buildRanking();
  const baselineAgeH =
    (Date.now() - new Date(baseline.generated_at).getTime()) / 3.6e6;
  return NextResponse.json({
    ok: !r.degraded && baselineAgeH < 80,
    baseline_generated_at: baseline.generated_at,
    baseline_age_hours: Math.round(baselineAgeH * 10) / 10,
    methodology_version: baseline.methodology_version,
    live_degraded: r.degraded,
    founders: r.rows.length,
    companies: Object.keys(baseline.companies).length,
  });
}
