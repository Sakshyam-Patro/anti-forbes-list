"use client";

import Link from "next/link";
import { useState } from "react";
import type { RankedFounder } from "@/lib/ranking";

function money(usd: number): string {
  const abs = Math.abs(usd);
  if (abs >= 0.9995e12) return `${usd < 0 ? "−" : ""}$${(abs / 1e12).toFixed(2)}T`;
  return `${usd < 0 ? "−" : ""}$${(abs / 1e9).toFixed(0)}B`;
}

export default function LeaderboardTable({ rows }: { rows: RankedFounder[] }) {
  const [strict, setStrict] = useState(false);
  const sorted = [...rows].sort((a, b) =>
    strict ? b.wcfoStrictUsd - a.wcfoStrictUsd : b.wcfoUsd - a.wcfoUsd,
  );

  return (
    <section>
      <div className="font-data mb-2 flex items-center justify-end gap-2 text-[0.7rem] uppercase tracking-[0.14em] text-ink-soft">
        <button
          onClick={() => setStrict(false)}
          aria-pressed={!strict}
          className={`border-b pb-0.5 ${!strict ? "border-ink text-ink" : "border-transparent hover:text-ink"}`}
        >
          Headline
        </button>
        <span aria-hidden>/</span>
        <button
          onClick={() => setStrict(true)}
          aria-pressed={strict}
          className={`border-b pb-0.5 ${strict ? "border-ink text-ink" : "border-transparent hover:text-ink"}`}
          title="Re-ranks with lifetime giving counted as kept (Methodology §5)"
        >
          Strict creation
        </button>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="rule-double font-data text-[0.68rem] uppercase tracking-[0.16em] text-ink-soft">
            <th className="py-2.5 pr-2 text-left font-medium">#</th>
            <th className="py-2.5 pr-4 text-left font-medium">Founder</th>
            <th className="py-2.5 pr-4 text-right font-medium text-ledger">For others</th>
            <th className="hidden py-2.5 pr-4 text-right font-medium text-oxide sm:table-cell">Kept</th>
            <th className="hidden py-2.5 pr-4 text-right font-medium md:table-cell" title="Share of the wealth they created that they kept for themselves. Lower means more went to others.">Kept of total</th>
            <th className="hidden py-2.5 text-right font-medium md:table-cell">Given away</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const v = strict ? r.wcfoStrictUsd : r.wcfoUsd;
            const first = i === 0;
            return (
              <tr
                key={r.slug}
                className="rise border-t border-rule align-baseline hover:bg-paper-deep"
                style={{ animationDelay: `${Math.min(i * 35, 700)}ms` }}
              >
                <td className={`font-display py-3 pr-2 ${first ? "text-3xl" : "text-lg"} text-ink-soft`}>
                  {i + 1}
                </td>
                <td className="py-3 pr-4">
                  <Link
                    href={`/founder/${r.slug}`}
                    className={`font-display leading-tight hover:underline ${first ? "text-3xl sm:text-4xl" : "text-xl"}`}
                  >
                    {r.name}
                  </Link>
                  {r.inherited && (
                    <span className="font-data ml-2 align-middle text-[0.62rem] uppercase tracking-[0.14em] text-oxide">
                      heirs
                    </span>
                  )}
                  <div className="font-data mt-0.5 text-[0.68rem] text-ink-soft">
                    {r.companies.map((c) => c.ticker).join(" · ")}
                  </div>
                </td>
                <td className={`font-data py-3 pr-4 text-right ${first ? "text-2xl sm:text-3xl" : "text-base"} ${v < 0 ? "text-oxide" : "text-ledger"}`}>
                  {money(v)}
                </td>
                <td className="font-data hidden py-3 pr-4 text-right text-sm text-ink-soft sm:table-cell">
                  {money(r.keptUsd)}
                </td>
                <td className="font-data hidden py-3 pr-4 text-right text-sm text-ink-soft md:table-cell">
                  {r.keptShare === null
                    ? "—"
                    : `${(r.keptShare * 100).toFixed(r.keptShare < 0.1 ? 1 : 0)}%`}
                </td>
                <td className="font-data hidden py-3 text-right text-sm text-ink-soft md:table-cell">
                  {r.givingUsd ? money(r.givingUsd) : "·"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
