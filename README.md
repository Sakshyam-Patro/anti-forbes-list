# The Anti-Forbes List

> *“Somebody needs to make a list where they rank people by how much wealth
> they’ve created for **other** people, instead of the Forbes list that ranks
> you by your own wealth.”*
> — Jeff Bezos, NYT DealBook Summit, December 2024

Nobody made it properly. This is that list: founders ranked by **wealth created
for others** — every number traceable to an SEC filing, an academic dataset, or
a named data source, refreshed every 15 minutes while US markets are open.

**Headline formula** (see [METHODOLOGY.md](METHODOLOGY.md), semver-versioned):

```
WCFO(founder) = Σ over companies [ w_fc × CWC_c ] − Kept_f

CWC_c  = Bessembinder lifetime shareholder wealth creation (net of T-bills,
         1926–2025) + live market-cap delta since the annual baseline
w_fc   = founding stake from the S-1/424B, normalized so weights per company
         sum to 1.0 across tracked co-founders (no double counting)
Kept_f = live Forbes net worth
```

Negative results ship unclamped. Philanthropy counts as “for others” in the
headline, with a strict-creation toggle that re-ranks with lifetime giving
counted as kept. Inherited fortunes are flagged. The methodology reproduces
Bezos’s own ~$2.1T claim within 8.5% as a permanent regression test.

## Architecture — three speed tiers

```
┌─ Tier 1 · quarterly · humans ──────────────────────────────────────┐
│ data/curated/{founders,companies}/*.yaml                           │
│ ownership %, founding stakes, giving — one citation per number;    │
│ pydantic schema validation in CI rejects anything uncited          │
└──────────────────────────┬─────────────────────────────────────────┘
┌─ Tier 2 · daily · GitHub Actions (22:30 UTC, weekdays) ────────────┐
│ pipeline/ (Python + uv): EDGAR share counts (3-tag fallback chain),│
│ previous closes, Forbes snapshot → QA gates (staleness, cap-jump,  │
│ conservation) → commit data/derived/baseline.json → Vercel deploy  │
└──────────────────────────┬─────────────────────────────────────────┘
┌─ Tier 3 · 15 min · Next.js ISR (no cron) ──────────────────────────┐
│ fetch(…, { next: { revalidate: 900 } }): Forbes RTB net worths +   │
│ Twelve Data batch prices (Yahoo fallback). 6s timeouts; degrades   │
│ to the committed baseline with per-figure “as of” badges.          │
└────────────────────────────────────────────────────────────────────┘
```

One formula, two implementations, one truth: `pipeline/src/afl_pipeline/compute.py`
(pytest) and `lib/compute/wcfo.ts` (Vitest) are both pinned to
[`data/fixtures/golden.json`](data/fixtures/golden.json) — eight hand-verified
results from the Phase-0 validation. If either drifts, its suite fails.

## Data sources

| What | Source |
|---|---|
| Per-company wealth creation, 1926–2025 | [H. Bessembinder, ASU W.P. Carey](https://wpcarey.asu.edu/department-finance/faculty-research/do-stocks-outperform-treasury-bills) (net of T-bills; dividends, buybacks, issuance accounted) |
| Shares outstanding | SEC EDGAR XBRL `companyfacts` (dei → us-gaap fallbacks; curated per-class overrides for dual-class issuers) |
| Founder ownership | DEF 14A proxy statements, hand-curated with filing URLs |
| Founding stakes (attribution weights) | S-1 / 424B prospectuses |
| Net worth | Forbes Real-Time Billionaires (unofficial feed; komed3/rtb-api archival mirror as fallback; `FORBES_ENABLED=0` kill switch) |
| Live prices | Twelve Data free tier (728/800 credits/day by market-hours gating), Yahoo fallback |

## Running it

```bash
# site
npm install && npm test && npm run build && npm start

# pipeline
cd pipeline
uv sync && uv run pytest
uv run python -m afl_pipeline.build_baseline          # live build
uv run python -m afl_pipeline.build_baseline --offline # no-network drill
```

Copy `.env.example` to `.env.local` and add a free
[Twelve Data](https://twelvedata.com) key for production prices.

## Deploying

1. Push to a public GitHub repo (public = free Actions for the daily pipeline).
2. Import into [Vercel](https://vercel.com) (Hobby tier works; ISR — not cron —
   provides the 15-minute freshness, so no paid features needed).
3. Set `TWELVEDATA_API_KEY` and `NEXT_PUBLIC_SITE_URL` in Vercel env settings.
4. The daily GitHub Action commits a fresh `baseline.json` each market day,
   which triggers a redeploy automatically.
5. Point an uptime monitor at `/api/health`.

## Corrections & contributions

The data layer is plain YAML with a citation required on every number — CI
mechanically rejects uncited data. Found an error, or want a founder added?
Open an issue or PR. ~45 minutes of proxy-statement reading per founder is the
going rate; the schema will hold you to it.

Not affiliated with Forbes, Amazon, or any listed company.
