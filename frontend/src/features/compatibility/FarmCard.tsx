import type { Decision, Farm, FarmCompatibility } from "../../api/types";
import { Pill, Skeleton } from "../../components/ui";
import { fmtNumber } from "../batches/format";
import { DECISION, T, cropLabel, mainReason, type Lang } from "./format";

interface Props {
  farm: Farm;
  result: FarmCompatibility;
  lang: Lang;
  selected: boolean;
  onSelect: () => void;
}

export function DecisionPill({ decision, lang, large = false }: { decision: Decision; lang: Lang; large?: boolean }) {
  const d = DECISION[decision];
  return (
    <Pill tone={d.tone} large={large}>
      {d[lang]}
    </Pill>
  );
}

/** Thin status line on top of each card, so the verdict scans at a glance. */
const EDGE: Record<Decision, string> = {
  compatible: "bg-ok",
  conditional: "bg-warn",
  blocked: "bg-bad",
};

export function FarmCardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 border border-line p-8" aria-hidden="true">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-5 w-full" />
    </div>
  );
}

/** Farm card: name and crop, plain verdict, one plain reason, "Why?". */
export default function FarmCard({ farm, result, lang, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative flex h-full flex-col items-center border bg-cream px-6 pb-8 pt-10 text-center transition-colors duration-200 hover:bg-sand focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink ${
        selected ? "border-ink" : "border-line"
      }`}
    >
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1.5 ${EDGE[result.decision]}`} />
      <span className="font-serif text-3xl leading-tight">{farm.name.replace(/^Ferme [A-Z] - /, "")}</span>
      <span className="mt-1 font-mono text-[15px]">
        {cropLabel(farm.crop)} · {fmtNumber(farm.area_ha)} ha
      </span>
      <span className="mt-4">
        <DecisionPill decision={result.decision} lang={lang} large />
      </span>
      <span className="mt-4 line-clamp-3 min-h-[3.2em] max-w-xs text-[18px] leading-snug">
        {mainReason(result.results, lang, farm.crop)}
      </span>
      <span className="link mt-4 text-[16px]">{T.open[lang]}</span>
    </button>
  );
}
