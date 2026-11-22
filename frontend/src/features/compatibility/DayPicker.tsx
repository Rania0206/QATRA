import type { Batch } from "../../api/types";
import { T, type Lang } from "./format";

interface Props {
  batches: Batch[]; // newest first
  value: string; // selected batch id
  onChange: (batchId: string) => void;
  lang: Lang;
}

/** Pick the day's water with one date field, limited to the days that have a batch. Defaults to the newest. */
export default function DayPicker({ batches, value, onChange, lang }: Props) {
  const selected = batches.find((b) => b.id === value);
  const oldest = batches[batches.length - 1]?.date.slice(0, 10);
  const newest = batches[0]?.date.slice(0, 10);

  return (
    <label className="flex flex-wrap items-center justify-center gap-3 text-[length:calc(17px*var(--fs))]">
      {T.whichDay[lang]}
      <input
        type="date"
        min={oldest}
        max={newest}
        value={selected?.date.slice(0, 10) ?? newest ?? ""}
        onChange={(e) => {
          const match = batches.find((b) => b.date.slice(0, 10) === e.target.value);
          if (match) onChange(match.id);
        }}
        className="border border-ink bg-cream px-4 py-2.5 text-[length:calc(17px*var(--fs))] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      />
    </label>
  );
}
