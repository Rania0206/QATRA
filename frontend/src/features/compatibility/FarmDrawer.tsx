import { useEffect } from "react";
import type { Farm, FarmCompatibility, RuleResult } from "../../api/types";
import TagChip from "../../components/TagChip";
import { fmtNumber } from "../batches/format";
import DecisionBadge from "./DecisionBadge";
import { Dot } from "../batches/ui";
import { GROUPS, T, cropLabel, isWho, reason, sortResults, type Lang, type RuleInfo } from "./format";

interface Props {
  farm: Farm;
  result: FarmCompatibility;
  rules: Map<string, RuleInfo>;
  lang: Lang;
  onClose: () => void;
}

function ResultRow({ r, rule, lang }: { r: RuleResult; rule?: RuleInfo; lang: Lang }) {
  const failed = !r.passed;
  const tone = r.passed ? "ink" : r.severity === "block" ? "bad" : "warn";
  const edge = failed ? (r.severity === "block" ? "var(--q-bad)" : "var(--q-warn)") : "var(--q-ink)";
  return (
    <li
      className="q-card flex gap-3 p-4"
      style={failed ? { borderColor: edge, boxShadow: `inset 3px 0 0 ${edge}` } : undefined}
    >
      <span className="pl-1 pt-2">
        {r.passed && r.severity !== "info" ? (
          <span aria-hidden="true" className="text-[var(--q-ok)]">✓</span>
        ) : (
          <Dot tone={tone} />
        )}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className={`text-base leading-snug ${failed ? "font-medium" : ""}`}>{reason(r, lang)}</p>
        {isWho(r) && (
          <p
            className="q-label inline-block rounded-[2px] border px-2 py-0.5"
            style={{ borderColor: "var(--q-bad)", color: "var(--q-bad)" }}
          >
            {T.who[lang]}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-base">
          <span className="font-medium">{r.legal_ref}</span>
          {rule && <TagChip tag={rule.tag} showSource={false} />}
          <span className="q-label">{r.rule_id}</span>
        </div>
      </div>
    </li>
  );
}

export default function FarmDrawer({ farm, result, rules, lang, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sorted = sortResults(result.results);
  return (
    <div className="fixed inset-0 z-[1100] flex justify-end" role="dialog" aria-modal="true" aria-label={farm.name}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[var(--q-ink)]/40" />
      <aside className="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l border-[var(--q-line)] bg-[var(--q-cream)]">
        <header className="sticky top-0 z-10 space-y-3 border-b border-[var(--q-line)] bg-[var(--q-paper)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <span className="q-display flex h-14 w-14 shrink-0 items-center justify-center rounded-[2px] border border-[var(--q-line)] bg-[var(--q-cream)] text-4xl">
                {farm.id}
              </span>
              <div>
                <p className="q-label">
                  {T.batch[lang]} <span className="q-mono">{result.batch_id}</span>
                </p>
                <h3 className="q-display text-3xl">{farm.name}</h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="q-btn !px-3 !py-1 text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DecisionBadge decision={result.decision} lang={lang} size="lg" />
            <TagChip tag={result.tag} showSource={false} />
          </div>
          <dl className="flex flex-wrap items-center gap-x-6 gap-y-1 text-base">
            <div>
              <dt className="inline text-[var(--q-ink-2)]">{T.crop[lang]}: </dt>
              <dd className="q-mono inline font-medium">
                {cropLabel(farm.crop)}
              </dd>
            </div>
            <div>
              <dt className="inline text-[var(--q-ink-2)]">{T.area[lang]}: </dt>
              <dd className="q-mono inline font-medium">{fmtNumber(farm.area_ha)} ha</dd>
            </div>
            <div>
              <dt className="inline text-[var(--q-ink-2)]">{T.soil[lang]}: </dt>
              <dd className="q-mono inline font-medium">{fmtNumber(farm.soil_ece)} dS/m</dd>
            </div>
            <TagChip tag={farm.tag} showSource={false} />
          </dl>
        </header>

        <div className="space-y-6 p-5">
          {GROUPS.map((g) => {
            const items = sorted.filter((r) => (r.source_type ?? rules.get(r.rule_id)?.source_type) === g.id);
            return (
              <section key={g.id} className="q-dash space-y-3 pt-4 first:border-t-0 first:pt-0">
                <h4 className="q-title">{g[lang]}</h4>
                {items.length === 0 ? (
                  <p className="text-base">{T.noResults[lang]}</p>
                ) : (
                  <ul className="space-y-2">
                    {items.map((r) => (
                      <ResultRow key={r.rule_id} r={r} rule={rules.get(r.rule_id)} lang={lang} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
