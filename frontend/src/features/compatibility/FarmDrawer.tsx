import type { Farm, FarmCompatibility, RuleResult } from "../../api/types";
import TagChip from "../../components/TagChip";
import { Dot, Drawer } from "../../components/ui";
import { fmtNumber } from "../batches/format";
import { DecisionPill } from "./FarmCard";
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
  const tone = r.passed ? "neutral" : r.severity === "block" ? "bad" : "warn";
  return (
    <li className={`flex gap-4 border-b border-line py-4 last:border-0 ${failed ? "" : ""}`}>
      <span className="pt-2">
        {r.passed && r.severity !== "info" ? <span aria-hidden="true" className="font-mono text-ok">✓</span> : <Dot tone={tone} />}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className={failed ? (r.severity === "block" ? "text-bad" : "text-warn") : ""}>{reason(r, lang)}</p>
        {isWho(r) && <p className="inline-block border border-bad px-2 py-0.5 font-mono text-[15px] text-bad">{T.who[lang]}</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="font-medium">{r.legal_ref}</span>
          {rule && <TagChip tag={rule.tag} showSource={false} />}
          <span className="font-mono text-[15px] text-ink-soft">{r.rule_id}</span>
        </div>
      </div>
    </li>
  );
}

export default function FarmDrawer({ farm, result, rules, lang, onClose }: Props) {
  const sorted = sortResults(result.results);
  return (
    <Drawer
      label={farm.name}
      onClose={onClose}
      header={
        <div className="space-y-4 pr-16">
          <p className="eyebrow">
            {T.batch[lang]} {result.batch_id}
          </p>
          <h2 className="text-4xl">
            <span className="mr-3 italic">{farm.id}.</span>
            {farm.name.replace(/^Ferme [A-Z] - /, "")}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <DecisionPill decision={result.decision} lang={lang} large />
            <TagChip tag={result.tag} showSource={false} />
          </div>
          <p className="font-mono text-[15px]">
            {T.crop[lang]}: {cropLabel(farm.crop)} · {T.area[lang]}: {fmtNumber(farm.area_ha)} ha · {T.soil[lang]}:{" "}
            {fmtNumber(farm.soil_ece)} dS/m <TagChip tag={farm.tag} showSource={false} />
          </p>
        </div>
      }
    >
      {GROUPS.map((g) => {
        const items = sorted.filter((r) => (r.source_type ?? rules.get(r.rule_id)?.source_type) === g.id);
        return (
          <section key={g.id}>
            <h3 className="border-b border-ink pb-3 text-3xl">{g[lang]}</h3>
            {items.length === 0 ? (
              <p className="py-4">{T.noResults[lang]}</p>
            ) : (
              <ul>
                {items.map((r) => (
                  <ResultRow key={r.rule_id} r={r} rule={rules.get(r.rule_id)} lang={lang} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </Drawer>
  );
}
