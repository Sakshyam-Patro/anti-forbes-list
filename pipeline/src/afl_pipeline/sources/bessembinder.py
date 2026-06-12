"""Bessembinder dataset adapter: per-company lifetime wealth creation.

Reads the raw ASU spreadsheet (downloaded once per annual release into
data/raw/) and resolves companies by EXACT name match — pattern matching is
unsafe ("BERKSHIRE" alone matches five unrelated issuers). A company may map
to multiple rows whose windows are summed (Dell Inc 1988-2013 + Dell
Technologies 2016-).
"""

from __future__ import annotations

import re
from pathlib import Path

import pandas as pd

SHEET = "WealthCreation.2025"
SKIPROWS = 1


def load_wealth_creation(xlsx_path: Path) -> dict[str, float]:
    """{exact company name: lifetime wealth creation in USD} from the ASU file."""
    df = pd.read_excel(xlsx_path, sheet_name=SHEET, skiprows=SKIPROWS)
    df.columns = [re.sub(r"\s+", " ", str(c)).strip() for c in df.columns]
    name_col, wc_col = df.columns[0], df.columns[1]
    out: dict[str, float] = {}
    for _, row in df.iterrows():
        name = str(row[name_col])
        try:
            out[name] = float(row[wc_col]) * 1e6  # file is in $ millions
        except (TypeError, ValueError):
            continue
    return out


def company_wc(names: list[str], table: dict[str, float]) -> float:
    """Sum the listed windows; raises KeyError listing close misses on a typo."""
    total = 0.0
    for name in names:
        if name not in table:
            near = [k for k in table if k.startswith(name.split()[0])][:5]
            raise KeyError(f"'{name}' not in Bessembinder file; nearby: {near}")
        total += table[name]
    return total
