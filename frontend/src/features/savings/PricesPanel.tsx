import { useEffect, useRef, useState } from "react";
import type { SavingsOverrides } from "../../api/types";
import { USE_MOCKS } from "../../config";
import type { Lang } from "../../i18n";
import { fmtN } from "../allocation/texts";
import { S } from "./texts";

interface Field {
  key: keyof SavingsOverrides;
  label: keyof typeof S;
  unit: string;
  min: number;
  max: number;
  step: string;
  /** shown value = server value x scale (the share is shown as a percentage, sent as 0..1) */
  scale: number;
  integer?: boolean;
}

const FIELDS: Field[] = [
  { key: "fertiliser_price", label: "pFert", unit: "TND/kg", min: 0, max: 100, step: "0.1", scale: 1 },
  { key: "electricity_price", label: "pElec", unit: "TND/kWh", min: 0, max: 10, step: "0.01", scale: 1 },
  { key: "treated_water_price", label: "pWater", unit: "TND/m³", min: 0, max: 10, step: "0.005", scale: 1 },
  { key: "availability_factor", label: "pShare", unit: "%", min: 0, max: 100, step: "5", scale: 100 },
  { key: "irrigation_days", label: "pDays", unit: "", min: 1, max: 366, step: "1", scale: 1, integer: true },
];

const DEBOUNCE_MS = 400;

interface Props {
  defaults: Record<string, number>; // the server's defaults by assumption name
  current: Record<string, number>; // what the shown figures use
  overrides: SavingsOverrides;
  onCommit: (o: SavingsOverrides) => void;
  busy: boolean;
  lang: Lang;
}

const parse = (text: string, f: Field): number | null => {
  const n = Number(text.replace(",", "."));
  if (text.trim() === "" || !Number.isFinite(n) || n < f.min || n > f.max || (f.integer && !Number.isInteger(n))) return null;
  return n;
};

/** "Change the prices": number inputs; a valid edit is sent after 400 ms of quiet. */
export default function PricesPanel({ defaults, current, overrides, onCommit, busy, lang }: Props) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef({ overrides, onCommit });
  latest.current = { overrides, onCommit };

  const shown = (f: Field) => draft[f.key] ?? fmtN((current[f.key] ?? 0) * f.scale, "en", 4);

  const edit = (f: Field, text: string) => {
    const next = { ...draft, [f.key]: text };
    setDraft(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const o: SavingsOverrides = { ...latest.current.overrides };
      for (const g of FIELDS) {
        const raw = next[g.key];
        if (raw === undefined) continue;
        const n = parse(raw, g);
        if (n === null) continue; // invalid: keep the last good value
        const value = n / g.scale;
        if (Math.abs(value - (defaults[g.key] ?? NaN)) < 1e-9) delete o[g.key];
        else (o as Record<string, number>)[g.key] = value;
      }
      if (JSON.stringify(o) !== JSON.stringify(latest.current.overrides)) latest.current.onCommit(o);
    }, DEBOUNCE_MS);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const reset = () => {
    window.clearTimeout(timer.current);
    setDraft({});
    onCommit({});
  };
  const edited = Object.keys(overrides).length > 0 || Object.keys(draft).length > 0;

  return (
    <section aria-label={S.pricesTitle[lang]} className="mx-auto mt-6 w-full max-w-3xl border border-line bg-white px-5 py-5 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl">{S.pricesTitle[lang]}</h2>
          <p className="mt-1 text-[length:calc(15px*var(--fs))] text-ink-soft">{S.pricesLead[lang]}</p>
        </div>
        <span role="status" aria-live="polite" className={`shrink-0 text-[length:calc(14px*var(--fs))] text-ink-soft transition-opacity duration-200 ${busy ? "opacity-100" : "opacity-0"}`}>
          {busy ? S.updating[lang] : " "}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => {
          const bad = draft[f.key] !== undefined && parse(draft[f.key], f) === null;
          return (
            <label key={f.key} className="flex min-w-0 flex-col gap-1.5 text-[length:calc(15px*var(--fs))]">
              <span>{S[f.label][lang]}</span>
              <span className="flex items-stretch">
                <input
                  type="number"
                  inputMode="decimal"
                  dir="ltr"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={shown(f)}
                  onChange={(e) => edit(f, e.target.value)}
                  aria-invalid={bad}
                  className={`min-w-0 flex-1 border bg-cream px-3 py-2.5 text-[length:calc(18px*var(--fs))] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                    bad ? "border-bad" : "border-ink"
                  }`}
                />
                {f.unit && (
                  <span dir="ltr" className="flex items-center border border-s-0 border-ink px-3 text-ink-soft">
                    {f.unit}
                  </span>
                )}
              </span>
              {bad && <span className="text-[length:calc(14px*var(--fs))] text-bad">{S.invalid[lang]}</span>}
            </label>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={reset} disabled={!edited} className="btn disabled:cursor-not-allowed disabled:opacity-40">
          {S.reset[lang]}
        </button>
        {USE_MOCKS && <span className="text-[length:calc(14px*var(--fs))] text-ink-soft">{S.mockNote[lang]}</span>}
      </div>
    </section>
  );
}
