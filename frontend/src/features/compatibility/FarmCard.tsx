import type { Farm, FarmCompatibility } from "../../api/types";
import { fmtNumber } from "../batches/format";
import DecisionBadge from "./DecisionBadge";
import { DECISION, T, cropLabel, mainReason, type Lang } from "./format";

interface Props {
  farm: Farm;
  result: FarmCompatibility;
  lang: Lang;
  selected: boolean;
  onSelect: () => void;
}

export default function FarmCard({ farm, result, lang, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md focus:outline-none focus:ring-4 ${
        DECISION[result.decision].ring
      } ${selected ? "ring-4" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-800 text-2xl font-bold text-white">
          {farm.id}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-slate-900" title={farm.name}>
            {farm.name}
          </p>
          <p className="text-base text-slate-600">
            {cropLabel(farm.crop)} · {fmtNumber(farm.area_ha)} ha
          </p>
        </div>
      </div>
      <DecisionBadge decision={result.decision} lang={lang} large />
      <p className="text-base leading-snug text-slate-700">{mainReason(result.results, lang)}</p>
      <span className="sr-only">{T.rules[lang]}</span>
    </button>
  );
}
