"""QA gates. Run after computing a candidate baseline, before committing it.

A gate failure aborts the GitHub Actions run, leaving the previous committed
baseline in place — stale-but-correct beats fresh-but-wrong.
"""

from __future__ import annotations

from datetime import date, datetime, timezone

from .models import Baseline

SHARES_WARN_DAYS = 120
SHARES_FAIL_DAYS = 270
CAP_JUMP_FAIL = 0.25  # day-over-day market cap delta without an override


class QAFailure(AssertionError):
    pass


def check(new: Baseline, prev: Baseline | None, overrides: set[str] = frozenset()) -> list[str]:
    """Returns warnings; raises QAFailure on hard violations."""
    warnings: list[str] = []
    today = datetime.now(timezone.utc).date()

    for slug, c in new.companies.items():
        age = (today - date.fromisoformat(c.shares_as_of)).days
        if age > SHARES_FAIL_DAYS:
            raise QAFailure(f"{slug}: share count {age}d old (> {SHARES_FAIL_DAYS})")
        if age > SHARES_WARN_DAYS:
            warnings.append(f"{slug}: share count {age}d old")

        if c.shares_outstanding <= 0 or c.baseline_close_usd <= 0:
            raise QAFailure(f"{slug}: non-positive shares or baseline close")

        if prev and slug in prev.companies and slug not in overrides:
            p = prev.companies[slug]
            if p.prev_close_usd and c.prev_close_usd:
                old = p.prev_close_usd * p.shares_outstanding
                cur = c.prev_close_usd * c.shares_outstanding
                jump = abs(cur - old) / old
                if jump > CAP_JUMP_FAIL:
                    raise QAFailure(
                        f"{slug}: market cap moved {jump:.0%} since last baseline; "
                        f"pass --override {slug} if real")

    for slug, f in new.founders.items():
        if f.forbes_net_worth_usd <= 0:
            raise QAFailure(f"{slug}: non-positive net worth")

    return warnings
