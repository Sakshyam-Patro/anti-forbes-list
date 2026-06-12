import pytest
from pydantic import ValidationError

from afl_pipeline.models import Citation, Company, Founder, SourcedValue

CITE = {"url": "https://www.sec.gov/cgi-bin/browse-edgar?CIK=0001018724"}


def company(**over):
    base = dict(slug="amazon", name="Amazon.com, Inc.", ticker="AMZN",
                cik="0001018724", bessembinder_names=["AMAZON COM INC"],
                baseline_close={"value": 230.82, "source": CITE},
                founders=["jeff-bezos"])
    base.update(over)
    return Company(**base)


def test_valid_company_parses():
    assert company().cik == "0001018724"


def test_unknown_keys_rejected():
    with pytest.raises(ValidationError):
        company(surprise_field=1)


def test_uncited_baseline_close_rejected():
    with pytest.raises(ValidationError):
        company(baseline_close={"value": 230.82})


def test_ownership_pct_must_be_fraction():
    link = dict(company="amazon", role="founder", attribution_weight=1.0,
                weight_source=CITE,
                ownership_history=[{"as_of": "2026-04-10", "pct_outstanding": 8.3,
                                    "source": CITE}])
    with pytest.raises(ValidationError):
        Founder(slug="jeff-bezos", name="Jeff Bezos", forbes_uri="jeff-bezos",
                companies=[link])


def test_family_aggregate_requires_members():
    with pytest.raises(ValidationError):
        Founder(slug="walton-family", name="Walton family", forbes_uri="walton-family",
                status="family-aggregate",
                companies=[dict(company="walmart", role="founder",
                                attribution_weight=1.0, weight_source=CITE)])


def test_sourced_value():
    assert SourcedValue(value=1.0, source=Citation(**CITE)).value == 1.0
