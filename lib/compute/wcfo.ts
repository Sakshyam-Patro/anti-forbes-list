/**
 * The WCFO formula — TypeScript mirror of pipeline/src/afl_pipeline/compute.py.
 *
 *   WCFO(f) = Σ_c [ w_fc × CWC_c ] − Kept_f
 *   CWC_c   = B_c + (cap_now − cap_baseline)
 *
 * Both implementations are pinned to data/fixtures/golden.json; change
 * METHODOLOGY.md first, then both mirrors.
 */

export interface CompanyState {
  bessembinderWcUsd: number;
  capNowUsd: number;
  capBaselineUsd: number;
}

export function cwc(c: CompanyState): number {
  return c.bessembinderWcUsd + (c.capNowUsd - c.capBaselineUsd);
}

export function wcfo(
  weights: Record<string, number>,
  companies: Record<string, CompanyState>,
  keptUsd: number,
): number {
  let created = 0;
  for (const [slug, w] of Object.entries(weights)) {
    const state = companies[slug];
    if (!state) throw new Error(`unknown company: ${slug}`);
    created += w * cwc(state);
  }
  return created - keptUsd;
}

/** Strict-creation variant: lifetime giving counts as kept (METHODOLOGY §5). */
export function wcfoStrict(
  weights: Record<string, number>,
  companies: Record<string, CompanyState>,
  keptUsd: number,
  lifetimeGivingUsd: number,
): number {
  return wcfo(weights, companies, keptUsd) - lifetimeGivingUsd;
}
