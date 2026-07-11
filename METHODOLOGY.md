# Methodology

**Version 1.1.0** · Baseline: December 31, 2025 · [Changelog](#changelog)

> *"Somebody needs to make a list where they rank people by how much wealth they've created for other people, instead of the Forbes list that ranks you by your own wealth."*
> — Jeff Bezos, New York Times DealBook Summit, December 2024

This list ranks founders by **Wealth Created For Others (WCFO)**: the dollar value their companies generated for shareholders *other than themselves*. Every number is traceable to an SEC filing, a named academic dataset, or a named data API. This document is the single source of truth for how the numbers are computed; the code implements this document, not the other way around.

---

## §1 The headline formula

```
WCFO(founder) = Σ over companies [ w_fc × CWC_c(t) ] − Kept_f
```

| Term | Meaning | Source |
|---|---|---|
| `CWC_c(t)` | Company wealth creation: total wealth the company generated for all shareholders, from listing through now | Bessembinder baseline + live market delta (§2) |
| `w_fc` | Founder f's attribution weight for company c | Founding-stake normalization (§4) |
| `Kept_f` | Wealth the founder kept for themselves | Forbes real-time net worth (§3) |

A founder's score is the wealth their companies created, attributed by founding share, minus what they personally hold today. **Negative or small values are never clamped or hidden** — if the formula produces an unflattering number, it ships with an explanation.

## §2 Company wealth creation — CWC

```
CWC_c(t) = B_c + ( MarketCap_c(t) − MarketCap_c(t₀) )
```

- **`B_c`** — lifetime **shareholder wealth creation** through `t₀` = 2025-12-31, from Hendrik Bessembinder's dataset (*"Wealth Creation in the U.S. Public Stock Markets,"* ASU W.P. Carey; 100-year file published March 2026). This is the academically rigorous component: it measures dollar wealth created **in excess of one-month T-bill returns**, and properly accounts for dividends, share issuance, and buybacks across the company's entire listed life.
- **Live delta** — `MarketCap(t) = price(t) × shares outstanding`, where shares outstanding come from SEC EDGAR XBRL (`dei:EntityCommonStockSharesOutstanding`) and price comes from a market data API. Updated approximately every 15 minutes during US market hours.

**Documented approximation:** the live delta is a raw market-cap change. It ignores post-baseline dividends, buybacks, issuance, and the T-bill hurdle until the next annual rebaseline (when ASU publishes the next dataset). For the companies on this list the drift is bounded at roughly 1–3% of CWC per year. The baseline date is always displayed.

**Why net-of-T-bills matters:** a company that merely matched risk-free returns created nothing extra for anyone. Bessembinder's measure counts only wealth created *beyond* that bar, which makes the headline number conservative and defensible.

**IPO entry rule:** a company enters the universe when it lists, and its wealth creation is measured **from listing onward** — uniformly, for every company. Value built while private is real but is not public-market wealth creation and is not in the headline (Amazon's pre-1997 value is excluded on the same terms as SpaceX's pre-2026 value). Profiles of recently-listed companies show a clearly-labeled context line — *"value at IPO held by shareholders other than the founder"* — computed from the prospectus stake and listing-day capitalization, outside the headline. Newly-listed companies use `B_c = 0` with the live delta measured from listing-day close until they appear in the next annual Bessembinder file.

## §3 Wealth kept — Kept

`Kept_f` = the founder's **Forbes real-time net worth**, refreshed approximately every 15 minutes (archival history via the komed3/rtb-api mirror of Forbes data).

**Documented caveats:**
1. Net worth includes assets unrelated to the ranked companies (real estate, diversified portfolios, other ventures). Using the full figure makes WCFO **conservative** — it subtracts more than strictly "kept from this company."
2. For founders who sold down over decades (Gates), net worth embeds investment returns on sale proceeds, further overstating "kept" and understating WCFO.
3. Forbes' figures are themselves estimates.

For transparency, each profile also shows the **strict stake value** — `current ownership % × market cap` — derived purely from SEC filings, so readers can compare both definitions.

## §4 The co-founder rule (no double counting)

A naive `market cap − stake` calculation credits *each* co-founder with the *entire* company. Summed across Larry Page and Sergey Brin, Alphabet's wealth would be counted twice. (At least one prior site makes exactly this error.)

Here, each tracked founder gets an **attribution weight** `w_fc`: their beneficial ownership at IPO, taken from the S-1/424B prospectus (a citable document), **normalized so that weights per company sum to 1.0** across tracked founders.

- Sole tracked founder → `w = 1.0` (Bezos/Amazon).
- Page & Brin held near-equal stakes at Google's 2004 IPO → `0.5 / 0.5`. The leaderboard renders them as a paired row with the joint figure, expandable to individual attributions.
- **Conservation property (unit-tested):** for every company, Σ `w_fc` = 1.0, so summing WCFO across a company's tracked founders yields exactly `CWC − Σ Kept` — the others' pool is counted once.

**Documented limitation:** weights normalize over *tracked* founders only. Untracked co-founders (e.g. Paul Allen at Microsoft, NVIDIA's Chris Malachowsky and Curtis Priem, Tesla's pre-Musk founders) are treated as part of "others," which slightly overstates a tracked founder's WCFO. Each company's founding roster and who is tracked is recorded in the curated data (`data/curated/`). The roster expands over time.

## §5 Special cases

- **Warren Buffett** — Berkshire shares he has donated now belong to foundations — i.e., to "others." The headline therefore **counts philanthropy as wealth created for others**: we subtract only what a founder currently holds, so donated wealth sits where it factually sits. Because *creating* wealth and *giving it away* are different mechanisms, every founder also carries a curated, cited **"given away"** figure, and the site offers a **strict-creation toggle** that re-ranks with lifetime giving counted as kept. (Empirically the toggle moves Buffett visibly and Gates by only a few percent — both views are shown rather than argued.) Note also Buffett *acquired* Berkshire (1965) rather than founding it; he is tracked as its builder, and the Bessembinder window (1976–) reflects CRSP data coverage.
- **Bill Gates** — decades of stake sales mean his `Kept` includes returns on reinvested proceeds. His profile shows the curated ownership-history timeline (proxy citations per era) and the strict stake value alongside.
- **Walton family** — the deliberate **control case**, flagged `inherited`. Aggregated as one entry: `CWC(WMT) − Σ family net worths`. The metric should — and does — distinguish *creating* wealth from *holding* it.
- **Elon Musk** — tracked for Tesla and, **as of its June 12, 2026 Nasdaq listing (SPCX), SpaceX**. Per the IPO entry rule, SpaceX's wealth creation accrues from listing day; the ~$1.75T built while private appears only as the labeled context line (others' share of IPO-day capitalization). His `Kept` includes stakes in still-private ventures (xAI) while his CWC does not — conservative, and stated. Musk joined Tesla at its Series A rather than incorporation, and SpaceX he founded outright; each company page documents the founding roster.

## §6 Validation pledge

The pipeline permanently asserts that it reproduces **Jeff Bezos's own ~$2.1T claim** (Dec 2024) within ±20%, using the Dec 2024 Bessembinder baseline and his Dec 31, 2024 Forbes net worth. The worked example:

```
CWC(Amazon, Dec 2024)  =  $2.154T     (Bessembinder 2024 file)
Kept(Bezos, Dec 2024)  =  $0.233T     (Forbes RTB, 2024-12-31, archival)
WCFO                   =  $1.92T      → within 8.5% of Bezos's $2.1T claim ✓
```

The two figures use different definitions (Bezos used raw market cap × outside ownership; we use net-of-T-bill wealth creation minus kept wealth) — their convergence is evidence the metric is measuring the right thing.

## §7 What this list is not

- Not a measure of consumer surplus, wages, or societal value beyond shareholders (those are larger still — Nordhaus estimates innovators capture only ~2.2% of the social surplus they create — but they are not reliably measurable per person, so we do not headline them).
- Not a moral scoreboard. It measures one thing: dollars of shareholder wealth created beyond a risk-free benchmark, minus dollars kept.
- Not affiliated with Forbes or with any prior ranking site.

## Changelog

- **1.1.0** (2026-06-12) — added the IPO entry rule (creation measured from listing, uniformly; prompted by SpaceX's SPCX listing this day) and the philanthropy treatment (headline counts current holdings only; curated "given away" figures + strict-creation toggle).
- **1.0.0** (2026-06-12) — frozen after Phase 0 validation: Bezos gate passed at 8.5% deviation; co-founder conservation property verified for Page/Brin.
- **0.9.0** (2026-06-12) — initial draft for Phase 0 validation.
