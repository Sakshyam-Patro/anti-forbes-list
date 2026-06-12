import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Newsreader } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
});
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", style: ["normal", "italic"] });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3741"),
  title: "The Anti-Forbes List — ranked by wealth created for others",
  description:
    "Jeff Bezos asked for a list that ranks people by how much wealth they've created for other people. This is that list — every number traceable to an SEC filing, updated every 15 minutes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${newsreader.variable} ${plexMono.variable}`}>
      <body className="mx-auto max-w-5xl px-4 sm:px-8">
        <a
          href="#main"
          className="font-data sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
        >
          Skip to the list
        </a>
        <nav className="font-data flex items-baseline justify-between pt-5 text-[0.72rem] uppercase tracking-[0.18em] text-ink-soft">
          <Link href="/" className="hover:text-ink">The Anti-Forbes List</Link>
          <span className="flex gap-5">
            <Link href="/methodology" className="hover:text-ink">Methodology</Link>
            <Link href="/about" className="hover:text-ink">About</Link>
          </span>
        </nav>
        {children}
        <footer className="rule-double font-data mt-16 mb-8 pt-4 text-[0.7rem] leading-relaxed text-ink-soft">
          <p>
            Wealth-creation baseline: H. Bessembinder, ASU W.P. Carey (1926–2025) · ownership: SEC EDGAR ·
            net worth: Forbes Real-Time Billionaires · not affiliated with Forbes.
          </p>
          <p className="mt-1">
            Every number is cited. Corrections and new-founder data welcome by pull request.
          </p>
        </footer>
      </body>
    </html>
  );
}
