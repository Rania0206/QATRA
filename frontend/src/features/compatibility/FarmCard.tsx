import type { Decision, Farm, FarmCompatibility } from "../../api/types";
import { Skeleton } from "../../components/ui";
import { fmtNumber } from "../batches/format";
import { DECISION, T, cropLabel, mainReason, type Lang } from "./format";

interface Props {
  farm: Farm;
  result: FarmCompatibility;
  lang: Lang;
  selected: boolean;
  onSelect: () => void;
}

/** Solid status colour + symbol, so the verdict reads from across the room. */
const VERDICT: Record<Decision, { bg: string; symbol: string }> = {
  compatible: { bg: "bg-ok", symbol: "✓" },
  conditional: { bg: "bg-warn", symbol: "!" },
  blocked: { bg: "bg-bad", symbol: "✕" },
};

/** Verdict bar: white text on the status colour (used on cards and in the farm panel). */
export function DecisionPill({ decision, lang, large = false }: { decision: Decision; lang: Lang; large?: boolean }) {
  const v = VERDICT[decision];
  return (
    <span
      className={`inline-flex items-center gap-2.5 font-display font-medium text-white ${v.bg} ${
        large ? "px-4 py-2 text-[20px]" : "px-3 py-1 text-[17px]"
      }`}
    >
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white text-[14px] leading-none"
      >
        {v.symbol}
      </span>
      {DECISION[decision][lang]}
    </span>
  );
}

export function FarmCardSkeleton() {
  return (
    <div className="flex flex-col border border-line" aria-hidden="true">
      <Skeleton className="h-9 w-full" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-full" />
      </div>
    </div>
  );
}

/** Farm card: verdict first (solid bar), then farm, crop, one plain reason, "Why?". */
export default function FarmCard({ farm, result, lang, selected, onSelect }: Props) {
  const v = VERDICT[result.decision];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group flex h-full flex-col border bg-white text-left transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(27,27,26,0.12)] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink ${
        selected ? "border-ink" : "border-line"
      }`}
    >
      <span className={`flex items-center gap-2 px-4 py-2 font-display text-[17px] font-medium text-white ${v.bg}`}>
        <span
          aria-hidden="true"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-white text-[12px] leading-none"
        >
          {v.symbol}
        </span>
        {DECISION[result.decision][lang]}
      </span>
      <span className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <span className="font-display text-[21px] font-medium leading-tight">{farm.name.replace(/^Ferme [A-Z] - /, "")}</span>
        <span className="text-[15px] text-ink-soft">
          {cropLabel(farm.crop)} · {fmtNumber(farm.area_ha)} ha
        </span>
        <span className="mt-2 text-[16px] leading-snug">{mainReason(result.results, lang, farm.crop)}</span>
        <span className="mt-auto pt-3 text-[15px] font-medium underline decoration-1 underline-offset-4 group-hover:decoration-2">
          {T.open[lang]} →
        </span>
      </span>
    </button>
  );
}
