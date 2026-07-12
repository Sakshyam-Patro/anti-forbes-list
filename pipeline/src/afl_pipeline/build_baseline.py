"""Daily baseline builder (Tier 2). Run by GitHub Actions after US close.

    uv run python -m afl_pipeline.build_baseline [--offline] [--override SLUG ...]

Reads  data/curated/{companies,founders}/*.yaml  (schema-validated),
fetches EDGAR share counts, previous closes, and Forbes net worths,
runs QA gates, writes  data/derived/baseline.json.

--offline skips all network fetches and reuses the previous baseline's live
values (used by tests and by the site's degradation drill).
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

from . import qa
from .compute import check_conservation
from .models import Baseline, BaselineCompany, BaselineFounder, Company, Founder
from .sources import bessembinder, edgar, forbes, prices

ROOT = Path(__file__).resolve().parents[3]
METHODOLOGY_VERSION = "1.2.0"
BASELINE_DATE = "2025-12-31"
RAW_XLSX = ROOT / "data/raw/WCandRets.100years.xlsx"
OUT = ROOT / "data/derived/baseline.json"


def load_curated() -> tuple[dict[str, Company], dict[str, Founder]]:
    companies = {}
    for p in sorted((ROOT / "data/curated/companies").glob("*.yaml")):
        c = Company(**yaml.safe_load(p.read_text()))
        companies[c.slug] = c
    founders = {}
    for p in sorted((ROOT / "data/curated/founders").glob("*.yaml")):
        f = Founder(**yaml.safe_load(p.read_text()))
        founders[f.slug] = f

    # referential integrity + attribution conservation
    for f in founders.values():
        for link in f.companies:
            if link.company not in companies:
                sys.exit(f"{f.slug}: unknown company '{link.company}'")
    check_conservation({f.slug: {l.company: l.attribution_weight for l in f.companies}
                        for f in founders.values()})
    return companies, founders


def build(offline: bool, overrides: set[str]) -> Baseline:
    companies, founders = load_curated()
    prev = None
    if OUT.exists():
        prev = Baseline(**json.loads(OUT.read_text()))

    wc_table = bessembinder.load_wealth_creation(RAW_XLSX)

    if offline:
        if prev is None:
            sys.exit("--offline requires an existing baseline.json")
        shares = {c.ticker: (prev.companies[s].shares_outstanding,
                             prev.companies[s].shares_as_of,
                             prev.companies[s].shares_source)
                  for s, c in companies.items() if s in prev.companies}
        closes = {c.yahoo_symbol or c.ticker:
                  (prev.companies[s].prev_close_usd or c.baseline_close.value, "offline")
                  for s, c in companies.items() if s in prev.companies}
        net_worths = {f.forbes_uri: {"net_worth_usd": prev.founders[s].forbes_net_worth_usd,
                                     "as_of": prev.founders[s].forbes_as_of}
                      for s, f in founders.items() if s in prev.founders}
        degraded: list[str] = ["offline"]
    else:
        shares = edgar.fetch_all({c.ticker: c.cik for c in companies.values()
                                  if c.shares_override is None})
        closes = prices.fetch_all([c.yahoo_symbol or c.ticker for c in companies.values()])
        # family-aggregate entries have synthetic uris; fetch their members instead
        net_worths, degraded = forbes.fetch_net_worths_resilient(
            {f.forbes_uri for f in founders.values() if f.status != "family-aggregate"} |
            {m for f in founders.values() for m in f.members})

    out_companies: dict[str, BaselineCompany] = {}
    for slug, c in companies.items():
        if c.shares_override is not None:
            sh, sh_date, sh_src = c.shares_override.value, str(c.baseline_close.source.accessed or BASELINE_DATE), "override"
        else:
            sh, sh_date, sh_src = shares[c.ticker]
        close, _ = closes[c.yahoo_symbol or c.ticker]
        wc = bessembinder.company_wc(c.bessembinder_names, wc_table) if c.bessembinder_names else 0.0
        out_companies[slug] = BaselineCompany(
            name=c.name, ticker=c.ticker, bessembinder_wc_usd=wc,
            baseline_close_usd=c.baseline_close.value,
            shares_outstanding=sh, shares_as_of=sh_date, shares_source=sh_src,
            prev_close_usd=close)

    out_founders: dict[str, BaselineFounder] = {}
    for slug, f in founders.items():
        uris = f.members if f.status == "family-aggregate" else [f.forbes_uri]
        total, as_of = 0.0, ""
        for uri in uris:
            nw = net_worths.get(uri)
            if nw is None:
                sys.exit(f"{slug}: no net worth for '{uri}' and no fallback")
            total += nw["net_worth_usd"]
            as_of = nw["as_of"]
        out_founders[slug] = BaselineFounder(name=f.name, forbes_net_worth_usd=total,
                                             forbes_as_of=as_of)

    baseline = Baseline(
        generated_at=datetime.now(timezone.utc),
        methodology_version=METHODOLOGY_VERSION,
        baseline_date=BASELINE_DATE,
        companies=out_companies, founders=out_founders)

    warnings = qa.check(baseline, prev, overrides)
    for w in warnings:
        print(f"WARN  {w}", file=sys.stderr)
    if degraded:
        print(f"WARN  degraded sources: {degraded}", file=sys.stderr)
    return baseline


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--override", action="append", default=[],
                    help="company slug allowed to move >25% since last baseline")
    args = ap.parse_args()

    baseline = build(args.offline, set(args.override))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(baseline.model_dump_json(indent=2) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}  "
          f"({len(baseline.companies)} companies, {len(baseline.founders)} founders)")


if __name__ == "__main__":
    main()
