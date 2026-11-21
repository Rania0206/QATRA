import { useEffect } from "react";
import type { Farm, FarmCompatibility, RuleResult } from "../../api/types";
import TagChip from "../../components/TagChip";
import { fmtNumber } from "../batches/format";
import DecisionBadge from "./DecisionBadge";
import { GROUPS, T, cropLabel, isWho, reason, sortResults, type Lang, type RuleInfo } from "./format";

interface Props {
  farm: Farm;
  result: FarmCompatibility;
  rules: Map<string, RuleInfo>;
  lang: Lang;
  onClose: () => void;
}

function ResultRow({ r, rule, lang }: { r: RuleResult; rule?: RuleInfo; lang: Lang }) {
  const icon = r.passed ? (r.severity === "info" ? "ℹ️" : "✔️") : r.severity === "block" ? "⛔" : "⚠️";
  const tone = r.passed
    ? r.severity === "info"
      ? "border-sky-200 bg-sky-50"
      : "border-slate-200 bg-white"
    : r.severity === "block"
      ? "border-red-300 bg-red-50"
      : "border-orange-300 bg-orange-50";
  return (
    <li className={`flex gap-3 rounded-lg border p-3 ${tone}`}>
      <span aria-hidden="true" className="text-xl leading-6">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base text-slate-900">{reason(r, lang)}</p>
        {isWho(r) && (
          <p className="mt-1 inline-block rounded bg-white px-2 py-0.5 text-sm font-semibold text-red-700 ring-2 ring-red-500">
            {T.who[lang]}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span className="font-mono">{r.rule_id}</span>
          <span>·</span>
          <span>{r.legal_ref}</span>
          {rule && <TagChip tag={rule.tag} showSource={false} />}
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
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-900/40" />
      <aside className="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-slate-50 shadow-2xl">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                {T.batch[lang]} {result.batch_id}
              </p>
              <h3 className="text-2xl font-bold text-slate-900">
                {farm.id} · {farm.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <DecisionBadge decision={result.decision} lang={lang} large />
            <TagChip tag={result.tag} />
          </div>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-base text-slate-700">
            <div>
              <dt className="inline text-slate-500">{T.crop[lang]}: </dt>
              <dd className="inline font-medium">{cropLabel(farm.crop)}</dd>
            </div>
            <div>
              <dt className="inline text-slate-500">{T.area[lang]}: </dt>
              <dd className="inline font-medium">{fmtNumber(farm.area_ha)} ha</dd>
            </div>
            <div>
              <dt className="inline text-slate-500">{T.soil[lang]}: </dt>
              <dd className="inline font-medium">{fmtNumber(farm.soil_ece)} dS/m</dd>
            </div>
            <TagChip tag={farm.tag} showSource={false} />
          </dl>
        </header>

        <div className="space-y-6 p-5">
          {GROUPS.map((g) => {
            const items = sorted.filter((r) => (r.source_type ?? rules.get(r.rule_id)?.source_type) === g.id);
            return (
              <section key={g.id}>
                <h4 className="mb-2 text-lg font-bold text-slate-800">{g[lang]}</h4>
                {items.length === 0 ? (
                  <p className="text-base text-slate-500">{T.noResults[lang]}</p>
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
