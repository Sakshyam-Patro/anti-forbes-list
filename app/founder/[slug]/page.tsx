import Link from "next/link";
import { notFound } from "next/navigation";
import { buildRanking } from "@/lib/ranking";
import { loadFounders } from "@/lib/data";

export const revalidate = 900;

export function generateStaticParams() {
  return Object.keys(loadFounders()).map((slug) => ({ slug }));
}

function money(usd: number): string {
  const abs = Math.abs(usd);
  if (abs >= 0.9995e12) return `${usd < 0 ? "−" : ""}$${(abs / 1e12).toFixed(3)}T`;
  if (abs >= 1e9) return `${usd < 0 ? "−" : ""}$${(abs / 1e9).toFixed(1)}B`;
  return `${usd < 0 ? "−" : ""}$${(abs / 1e6).toFixed(0)}M`;
}

export default async function FounderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await buildRanking();
  const idx = r.rows.findIndex((x) => x.slug === slug);
  if (idx === -1) notFound();
  const row = r.rows[idx];
  const f = r.founders[slug];

  const citations: { id: number; url: string; label: string }[] = [];
  const cite = (url: string, label: string): number => {
    const existing = citations.find((c) => c.url === url);
    if (existing) return existing.id;
    const id = citations.length + 1;
    citations.push({ id, url, label });
    return id;
  };

  const created = row.wcfoUsd + row.keptUsd;

  return (
    <main className="mt-10">
      <p className="font-data text-[0.7rem] uppercase tracking-[0.18em] text-ink-soft">
        Rank {idx + 1} of {r.rows.length}
        {row.inherited && " · heirs"}
      </p>
      <h1 className="font-display mt-1 text-5xl tracking-tight sm:text-6xl">{row.name}</h1>

      {/* the derivation, as visible arithmetic */}
      <div className="rule-double mt-8 pt-5">
        <div className="font-data grid grid-cols-1 gap-2 text-base sm:grid-cols-[auto_1fr] sm:gap-x-6">
          {row.companies.map((c) => {
            const link = f.companies.find((l) => l.company === c.slug)!;
            const n = cite(link.weight_source.url, `Attribution weight — ${link.weight_source.note ?? "source"}`);
            return (
              <div key={c.slug} className="contents">
                <span className="text-ink-soft">
                  {c.weight !== 1 ? `${c.weight} × ` : ""}wealth created by {c.name}
                  <a href={`#src-${n}`} className="citation-sup">{n}</a>
                </span>
                <span className="text-ledger sm:text-right">{money(c.cwcUsd * c.weight)}</span>
              </div>
            );
          })}
          <span className="text-ink-soft">
            − kept ({row.keptSource}
            {f.status === "family-aggregate" ? ", family aggregate" : ""})
          </span>
          <span className="text-oxide sm:text-right">−{money(row.keptUsd)}</span>
          <span className="border-t border-ink pt-2 font-medium">created for others</span>
          <span className={`border-t border-ink pt-2 text-2xl font-semibold sm:text-right ${row.wcfoUsd < 0 ? "text-oxide" : "text-ledger"}`}>
            {money(row.wcfoUsd)}
          </span>
        </div>
        <p className="font-data mt-3 text-[0.7rem] text-ink-soft">
          Created {money(created)} in total
          {row.keptShare !== null && <> · kept {(row.keptShare * 100).toFixed(row.keptShare < 0.1 ? 1 : 0)}% of it</>}
          {row.givingUsd ? <> · has given away {money(row.givingUsd)}{f.giving && <a href={`#src-${cite(f.giving.source.url, `Lifetime giving — ${f.giving.basis}`)}`} className="citation-sup">{cite(f.giving.source.url, "")}</a>}</> : null}
        </p>
      </div>

      {/* ownership */}
      {f.companies.some((l) => l.ownership_history?.length) && (
        <section className="mt-10">
          <h2 className="font-display text-2xl">Stake, per the filings</h2>
          <table className="mt-3 w-full border-collapse">
            <thead>
              <tr className="font-data border-t border-ink text-[0.68rem] uppercase tracking-[0.16em] text-ink-soft">
                <th className="py-2 text-left font-medium">Company</th>
                <th className="py-2 text-right font-medium">Ownership</th>
                <th className="py-2 text-right font-medium">As of</th>
                <th className="py-2 text-right font-medium">Strict stake value</th>
              </tr>
            </thead>
            <tbody>
              {f.companies.flatMap((l) =>
                (l.ownership_history ?? []).map((o) => {
                  const n = cite(o.source.url, `Beneficial ownership of ${r.companies[l.company].name}, ${o.as_of}`);
                  const cap = r.companyStates[l.company].capNowUsd;
                  return (
                    <tr key={`${l.company}-${o.as_of}`} className="font-data border-t border-rule text-sm">
                      <td className="py-2">
                        {r.companies[l.company].ticker}
                        <a href={`#src-${n}`} className="citation-sup">{n}</a>
                      </td>
                      <td className="py-2 text-right">{(o.pct_outstanding * 100).toFixed(2)}%</td>
                      <td className="py-2 text-right text-ink-soft">{o.as_of}</td>
                      <td className="py-2 text-right" title={l.stake_of_listed_class === false ? "Ownership is of unlisted units / deemed-beneficial holdings, so % × public market cap is not a valid dollar figure" : undefined}>
                        {l.stake_of_listed_class === false ? "n/m*" : money(o.pct_outstanding * cap)}
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
          {f.companies.some((l) => l.stake_of_listed_class === false) && (
            <p className="font-data mt-2 text-[0.68rem] text-ink-soft">
              * not meaningful: the recorded ownership is of unlisted partnership units or
              deemed-beneficial holdings, so multiplying it by the public market cap would
              overstate the stake. See “Stated plainly” below.
            </p>
          )}
        </section>
      )}

      {/* caveats */}
      {(f.special_notes?.length || f.giving) && (
        <section className="mt-10">
          <h2 className="font-display text-2xl">Stated plainly</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[1rem] leading-relaxed">
            {f.giving && <li>{f.giving.basis}</li>}
            {f.special_notes?.map((nte, i) => <li key={i}>{nte}</li>)}
          </ul>
        </section>
      )}

      {/* sources panel */}
      <section className="mt-10">
        <h2 className="font-display text-2xl">Sources</h2>
        <ol className="font-data mt-3 space-y-2 text-[0.78rem] leading-relaxed">
          {citations.map((c) => (
            <li key={c.id} id={`src-${c.id}`} className="flex gap-2">
              <span className="text-oxide">{c.id}.</span>
              <span>
                {c.label}{" "}
                <a href={c.url} className="break-all text-ink-soft underline" rel="noopener noreferrer" target="_blank">
                  {new URL(c.url).hostname}{new URL(c.url).pathname.slice(0, 60)}
                </a>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <p className="font-data mt-10 text-[0.7rem] text-ink-soft">
        <Link href="/" className="underline">← Full list</Link> · prices {r.companyStates[row.companies[0].slug].priceSource} ·
        net worth {row.keptSource} · methodology v{r.baseline.methodology_version}
      </p>
    </main>
  );
}
