import { marked } from "marked";
import { loadMethodology } from "@/lib/data";

export const metadata = { title: "Methodology — The Anti-Forbes List" };

export default function MethodologyPage() {
  const html = marked.parse(loadMethodology(), { async: false });
  return (
    <main className="mt-10">
      <article
        className="prose-afl mx-auto max-w-3xl"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <style>{`
        .prose-afl h1 { font-family: var(--font-display); font-size: 2.6rem; line-height: 1.1; letter-spacing: -0.01em; }
        .prose-afl h2 { font-family: var(--font-display); font-size: 1.6rem; margin-top: 2.2rem; border-top: 1px solid var(--color-ink); padding-top: 1rem; }
        .prose-afl p, .prose-afl li { margin-top: 0.7rem; }
        .prose-afl blockquote { font-style: italic; border-left: 2px solid var(--color-rule); padding-left: 1rem; color: var(--color-ink-soft); margin-top: 1rem; }
        .prose-afl code, .prose-afl pre { font-family: var(--font-data); font-size: 0.85em; background: var(--color-paper-deep); }
        .prose-afl pre { padding: 0.9rem 1rem; overflow-x: auto; margin-top: 0.8rem; }
        .prose-afl table { width: 100%; border-collapse: collapse; margin-top: 0.8rem; font-family: var(--font-data); font-size: 0.82rem; }
        .prose-afl th, .prose-afl td { border-top: 1px solid var(--color-rule); padding: 0.45rem 0.6rem 0.45rem 0; text-align: left; vertical-align: top; }
        .prose-afl a { text-decoration: underline; }
        .prose-afl ul { list-style: disc; padding-left: 1.3rem; }
        .prose-afl strong { font-weight: 600; }
      `}</style>
    </main>
  );
}
