import type { Farm, FarmCompatibility } from "../../api/types";
import { Skeleton } from "../batches/ui";
import { fmtNumber } from "../batches/format";
import DecisionBadge from "./DecisionBadge";
import { cropIcon, cropLabel, mainReason, type Lang } from "./format";

interface Props {
  farm: Farm;
  result: FarmCompatibility;
  lang: Lang;
  selected: boolean;
  onSelect: () => void;
}

export function FarmCardSkeleton() {
  return (
    <div className="q-card flex h-full flex-col gap-4 p-5" aria-hidden="true">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export default function FarmCard({ farm, result, lang, selected, onSelect }: Props) {
  const blocked = result.decision === "blocked";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`q-card group flex h-full flex-col gap-4 p-5 text-left hover:-translate-y-0.5 hover:bg-[var(--q-hover)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--q-accent)] ${
        selected ? "outline outline-[3px] outline-offset-2 outline-[var(--q-accent)]" : ""
      } ${blocked ? "!border-dashed !bg-[var(--q-paper-alt)]" : ""}`}
    >
      <div className="flex items-center gap-4">
        <span className={`q-display ${blocked ? "opacity-50" : ""} flex h-16 w-16 shrink-0 items-center justify-center rounded-[2px] border border-[var(--q-ink)] bg-[var(--q-ink)] text-4xl text-[var(--q-paper)]`}>
          {farm.id}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold" title={farm.name}>
            {farm.name}
          </p>
          <p className="q-mono flex items-center gap-2 whitespace-nowrap text-base text-[var(--q-ink-2)]">
            <span aria-hidden="true" className={`text-2xl ${blocked ? "grayscale" : ""}`}>
              {cropIcon(farm.crop)}
            </span>
            <span className="truncate">
              {cropLabel(farm.crop)} · {fmtNumber(farm.area_ha)} ha
            </span>
          </p>
        </div>
      </div>
      <DecisionBadge decision={result.decision} lang={lang} size="xl" />
      <p className={`line-clamp-3 min-h-[4.5em] text-base leading-normal ${blocked ? "font-semibold" : ""}`}>
        {mainReason(result.results, lang)}
      </p>
    </button>
  );
}
