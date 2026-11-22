import type { Decision, Farm, FarmCompatibility } from "../../api/types";
import { Skeleton } from "../../components/ui";
import { fmtNumber } from "../batches/format";
import { DECISION, T, cropName, mainReason, type Lang } from "./format";

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
      className={`group flex h-full flex-col border bg-white text-start transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(27,27,26,0.12)] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink ${
        selected ? "border-ink" : "border-line"
      }`}
    >
      <span className={`flex items-center gap-2 px-4 py-2 font-display text-[length:calc(17px*var(--fs))] font-medium text-white ${v.bg}`}>
        <span
          aria-hidden="true"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-white text-[length:calc(12px*var(--fs))] leading-none"
        >
          {v.symbol}
        </span>
        {DECISION[result.decision][lang]}
      </span>
      <span className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <span className="font-display text-[length:calc(21px*var(--fs))] font-medium leading-tight">{farm.name.replace(/^Ferme [A-Z] - /, "")}</span>
        <span className="text-[length:calc(15px*var(--fs))] text-ink-soft">
          {cropName(farm.crop, lang)} · {fmtNumber(farm.area_ha)} ha
        </span>
        <span className="mt-2 text-[length:calc(16px*var(--fs))] leading-snug">{mainReason(result.results, lang, farm.crop)}</span>
        <span className="mt-auto pt-3 text-[length:calc(15px*var(--fs))] font-medium underline decoration-1 underline-offset-4 group-hover:decoration-2">
          {T.open[lang]}
        </span>
      </span>
    </button>
  );
}
