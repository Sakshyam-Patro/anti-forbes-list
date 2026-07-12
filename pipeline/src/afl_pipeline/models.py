"""Pydantic schemas for the curated YAML layer and the derived baseline.

Every quantitative claim in the curated data must carry a Citation. Schema
validation runs in CI; an uncited number cannot merge.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Citation(Strict):
    url: str = Field(min_length=10)
    note: str | None = None
    accessed: date | None = None


class SourcedValue(Strict):
    value: float
    source: Citation


class OwnershipPoint(Strict):
    as_of: date
    pct_outstanding: float = Field(gt=0, le=1)
    source: Citation


class Company(Strict):
    schema_version: Literal[1] = 1
    slug: str
    name: str
    ticker: str
    cik: str = Field(pattern=r"^\d{10}$")
    # exact names in the Bessembinder spreadsheet; multiple windows are summed
    # (e.g. Dell Inc 1988-2013 + Dell Technologies 2016-). Empty list is only
    # valid for newly-listed companies not yet in the annual dataset.
    bessembinder_names: list[str]
    yahoo_symbol: str | None = None  # when it differs from ticker (BRK -> BRK-B)
    # close on the baseline date (or listing day for new listings), curated once
    baseline_close: SourcedValue
    listing_date: date | None = None  # set for companies newer than the baseline
    # per-class share counts when EDGAR's consolidated tags are unreliable
    shares_override: SourcedValue | None = None
    founders: list[str]
    notes: list[str] = []


class CompanyLink(Strict):
    company: str  # company slug
    role: Literal["founder", "cofounder", "builder"]
    attribution_weight: float = Field(gt=0, le=1)
    weight_source: Citation
    ownership_history: list[OwnershipPoint] = []
    # False when the recorded ownership is NOT of the listed share class
    # (Up-C partnership units, deemed beneficial ownership aggregating other
    # members) — pct x public market cap would be a wrong dollar figure, so
    # the site shows the % with citation but suppresses the computed value.
    stake_of_listed_class: bool = True


class Giving(Strict):
    lifetime_usd: float = Field(ge=0)
    basis: str  # what the figure counts (actual transfers vs pledges, valuation basis)
    source: Citation


class Founder(Strict):
    schema_version: Literal[1] = 1
    slug: str
    name: str
    forbes_uri: str  # join key into Forbes RTB personList[].uri
    status: Literal["living", "deceased", "family-aggregate"] = "living"
    inherited: bool = False
    members: list[str] = []  # forbes uris, for family-aggregate entries
    companies: list[CompanyLink]
    giving: Giving | None = None
    special_notes: list[str] = []

    @model_validator(mode="after")
    def _aggregate_has_members(self):
        if self.status == "family-aggregate" and not self.members:
            raise ValueError(f"{self.slug}: family-aggregate requires members")
        return self


class BaselineCompany(Strict):
    name: str
    ticker: str
    bessembinder_wc_usd: float  # 0.0 for post-baseline listings
    baseline_close_usd: float
    shares_outstanding: float
    shares_as_of: str
    shares_source: str  # XBRL tag used, or "override"
    prev_close_usd: float | None = None


class BaselineFounder(Strict):
    name: str
    forbes_net_worth_usd: float
    forbes_as_of: str


class Baseline(Strict):
    generated_at: datetime
    methodology_version: str
    baseline_date: date
    companies: dict[str, BaselineCompany]
    founders: dict[str, BaselineFounder]
