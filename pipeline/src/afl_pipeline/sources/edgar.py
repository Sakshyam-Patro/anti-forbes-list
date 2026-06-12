"""SEC EDGAR XBRL adapter: shares outstanding with a tag fallback chain.

Issuers file share counts inconsistently:
  - Amazon/Tesla/NVIDIA/Microsoft: dei:EntityCommonStockSharesOutstanding
    (multi-class issuers report one value per class on the same end date)
  - Alphabet: only us-gaap:CommonStockSharesOutstanding (consolidated)
  - Meta: neither (class-dimensioned facts are dropped from companyfacts);
    us-gaap:WeightedAverageNumberOfSharesOutstandingBasic is the best proxy
Companies where none of this is reliable (Berkshire's A/B structure) use a
curated shares_override in their YAML instead.
"""

from __future__ import annotations

import time

import httpx

USER_AGENT = "anti-forbes-list/1.0 (sakshyampatro1103@gmail.com)"
COMPANYFACTS = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"

# (taxonomy, tag, classwise) tried in order. classwise=True sums same-date
# per-class values; a value < 2M shares is treated as a high-denomination
# class only for issuers flagged in CLASS_MULTIPLIERS.
FALLBACK_TAGS = [
    ("dei", "EntityCommonStockSharesOutstanding", True),
    ("us-gaap", "CommonStockSharesOutstanding", False),
    ("us-gaap", "WeightedAverageNumberOfSharesOutstandingBasic", False),
]


class EdgarError(RuntimeError):
    pass


def fetch_companyfacts(cik: str, client: httpx.Client | None = None) -> dict:
    c = client or httpx.Client()
    try:
        resp = c.get(COMPANYFACTS.format(cik=cik), headers={"User-Agent": USER_AGENT}, timeout=30)
        resp.raise_for_status()
        return resp.json()
    finally:
        if client is None:
            c.close()


def shares_outstanding(facts: dict) -> tuple[float, str, str]:
    """Return (shares, as_of_date, source_tag) from a companyfacts payload."""
    for taxo, tag, classwise in FALLBACK_TAGS:
        fact = facts.get("facts", {}).get(taxo, {}).get(tag)
        if not fact:
            continue
        entries = [e for unit in fact["units"].values() for e in unit]
        if not entries:
            continue
        latest = max(e["end"] for e in entries)
        vals = sorted({e["val"] for e in entries if e["end"] == latest and e["val"]})
        if not vals:
            continue
        total = sum(vals) if classwise else max(vals)
        return float(total), latest, f"{taxo}:{tag}"
    raise EdgarError("no usable share-count tag in companyfacts")


def fetch_all(ciks: dict[str, str], delay_s: float = 0.15) -> dict[str, tuple[float, str, str]]:
    """Fetch shares outstanding for {ticker: cik}, throttled below SEC's 10 req/s."""
    out: dict[str, tuple[float, str, str]] = {}
    with httpx.Client() as client:
        for ticker, cik in ciks.items():
            out[ticker] = shares_outstanding(fetch_companyfacts(cik, client))
            time.sleep(delay_s)
    return out
