import { useMemo } from "react";
import type { Decision, Farm, FarmCompatibility } from "../../api/types";
import { fmtNumber } from "../batches/format";
import {
  DECISION,
  T,
  cropName,
  isWho,
  mainReason,
  plainChecks,
  reason,
  sortResults,
  type CheckStatus,
  type Lang,
  type RuleInfo,
} from "./format";

/** Solid status colour + symbol, so the verdict reads from across the room. */
const VERDICT: Record<Decision, { bg: string; symbol: string }> = {
  compatible: { bg: "bg-ok", symbol: "✓" },
  conditional: { bg: "bg-warn", symbol: "!" },
  blocked: { bg: "bg-bad", symbol: "✕" },
};

const MARK: Record<CheckStatus, { symbol: string; cls: string }> = {
  ok: { symbol: "✓", cls: "bg-ok text-white" },
  warn: { symbol: "!", cls: "bg-warn text-white" },
  bad: { symbol: "✕", cls: "bg-bad text-white" },
  info: { symbol: "i", cls: "border border-ink-soft text-ink-soft" },
};

interface Props {
  farm: Farm;
  result: FarmCompatibility;
  rules: Map<string, RuleInfo>;
  lang: Lang;
  onChange?: () => void; // farmer view only: "Not your farm? Change"
  label?: string; // eyebrow above the farm name (default "Your farm")
}

/** One farm only: big verdict, one plain reason, short checklist, legal details on demand. */
export default function MyFarm({ farm, result, rules, lang, onChange, label }: Props) {
  const params = useMemo(() => new Map([...rules.values()].map((r) => [r.rule_id, r.parameter ?? r.rule_id])), [rules]);
  const checks = plainChecks(result.results, farm.crop, lang, params);
  const sorted = sortResults(result.results);
  const v = VERDICT[result.decision];

  return (
    <article className="fade-up mx-auto max-w-2xl border border-line bg-white">
      <div className={`flex items-center gap-3 px-6 py-4 font-display text-[length:calc(26px*var(--fs)*var(--fsn))] font-medium text-white ${v.bg}`}>
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white text-[length:calc(18px*var(--fs))] leading-none"
        >
          {v.symbol}
        </span>
        {DECISION[result.decision][lang]}
      </div>

      <div className="space-y-8 px-6 py-7">
        <header>
          <p className="eyebrow">{label ?? T.yourFarm[lang]}</p>
          <h2 className="mt-1 text-4xl">{farm.name.replace(/^Ferme [A-Z] - /, "")}</h2>
          <p className="mt-1 text-[length:calc(16px*var(--fs))] text-ink-soft">
            {cropName(farm.crop, lang)} · {fmtNumber(farm.area_ha)} ha · {T.soilSalt[lang]}: {fmtNumber(farm.soil_ece)} dS/m
          </p>
        </header>

        <section>
          <p className="eyebrow">{T.inShort[lang]}</p>
          <p className="mt-2 text-[length:calc(21px*var(--fs))] leading-snug">{mainReason(result.results, lang, farm.crop)}</p>
        </section>

        <section>
          <p className="eyebrow">{T.checked[lang]}</p>
          <ul className="mt-3">
            {checks.map((c) => (
              <li key={c.key} className="flex items-start gap-3 border-b border-line py-3 last:border-0">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[length:calc(13px*var(--fs))] font-semibold leading-none ${MARK[c.status].cls}`}
                >
                  {MARK[c.status].symbol}
                </span>
                <span className={`text-[length:calc(17px*var(--fs))] leading-snug ${c.status === "bad" ? "text-bad" : c.status === "warn" ? "text-warn" : ""}`}>
                  {c.text}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <details className="group border-t border-line pt-4">
          <summary className="cursor-pointer list-none text-[length:calc(16px*var(--fs))] font-medium underline underline-offset-4">
            {T.legal[lang]} <span className="inline-block transition-transform group-open:rotate-90">›</span>
          </summary>
          <p className="mt-2 text-[length:calc(15px*var(--fs))] text-ink-soft">
            {T.batch[lang]} <span dir="ltr">{result.batch_id}</span>
            {T.legalNote[lang] && <> · {T.legalNote[lang]}</>}
          </p>
          <ul className="mt-3 space-y-3 text-[length:calc(15px*var(--fs))]">
            {sorted.map((r) => (
              <li key={r.rule_id} className="border-b border-line pb-3 last:border-0">
                <p className={r.passed ? "" : r.severity === "block" ? "text-bad" : "text-warn"}>{reason(r, lang)}</p>
                {isWho(r) && <p className="text-bad">{T.who[lang]}</p>}
                <p className="text-ink-soft">{r.legal_ref}</p>
              </li>
            ))}
          </ul>
        </details>

        {onChange && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-[length:calc(15px*var(--fs))]">
            <span className="text-ink-soft">{T.privacy[lang]}</span>
            <button type="button" onClick={onChange} className="link">
              {T.change[lang]}
            </button>
          </footer>
        )}
      </div>
    </article>
  );
}
