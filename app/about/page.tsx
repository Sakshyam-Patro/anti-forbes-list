export const metadata = { title: "About — The Anti-Forbes List" };

export default function AboutPage() {
  return (
    <main className="mx-auto mt-10 max-w-3xl">
      <h1 className="font-display text-5xl tracking-tight">About</h1>

      <p className="mt-6">
        At the December 2024 New York Times DealBook Summit, Jeff Bezos said:
      </p>
      <blockquote className="mt-4 border-l-2 border-rule pl-5 text-xl italic leading-relaxed text-ink-soft">
        “Somebody needs to make a list where they rank people by how much wealth
        they’ve created for <em>other</em> people, instead of the Forbes list that
        ranks you by your own wealth.”
      </blockquote>
      <p className="mt-4">
        Nobody made it properly. So this is that list: every number traceable to an
        SEC filing, an academic dataset, or a named data source — refreshed every
        fifteen minutes while markets are open.
      </p>

      <h2 className="font-display mt-10 border-t border-ink pt-4 text-2xl">How it works</h2>
      <p className="mt-3">
        Company wealth creation comes from Hendrik Bessembinder’s research dataset
        (Arizona State University), which measures dollar wealth generated for
        shareholders beyond Treasury-bill returns since 1926 — then a live market
        delta brings it to the current quarter-hour. From each founder’s attributed
        share we subtract what they kept: their live Forbes net worth. What remains
        is wealth that exists in other people’s hands because that founder built
        something.
      </p>

      <h2 className="font-display mt-10 border-t border-ink pt-4 text-2xl">Corrections</h2>
      <p className="mt-3">
        The data layer is plain YAML with a citation required on every number, and
        continuous integration rejects anything uncited. Found an error, or want a
        founder added? Open an issue or a pull request — the repository link is in
        the footer of every page.
      </p>

      <p className="font-data mt-10 text-[0.7rem] uppercase tracking-[0.16em] text-ink-soft">
        Not affiliated with Forbes, Amazon, or any listed company.
      </p>
    </main>
  );
}
