from datetime import datetime, timedelta, timezone

import pytest

from afl_pipeline.models import Baseline, BaselineCompany, BaselineFounder
from afl_pipeline.qa import QAFailure, check


def mk_baseline(shares_as_of=None, prev_close=100.0, shares=1e9):
    shares_as_of = shares_as_of or (datetime.now(timezone.utc).date() - timedelta(days=30)).isoformat()
    return Baseline(
        generated_at=datetime.now(timezone.utc),
        methodology_version="1.1.0",
        baseline_date="2025-12-31",
        companies={"amazon": BaselineCompany(
            name="Amazon.com, Inc.", ticker="AMZN", bessembinder_wc_usd=2.27e12,
            baseline_close_usd=230.82, shares_outstanding=shares,
            shares_as_of=shares_as_of, shares_source="dei:EntityCommonStockSharesOutstanding",
            prev_close_usd=prev_close)},
        founders={"jeff-bezos": BaselineFounder(
            name="Jeff Bezos", forbes_net_worth_usd=2.5e11, forbes_as_of="2026-06-12")})


def test_clean_baseline_passes():
    assert check(mk_baseline(), None) == []


def test_stale_shares_warn_then_fail():
    warn_date = (datetime.now(timezone.utc).date() - timedelta(days=150)).isoformat()
    assert any("old" in w for w in check(mk_baseline(shares_as_of=warn_date), None))
    fail_date = (datetime.now(timezone.utc).date() - timedelta(days=300)).isoformat()
    with pytest.raises(QAFailure):
        check(mk_baseline(shares_as_of=fail_date), None)


def test_cap_jump_fails_without_override():
    prev, new = mk_baseline(prev_close=100.0), mk_baseline(prev_close=140.0)
    with pytest.raises(QAFailure):
        check(new, prev)
    assert check(new, prev, overrides={"amazon"}) == []
