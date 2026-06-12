"""The WCFO formula. Implements METHODOLOGY.md and nothing else.

    WCFO(f) = sum_c [ w_fc * CWC_c ] - Kept_f
    CWC_c   = B_c + (cap_now - cap_baseline)

This module is mirrored in TypeScript (lib/compute/wcfo.ts); both are pinned
to data/fixtures/golden.json. Change METHODOLOGY.md first, then both mirrors.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CompanyState:
    bessembinder_wc_usd: float
    cap_now_usd: float
    cap_baseline_usd: float

    @property
    def cwc_usd(self) -> float:
        return self.bessembinder_wc_usd + (self.cap_now_usd - self.cap_baseline_usd)


def wcfo(weights: dict[str, float], companies: dict[str, CompanyState], kept_usd: float) -> float:
    created = sum(w * companies[slug].cwc_usd for slug, w in weights.items())
    return created - kept_usd


def wcfo_strict(weights: dict[str, float], companies: dict[str, CompanyState],
                kept_usd: float, lifetime_giving_usd: float) -> float:
    """Strict-creation variant: lifetime giving counts as kept (METHODOLOGY §5)."""
    return wcfo(weights, companies, kept_usd) - lifetime_giving_usd


def check_conservation(founder_weights: dict[str, dict[str, float]], tol: float = 1e-9) -> None:
    """Attribution weights for each company must sum to <= 1.0 across tracked
    founders (== 1.0 when any founder is tracked). Raises on violation."""
    by_company: dict[str, float] = {}
    for weights in founder_weights.values():
        for slug, w in weights.items():
            by_company[slug] = by_company.get(slug, 0.0) + w
    bad = {c: s for c, s in by_company.items() if abs(s - 1.0) > tol}
    if bad:
        raise AssertionError(f"attribution weights must sum to 1.0 per company: {bad}")
