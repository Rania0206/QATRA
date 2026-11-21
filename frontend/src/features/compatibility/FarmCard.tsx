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

const TILE: Record<Decision, string> = {
  compatible: "bg-olive",
  conditional: "bg-blush",
  blocked: "bg-sand",
};

export function FarmCardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4" aria-hidden="true">
      <Skeleton className="aspect-[4/3] w-full" />
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
    </div>
  );
}

/** Card in the spirit of an editorial gallery: a coloured tile with the farm letter, then name, status, reason. */
export default function FarmCard({ farm, result, lang, selected, onSelect }: Props) {
  const blocked = result.decision === "blocked";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="group flex h-full flex-col items-center text-center focus:outline-none"
    >
      <span
        className={`relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-[1.02] group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-ink ${
          TILE[result.decision]
        } ${selected ? "outline outline-2 outline-offset-4 outline-ink" : ""}`}
      >
        <span className={`font-serif text-[7rem] leading-none ${blocked ? "text-ink-soft" : ""}`}>{farm.id}</span>
        {blocked && (
          <span aria-hidden="true" className="absolute inset-x-8 top-1/2 h-px -rotate-12 bg-bad" />
        )}
      </span>
      <span className="mt-6 font-serif text-3xl leading-tight">{farm.name.replace(/^Ferme [A-Z] - /, "")}</span>
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
