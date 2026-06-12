"""Phase 0 validation prototype.

Computes Wealth Created For Others (WCFO) for 8 founders at two baselines:
  - Dec 31, 2024  -> validates against Bezos's public ~$2.1T claim (METHODOLOGY.md §6)
  - Dec 31, 2025  -> exported as data/fixtures/golden.json, the fixture that pins
                     both the Python pipeline and the TypeScript site compute

Deterministic by design: every input is a curated constant with a citation URL.
Run:  uv run python notebooks/prototype_validation.py
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# ---------------------------------------------------------------------------
# Curated inputs. Net worths are Forbes real-time figures (USD millions) on the
# stated date, via the komed3/rtb-api archival mirror (values verified 2026-06-12).
# Attribution weights per METHODOLOGY.md §4: founding stake normalized across
# tracked founders so weights per company sum to 1.0.
# ---------------------------------------------------------------------------

KOMED3 = "https://raw.githubusercontent.com/komed3/rtb-api/main/api/profile/{slug}/history"

COMPANIES = {
    # ticker -> exact company name in the Bessembinder datasets (regex matching
    # is unsafe: "BERKSHIRE" alone matches five unrelated companies)
    "AMZN":  "AMAZON COM INC",
    "TSLA":  "TESLA INC",
    "NVDA":  "NVIDIA CORP",
    "MSFT":  "MICROSOFT CORP",
    "GOOGL": "ALPHABET INC",
    "META":  "META PLATFORMS INC",
    "BRK":   "BERKSHIRE HATHAWAY INC DEL",
}

FOUNDERS = {
    "jeff-bezos": {
        "name": "Jeff Bezos",
        "companies": {"AMZN": 1.0},  # sole founder, Amazon S-1 (1997)
        "networth_musd": {"2024-12-31": 233489.254, "2025-12-31": 242473.677},
    },
    "elon-musk": {
        "name": "Elon Musk",
        # Joined Tesla at Series A (2004), legally "co-founder" per 2009 settlement;
        # sole tracked founder -> 1.0. Public companies only (SpaceX excluded, §5).
        "companies": {"TSLA": 1.0},
        "networth_musd": {"2024-12-31": 421183.785, "2025-12-31": 726376.264},
    },
    "jensen-huang": {
        "name": "Jensen Huang",
        # Co-founders Malachowsky & Priem untracked in v1 (documented limitation, §4)
        "companies": {"NVDA": 1.0},
        "networth_musd": {"2024-12-31": 117246.230, "2025-12-31": 161942.602},
    },
    "bill-gates": {
        "name": "Bill Gates",
        "companies": {"MSFT": 1.0},  # Paul Allen untracked in v1 (§4)
        "networth_musd": {"2024-12-31": 103303.454, "2025-12-31": 103464.557},
    },
    "larry-page": {
        "name": "Larry Page",
        "companies": {"GOOGL": 0.5},  # near-equal stakes at 2004 IPO (424B prospectus)
        "networth_musd": {"2024-12-31": 156020.049, "2025-12-31": 256963.619},
    },
    "sergey-brin": {
        "name": "Sergey Brin",
        "companies": {"GOOGL": 0.5},
        "networth_musd": {"2024-12-31": 148971.208, "2025-12-31": 237117.220},
    },
    "mark-zuckerberg": {
        "name": "Mark Zuckerberg",
        "companies": {"META": 1.0},  # other co-founders untracked in v1 (§4)
        "networth_musd": {"2024-12-31": 202473.789, "2025-12-31": 226339.286},
    },
    "warren-buffett": {
        "name": "Warren Buffett",
        "companies": {"BRK": 1.0},  # acquired 1965, tracked as builder (§5)
        "networth_musd": {"2024-12-31": 141686.298, "2025-12-31": 148925.145},
    },
}

BESSEMBINDER_FILES = {
    "2024-12-31": "WealthCreation.2024.labeled.xlsx (ASU, Apr 2025)",
    "2025-12-31": "WCandRets.100years.xlsx (ASU, Mar 2026)",
}


def load_cwc(baseline: str) -> dict[str, float]:
    """Company wealth creation in USD at the given baseline, from the extract
    produced from the raw ASU spreadsheets (values are $ millions there)."""
    raw = json.loads((ROOT / "data/raw/bessembinder_targets.json").read_text())
    year = baseline[:4]
    cwc = {}
    for ticker, exact_name in COMPANIES.items():
        rows = [r for r in raw[year][ticker] if r["name"] == exact_name]
        assert len(rows) == 1, f"expected exactly one match for {exact_name}, got {rows}"
        cwc[ticker] = rows[0]["wc_usd_millions"] * 1e6
    return cwc


def wcfo(founder: dict, cwc: dict[str, float], baseline: str) -> float:
    created = sum(w * cwc[t] for t, w in founder["companies"].items())
    kept = founder["networth_musd"][baseline] * 1e6
    return created - kept


def main() -> None:
    results = {}
    for baseline in ("2024-12-31", "2025-12-31"):
        cwc = load_cwc(baseline)
        rows = []
        for slug, f in FOUNDERS.items():
            v = wcfo(f, cwc, baseline)
            rows.append((slug, f["name"], v, f["networth_musd"][baseline] * 1e6))
        rows.sort(key=lambda r: -r[2])
        results[baseline] = {"cwc": cwc, "rows": rows}

        print(f"\n=== WCFO at {baseline}  ({BESSEMBINDER_FILES[baseline]}) ===")
        for rank, (slug, name, v, kept) in enumerate(rows, 1):
            mult = (v + kept) / kept
            print(f"{rank}. {name:18s}  created-for-others ${v/1e12:6.3f}T   kept ${kept/1e9:6.1f}B   multiple {mult:5.1f}x")

    # --- Gate 1: Bezos reproduces his own ~$2.1T claim at Dec 2024 (±20%) ---
    bezos_2024 = wcfo(FOUNDERS["jeff-bezos"], results["2024-12-31"]["cwc"], "2024-12-31")
    assert 1.7e12 < bezos_2024 < 2.5e12, f"Bezos gate FAILED: {bezos_2024:.3e}"
    print(f"\nGATE 1 PASS  Bezos WCFO Dec-2024 = ${bezos_2024/1e12:.3f}T "
          f"(claim $2.1T, deviation {abs(bezos_2024 - 2.1e12)/2.1e12:.1%})")

    # --- Gate 2: co-founder conservation (no double counting) ---
    for baseline in ("2024-12-31", "2025-12-31"):
        cwc = results[baseline]["cwc"]
        joint = (wcfo(FOUNDERS["larry-page"], cwc, baseline)
                 + wcfo(FOUNDERS["sergey-brin"], cwc, baseline))
        expect = cwc["GOOGL"] - (FOUNDERS["larry-page"]["networth_musd"][baseline]
                                 + FOUNDERS["sergey-brin"]["networth_musd"][baseline]) * 1e6
        assert abs(joint - expect) < 1.0, f"conservation FAILED at {baseline}"
    print("GATE 2 PASS  Page+Brin WCFO sums to CWC(GOOGL) - both kept (others' pool counted once)")

    # --- Export golden fixture at the production baseline (Dec 2025) ---
    baseline = "2025-12-31"
    golden = {
        "methodology_version": "1.0.0",
        "baseline": baseline,
        "baseline_source": BESSEMBINDER_FILES[baseline],
        "networth_source": "Forbes RTB via komed3/rtb-api archive, " + KOMED3,
        "companies": {t: {"name": COMPANIES[t], "cwc_usd": results[baseline]["cwc"][t]}
                      for t in COMPANIES},
        "founders": {
            slug: {
                "name": f["name"],
                "weights": f["companies"],
                "kept_usd": f["networth_musd"][baseline] * 1e6,
                "wcfo_usd": wcfo(f, results[baseline]["cwc"], baseline),
            } for slug, f in FOUNDERS.items()
        },
    }
    out = ROOT / "data/fixtures/golden.json"
    out.write_text(json.dumps(golden, indent=2) + "\n")
    print(f"\nWrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
