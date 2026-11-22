import { useMemo } from "react";
import type { Farm, FarmCompatibility } from "../../api/types";
import { Drawer } from "../../components/ui";
import { fmtNumber } from "../batches/format";
import { DecisionPill } from "./FarmCard";
import {
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

interface Props {
  farm: Farm;
  result: FarmCompatibility;
  rules: Map<string, RuleInfo>;
  lang: Lang;
  onClose: () => void;
}

const MARK: Record<CheckStatus, { symbol: string; cls: string }> = {
  ok: { symbol: "✓", cls: "bg-ok text-white" },
  warn: { symbol: "!", cls: "bg-warn text-white" },
  bad: { symbol: "✕", cls: "bg-bad text-white" },
  info: { symbol: "i", cls: "border border-ink-soft text-ink-soft" },
};

export default function FarmDrawer({ farm, result, rules, lang, onClose }: Props) {
  const params = useMemo(
    () => new Map([...rules.values()].map((r) => [r.rule_id, r.parameter ?? r.rule_id])),
    [rules],
  );
  const checks = plainChecks(result.results, farm.crop, lang, params);
  const sorted = sortResults(result.results);

  return (
    <Drawer
      label={farm.name}
      onClose={onClose}
      closeLabel={T.close[lang]}
      header={
        <div className="space-y-3 pe-14">
          <h2 className="text-3xl">{farm.name.replace(/^Ferme [A-Z] - /, "")}</h2>
          <DecisionPill decision={result.decision} lang={lang} large />
          <p className="text-[16px] text-ink-soft">
            {cropName(farm.crop, lang)} · {fmtNumber(farm.area_ha)} ha · {T.soilSalt[lang]}: {fmtNumber(farm.soil_ece)} dS/m
          </p>
        </div>
      }
    >
      <section>
        <p className="eyebrow">{T.inShort[lang]}</p>
        <p className="mt-2 text-[20px] leading-snug">{mainReason(result.results, lang, farm.crop)}</p>
      </section>

      <section>
        <p className="eyebrow">{T.checked[lang]}</p>
        <ul className="mt-3">
          {checks.map((c) => (
            <li key={c.key} className="flex items-start gap-3 border-b border-line py-3 last:border-0">
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold leading-none ${MARK[c.status].cls}`}
              >
                {MARK[c.status].symbol}
              </span>
              <span className={`text-[17px] leading-snug ${c.status === "bad" ? "text-bad" : c.status === "warn" ? "text-warn" : ""}`}>
                {c.text}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <details className="group border-t border-line pt-4">
        <summary className="cursor-pointer list-none text-[16px] font-medium underline underline-offset-4">
          {T.legal[lang]} <span className="inline-block transition-transform group-open:rotate-90">›</span>
        </summary>
        <p className="mt-2 text-[15px] text-ink-soft">
          {T.batch[lang]} {result.batch_id}
          {T.legalNote[lang] && <> · {T.legalNote[lang]}</>}
        </p>
        <ul className="mt-3 space-y-3 text-[15px]">
          {sorted.map((r) => (
            <li key={r.rule_id} className="border-b border-line pb-3 last:border-0">
              <p className={r.passed ? "" : r.severity === "block" ? "text-bad" : "text-warn"}>{reason(r, lang)}</p>
              {isWho(r) && <p className="text-bad">{T.who[lang]}</p>}
              <p className="text-ink-soft">{r.legal_ref}</p>
            </li>
          ))}
        </ul>
      </details>
    </Drawer>
  );
}
