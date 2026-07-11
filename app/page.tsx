import LeaderboardTable from "@/components/LeaderboardTable";
import { buildRanking, fmtT } from "@/lib/ranking";

export const revalidate = 900;

export default async function Home() {
  const r = await buildRanking();
  const totalCreated = r.rows.reduce((s, x) => s + Math.max(x.wcfoUsd, 0), 0);
  const updated = new Date(r.asOf);

  return (
    <main id="main">
      <header className="mt-10 mb-8 text-center">
        <p className="font-data text-[0.7rem] uppercase tracking-[0.22em] text-ink-soft">
          “Somebody needs to make a list where they rank people by how much wealth
          they’ve created for <em className="not-italic underline">other</em> people.” — Jeff Bezos, Dec 2024
        </p>
        <h1 className="font-display mt-4 text-5xl leading-none tracking-tight sm:text-7xl">
          The Anti&#8209;Forbes List
        </h1>
        <p className="mt-3 text-lg italic text-ink-soft">
          Ranked by what they built for everyone else.
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
          Each figure is the shareholder wealth a founder’s company created, now held by index
          funds, pensions, employees and co-founders, <em>minus</em> what the founder kept. It’s
          not a claim that one person built the company alone.
        </p>
        <p className="font-data mt-5 text-[0.7rem] uppercase tracking-[0.16em] text-ink-soft">
          {r.rows.length} founders · {fmtT(totalCreated)} created for others ·
          updated {updated.toUTCString().slice(5, 22)} UTC
          {r.degraded && <span className="text-oxide"> · live data delayed, showing daily baseline</span>}
        </p>
      </header>

      <LeaderboardTable rows={r.rows} />

      <p className="font-data mt-6 text-[0.7rem] leading-relaxed text-ink-soft">
        For others = company wealth creation beyond T-bill returns (Bessembinder baseline + live market
        delta), attributed by founding stake, minus the founder’s current net worth. Multiple = created ÷ kept.
        Negative rows are real: those companies have destroyed shareholder wealth since listing.
        Full formula and every caveat: <a href="/methodology" className="underline">methodology v{r.baseline.methodology_version}</a>.
      </p>
    </main>
  );
}
