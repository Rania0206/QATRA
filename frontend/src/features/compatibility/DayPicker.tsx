import type { Batch } from "../../api/types";
import { Dot } from "../../components/ui";
import { COMPLIANCE } from "../batches/format";
import { BATCH_STATUS, T, type Lang } from "./format";

interface Props {
  batches: Batch[]; // newest first
  value: string; // selected batch id
  onChange: (batchId: string) => void;
  lang: Lang;
}

const LOCALE: Record<Lang, string> = { en: "en-GB", fr: "fr-FR", ar: "ar-TN" };
const RECENT_DAYS = 7;

function dayLabel(iso: string, lang: Lang): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString(LOCALE[lang], { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Pick the day's water instead of a batch code: the last 7 days as buttons (with a quality dot),
 * plus a date field for older days. The newest batch is the demo's "today".
 */
export default function DayPicker({ batches, value, onChange, lang }: Props) {
  const recent = batches.slice(0, RECENT_DAYS);
  const selected = batches.find((b) => b.id === value);
  const oldest = batches[batches.length - 1]?.date.slice(0, 10);
  const newest = batches[0]?.date.slice(0, 10);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="eyebrow text-ink">{T.whichDay[lang]}</p>
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={T.whichDay[lang]}>
        {recent.map((b, i) => {
          const on = b.id === value;
          const tone = COMPLIANCE[b.status]?.tone ?? "neutral";
          const day = i === 0 ? T.today[lang] : dayLabel(b.date, lang);
          const status = BATCH_STATUS[b.status]?.[lang] ?? b.status;
          return (
            <button
              key={b.id}
              type="button"
              aria-pressed={on}
              aria-label={`${day} · ${status}`}
              title={status}
              onClick={() => onChange(b.id)}
              className={`inline-flex items-center gap-2 border px-3 py-2 text-[15px] transition-colors duration-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                on ? "border-ink bg-ink text-cream" : "border-ink/40 bg-cream/60 hover:border-ink hover:bg-cream"
              }`}
            >
              <Dot tone={tone} />
              {i === 0 ? T.today[lang] : dayLabel(b.date, lang)}
            </button>
          );
        })}
      </div>
      <label className="flex items-center gap-3 text-[15px]">
        {T.otherDate[lang]}
        <input
          type="date"
          min={oldest}
          max={newest}
          value={selected?.date.slice(0, 10) ?? ""}
          onChange={(e) => {
            const match = batches.find((b) => b.date.slice(0, 10) === e.target.value);
            if (match) onChange(match.id);
          }}
          className="border border-ink/40 bg-cream/60 px-3 py-1.5 text-[15px] focus:outline-none focus-visible:outline-2 focus-visible:outline-ink"
        />
      </label>
    </div>
  );
}
