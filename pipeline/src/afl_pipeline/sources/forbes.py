"""Forbes real-time billionaires adapter with archival fallback.

Primary: Forbes' unofficial RTB JSON (server-side only, browser User-Agent,
~96 calls/day across the whole system). Fallback: the komed3/rtb-api GitHub
archive, which snapshots the same feed daily. Either failing is survivable —
the daily baseline commit is the floor.
"""

from __future__ import annotations

import httpx

RTB_URL = ("https://www.forbes.com/forbesapi/person/rtb/0/position/true.json"
           "?fields=uri,personName,finalWorth,timestamp")
MIRROR_HISTORY = "https://raw.githubusercontent.com/komed3/rtb-api/main/api/profile/{uri}/history"
BROWSER_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
              "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36")


class ForbesError(RuntimeError):
    pass


def fetch_net_worths(uris: set[str]) -> dict[str, dict]:
    """{uri: {net_worth_usd, as_of}} for the requested people, from the live feed."""
    resp = httpx.get(RTB_URL, headers={"User-Agent": BROWSER_UA}, timeout=30)
    resp.raise_for_status()
    people = resp.json()["personList"]["personsLists"]
    out = {}
    for p in people:
        if p.get("uri") in uris and p.get("finalWorth"):
            out[p["uri"]] = {
                "net_worth_usd": p["finalWorth"] * 1e6,
                "as_of": str(p.get("timestamp", "")),
            }
    missing = uris - out.keys()
    if missing:
        raise ForbesError(f"RTB feed missing: {sorted(missing)}")
    return out


def fetch_net_worth_mirror(uri: str, on_or_before: str | None = None) -> dict:
    """Last known net worth from the komed3 archive (space-separated daily rows:
    date rank networth diff pct). Used as fallback and for historical lookups."""
    resp = httpx.get(MIRROR_HISTORY.format(uri=uri), timeout=30)
    resp.raise_for_status()
    rows = [ln.split() for ln in resp.text.strip().splitlines() if ln.strip()]
    if on_or_before:
        rows = [r for r in rows if r[0] <= on_or_before]
    if not rows:
        raise ForbesError(f"no mirror history for {uri}")
    last = rows[-1]
    return {"net_worth_usd": float(last[2]) * 1e6, "as_of": last[0]}


def fetch_net_worths_resilient(uris: set[str]) -> tuple[dict[str, dict], list[str]]:
    """Live feed first, mirror per-person on failure. Returns (data, degraded_uris)."""
    degraded: list[str] = []
    try:
        return fetch_net_worths(uris), degraded
    except Exception:
        out = {}
        for uri in uris:
            try:
                out[uri] = fetch_net_worth_mirror(uri)
                degraded.append(uri)
            except Exception:
                pass  # caller falls back to the committed baseline
        return out, degraded
