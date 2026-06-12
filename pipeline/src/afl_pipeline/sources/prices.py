"""Price adapters.

Daily pipeline (this package) only needs the previous close per ticker for the
committed baseline; the 15-minute live layer lives in the Next.js app and uses
Twelve Data. Yahoo's v8 chart endpoint is used here: free, no key, fine at
~25 calls/day server-side. Stooq is NOT usable (JS anti-bot wall, June 2026).
"""

from __future__ import annotations

import time

import httpx

CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=5d&interval=1d"
UA = {"User-Agent": "Mozilla/5.0"}


class PriceError(RuntimeError):
    pass


def prev_close(symbol: str, client: httpx.Client | None = None) -> tuple[float, str]:
    """Most recent daily close and its date for a Yahoo symbol."""
    c = client or httpx.Client()
    try:
        resp = c.get(CHART_URL.format(symbol=symbol), headers=UA, timeout=20)
        resp.raise_for_status()
        result = resp.json()["chart"]["result"][0]
        closes = (result.get("indicators", {}).get("quote") or [{}])[0].get("close") or []
        stamps = result.get("timestamp") or []
        pairs = [(s, v) for s, v in zip(stamps, closes) if v]
        if pairs:
            s, v = pairs[-1]
            return float(v), time.strftime("%Y-%m-%d", time.gmtime(s))
        # listing-day tickers have no daily bars yet; fall back to the quote
        meta = result.get("meta", {})
        if meta.get("regularMarketPrice"):
            return float(meta["regularMarketPrice"]), time.strftime(
                "%Y-%m-%d", time.gmtime(meta.get("regularMarketTime", time.time())))
        raise PriceError(f"no closes for {symbol}")
    finally:
        if client is None:
            c.close()


def fetch_all(symbols: list[str], delay_s: float = 0.8) -> dict[str, tuple[float, str]]:
    out: dict[str, tuple[float, str]] = {}
    with httpx.Client() as client:
        for sym in symbols:
            out[sym] = prev_close(sym, client)
            time.sleep(delay_s)
    return out
