import { Segmented } from "../../components/ui";
import { USE_MOCKS } from "../../config";
import { fmtDateL, type Lang } from "../../i18n";
import type { Scenario } from "./data";
import { A } from "./texts";

/** Which day the judge is looking at: the forecast's first day (backend default), the heatwave preset, or any other date. */
export type DayChoice = { kind: "forecast" } | { kind: "heatwave" } | { kind: "custom"; date: string };

interface Props {
  scenario: Scenario;
  onScenario: (s: Scenario) => void;
  day: DayChoice;
  onDay: (d: DayChoice) => void;
  forecastDate?: string; // ISO date of the forecast day, once known
  heatwaveDate: string;
  busy: boolean; // a new plan is loading; the previous one stays on screen
  lang: Lang;
}

/** Judge controls (operator view only): scenario toggle, day presets, any other date. */
export default function Controls({ scenario, onScenario, day, onDay, forecastDate, heatwaveDate, busy, lang }: Props) {
  const short = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(lang === "ar" ? "ar-TN-u-nu-latn" : lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short" });
  return (
    <section aria-label={A.ctlTitle[lang]} className="mx-auto mb-8 max-w-4xl border border-line bg-white px-4 py-4 sm:px-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="eyebrow">{A.ctlTitle[lang]}</p>
        <span role="status" aria-live="polite" className={`text-[length:calc(14px*var(--fs))] text-ink-soft transition-opacity duration-200 ${busy ? "opacity-100" : "opacity-0"}`}>
          {busy ? A.updating[lang] : " "}
        </span>
      </div>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[length:calc(15px*var(--fs))] text-ink-soft">{A.ctlScenario[lang]}</span>
          <Segmented<Scenario>
            label={A.ctlScenario[lang]}
            value={scenario}
            onChange={onScenario}
            options={[
              { id: "normal", label: A.ctlNormal[lang] },
              { id: "outage", label: A.ctlOutage[lang] },
            ]}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[length:calc(15px*var(--fs))] text-ink-soft">{A.ctlDay[lang]}</span>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented<string>
              label={A.ctlDay[lang]}
              value={day.kind}
              onChange={(k) => onDay(k === "heatwave" ? { kind: "heatwave" } : { kind: "forecast" })}
              options={[
                { id: "forecast", label: `${A.ctlForecast[lang]}${forecastDate ? ` (${short(forecastDate)})` : ""}` },
                { id: "heatwave", label: `${A.ctlHeatwave[lang]} (${short(heatwaveDate)})` },
              ]}
            />
            <label className="flex items-center gap-2 text-[length:calc(15px*var(--fs))]">
              <span className="text-ink-soft">{A.ctlOther[lang]}</span>
              <input
                type="date"
                dir="ltr"
                value={day.kind === "custom" ? day.date : ""}
                onChange={(e) => (e.target.value ? onDay({ kind: "custom", date: e.target.value }) : onDay({ kind: "forecast" }))}
                className="border border-ink bg-cream px-2 py-1.5 text-[length:calc(15px*var(--fs))] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              />
            </label>
          </div>
          {day.kind === "custom" && <span className="text-[length:calc(14px*var(--fs))] text-ink-soft">{fmtDateL(day.date, lang)}</span>}
        </div>
      </div>
      {USE_MOCKS && <p className="mt-3 text-[length:calc(14px*var(--fs))] text-ink-soft">{A.mockCtl[lang]}</p>}
    </section>
  );
}
