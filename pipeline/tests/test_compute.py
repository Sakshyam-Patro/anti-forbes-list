"""The formula is pinned to data/fixtures/golden.json — eight hand-verified
results from Phase 0. The TypeScript mirror (lib/compute/wcfo.ts) is pinned to
the same file; if either implementation drifts, its suite fails."""

import json
from pathlib import Path

import pytest

from afl_pipeline.compute import CompanyState, check_conservation, wcfo, wcfo_strict

ROOT = Path(__file__).resolve().parents[2]
GOLDEN = json.loads((ROOT / "data/fixtures/golden.json").read_text())

# At the baseline date the live delta is zero by construction.
COMPANIES = {t: CompanyState(bessembinder_wc_usd=c["cwc_usd"], cap_now_usd=0.0, cap_baseline_usd=0.0)
             for t, c in GOLDEN["companies"].items()}


@pytest.mark.parametrize("slug", list(GOLDEN["founders"]))
def test_golden_reproduction(slug):
    f = GOLDEN["founders"][slug]
    assert wcfo(f["weights"], COMPANIES, f["kept_usd"]) == pytest.approx(f["wcfo_usd"], rel=1e-12)


def test_bezos_regression():
    """Permanent gate: Bezos's Dec-2024 claim reproduces within +-20% (METHODOLOGY §6).
    Computed at the 2024 baseline values recorded during Phase 0."""
    bezos_2024 = wcfo({"AMZN": 1.0},
                      {"AMZN": CompanyState(2.154e12, 0.0, 0.0)},
                      233489.254e6)
    assert 1.7e12 < bezos_2024 < 2.5e12


def test_conservation_passes_for_golden_weights():
    check_conservation({s: f["weights"] for s, f in GOLDEN["founders"].items()})


def test_conservation_catches_double_counting():
    """The bezos1000.com error: both Alphabet founders credited in full."""
    with pytest.raises(AssertionError):
        check_conservation({"larry-page": {"GOOGL": 1.0}, "sergey-brin": {"GOOGL": 1.0}})


def test_live_delta_moves_cwc():
    base = CompanyState(2.0e12, cap_now_usd=2.5e12, cap_baseline_usd=2.3e12)
    assert base.cwc_usd == pytest.approx(2.2e12)


def test_strict_variant_subtracts_giving():
    v = wcfo({"AMZN": 1.0}, {"AMZN": CompanyState(2.0e12, 0, 0)}, 0.2e12)
    assert wcfo_strict({"AMZN": 1.0}, {"AMZN": CompanyState(2.0e12, 0, 0)}, 0.2e12, 0.1e12) \
        == pytest.approx(v - 0.1e12)


def test_negative_wcfo_not_clamped():
    """Snap-style outcome: negative wealth creation must flow through honestly."""
    v = wcfo({"SNAP": 1.0}, {"SNAP": CompanyState(-30e9, 0, 0)}, 3e9)
    assert v == pytest.approx(-33e9)
