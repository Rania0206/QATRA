import type { Lang } from "../../i18n";
import { A, warningText } from "./texts";

/** Small note list (server warnings) and the "demo data" line with the link to Sources. */
export function Notes({ warnings, lang }: { warnings: string[]; lang: Lang }) {
  if (!warnings.length) return null;
  return (
    <section className="mx-auto mt-10 max-w-2xl border-t border-line pt-5" aria-label={A.notes[lang]}>
      <p className="eyebrow">{A.notes[lang]}</p>
      <ul className="mt-3 space-y-2 text-[length:calc(15px*var(--fs))] leading-snug">
        {warnings.map((w) => (
          <li key={w} className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>{warningText(w, lang)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DemoTag({ lang }: { lang: Lang }) {
  return (
    <p className="mx-auto mt-8 max-w-2xl text-center text-[length:calc(15px*var(--fs))] text-ink-soft">
      {A.demoTag[lang]} ·{" "}
      <a href="#/public" className="link">
        {A.sources[lang]}
      </a>
    </p>
  );
}
