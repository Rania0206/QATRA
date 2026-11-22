import { useEffect, useMemo, useState } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { post } from "../../api/client";
import type { EnergySource, HeatwaveRequest, HeatwaveResult, HeatwaveRun } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import TagChip from "../../components/TagChip";
import { Band, Intro, Skeleton } from "../../components/ui";
import { useApi } from "../../hooks/useApi";
import { useCountUp } from "../../hooks/useCountUp";
import { useLang, type Lang } from "../../i18n";
import { H, heatwaveVerdict, outageLabel, shortDate } from "./texts";

const SCENARIO = "heatwave_outage";
const DEFAULT_DATE = "2026-08-26"; // the hottest day of the series

const SOFT = "#3a3834";
const LINE = "#d9cfc1";
const BAD = "#9e2a2b";
// Bars: colour by where the pump power comes from. The legend and the tooltip also say it in words.
const SOURCE: Record<EnergySource, { colour: string; label: keyof typeof H }> = {
  solar: { colour: "#c58b00", label: "solar" },
  grid: { colour: "#3a3834", label: "grid" },
  basin: { colour: "#5e7740", label: "basin" },
  off: { colour: "transparent", label: "off" },
};
const BASIN_LINE = "#1d4e89";

interface Row {
  hour: number;
  kw: number; // pump power (kW)
  source: EnergySource;
  basin: number | null; // basin level at the end of the hour (m3); null: no basin
  ghost: 0; // zeros for the invisible line that keeps the basin axis alive when there is no basin
  demand: number;
  delivered: number;
  unserved: number;
}

/** "With QATRA": the 24-slot schedule of the plan, with the hourly delivery of the same run. */
function qatraRows(r: HeatwaveResult): Row[] {
  return r.allocation.schedule.map((s) => {
    const h = r.qatra.hourly[s.hour];
    return { hour: s.hour, kw: s.pump_kw, source: s.source, basin: s.basin_m3, ghost: 0, demand: h.demand_m3, delivered: h.delivered_m3, unserved: h.unserved_m3 };
  });
}

/** "Without QATRA": the pump runs on the grid when there is power and demand; there is no basin. */
function naiveRows(run: HeatwaveRun): Row[] {
  return run.hourly.map((h) => ({
    hour: h.hour, kw: h.grid_kw, source: h.grid_kw > 0 ? "grid" : "off", basin: null, ghost: 0,
    demand: h.demand_m3, delivered: h.delivered_m3, unserved: h.unserved_m3,
  }));
}

/** Round a maximum up to a tidy axis end, with a little room. */
const niceMax = (v: number, step: number) => Math.max(step, Math.ceil((v * 1.1) / step) * step);

export default function HeatwaveTab() {
  const { lang } = useLang();
  const [date, setDate] = useState(DEFAULT_DATE);
  // Changing the day re-runs the scenario. The previous result stays on screen (dimmed) until the new one arrives.
  const sim = useApi<HeatwaveResult>(
    () => post<HeatwaveResult>("/api/scenarios/heatwave", { scenario_id: SCENARIO, date } satisfies HeatwaveRequest),
    [date],
  );
  const d = sim.data;

  // The days to choose from come with the response. Kept apart so the picker survives an error on one day.
  const [days, setDays] = useState<string[]>([]);
  useEffect(() => {
    if (d?.dates.length) setDays(d.dates);
  }, [d]);

  const model = useMemo(() => {
    if (!d) return null;
    const naive = naiveRows(d.naive);
    const qatra = qatraRows(d);
    const outage = d.qatra.hourly.filter((h) => h.outage).map((h) => h.hour);
    return {
      naive,
      qatra,
      // one scale for both panels, so the two days compare fairly
      kwMax: niceMax(Math.max(...naive.map((r) => r.kw), ...qatra.map((r) => r.kw)), 10),
      m3Max: niceMax(Math.max(...qatra.map((r) => r.basin ?? 0)), 250),
      outage: outage.length ? ([outage[0], outage[outage.length - 1] + 1] as const) : null,
    };
  }, [d]);

  const updating = sim.loading && !!d;
  const nothingPlanned = !!d && d.allocated_m3 === 0;

  return (
    <>
      <Band tone="olive" className="md:py-24">
        <Intro as="h1" size="xl" eyebrow={H.eyebrow[lang]} title={H.title[lang]}>
          <p>{H.lead[lang]}</p>
        </Intro>
      </Band>

      <Band tone="cream" wide>
        <div className="space-y-10">
          {days.length > 0 && <DayPicker days={days} value={date} onChange={setDate} lang={lang} />}

          {sim.loading && !d ? (
            <div className="space-y-4" aria-busy="true" aria-label={H.loading[lang]}>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : sim.error ? (
            <ErrorBox error={sim.error} onRetry={sim.reload} />
          ) : d && model ? (
            <div className={`space-y-10 transition-opacity duration-300 ${updating ? "opacity-50" : ""}`} aria-busy={updating}>
              {updating && (
                <p role="status" className="text-center text-[length:calc(15px*var(--fs))] text-ink-soft">
                  {H.updating[lang]}
                </p>
              )}

              <BigCounter without={d.naive.hours_without_water} withQatra={d.qatra.hours_without_water} muted={nothingPlanned} lang={lang} />

              {nothingPlanned ? (
                <div role="note" className="mx-auto max-w-3xl border border-warn px-6 py-6 text-center">
                  <h2 className="text-3xl text-warn">{H.nothingTitle[lang]}</h2>
                  <p className="mt-3 text-[length:calc(17px*var(--fs))]">{H.nothingText[lang]}</p>
                </div>
              ) : (
                <p className="mx-auto max-w-3xl border-s-4 border-ok ps-5 font-display text-[length:calc(26px*var(--fs)*var(--fsn))] leading-snug">
                  {heatwaveVerdict(d.naive.hours_without_water, d.qatra.hours_without_water, model.outage?.[0] ?? 13, model.outage?.[1] ?? 17, lang)}
                </p>
              )}

              <Legend lang={lang} outage={model.outage} />

              <div className="grid gap-10 lg:grid-cols-2">
                <Panel title={H.without[lang]} rows={model.naive} run={d.naive} model={model} lang={lang} bad />
                <Panel title={H.with[lang]} rows={model.qatra} run={d.qatra} model={model} lang={lang} />
              </div>

              <div className="mx-auto max-w-3xl space-y-3 text-center">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <TagChip tag={d.tag} />
                </div>
                <p className="text-[length:calc(15px*var(--fs))] text-ink-soft">{H.caveat[lang]}</p>
                {d.allocation.warnings.length > 0 && (
                  <details className="text-start text-[length:calc(15px*var(--fs))] text-ink-soft">
                    <summary className="cursor-pointer text-center">{H.notes[lang]}</summary>
                    <ul className="mt-3 list-disc space-y-1 ps-6" dir="ltr">
                      {d.allocation.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </Band>
    </>
  );
}

/** One button per day with a power cut. */
function DayPicker({ days, value, onChange, lang }: { days: string[]; value: string; onChange: (d: string) => void; lang: Lang }) {
  return (
    <div className="space-y-3 text-center">
      <p className="eyebrow">{H.pickDay[lang]}</p>
      <div role="group" aria-label={H.pickDay[lang]} className="flex flex-wrap justify-center gap-2">
        {days.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => onChange(day)}
            aria-pressed={day === value}
            className={`min-w-20 border px-3 py-2 text-[length:calc(16px*var(--fs))] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
              day === value ? "border-ink bg-ink text-cream" : "border-line hover:border-ink"
            }`}
          >
            {shortDate(day, lang)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The number to read from the back of the room: hours without irrigation, without and with QATRA, counting up or down when the day changes. */
function BigCounter({ without, withQatra, muted, lang }: { without: number; withQatra: number; muted: boolean; lang: Lang }) {
  const a = useCountUp(without);
  const b = useCountUp(withQatra);
  const unit = H.hourUnit[lang];
  const tone = (good: boolean) => (muted ? "text-ink-soft" : good ? "text-ok" : "text-bad");
  const spoken = `${H.counterTitle[lang]}: ${H.without[lang]} ${without} ${unit}, ${H.with[lang]} ${withQatra} ${unit}`;
  return (
    <section aria-label={spoken} className="space-y-6 text-center">
      <h2 className="eyebrow" aria-hidden="true">
        {H.counterTitle[lang]}
      </h2>
      <div aria-hidden="true" dir="ltr" className="grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
        <div className={`transition-colors duration-500 ${tone(false)}`}>
          <p className="text-[clamp(1.25rem,2.6vw,2rem)] font-medium">{muted ? "" : "✕ "}{H.without[lang]}</p>
          <p className="font-display text-[clamp(7rem,24vw,17rem)] leading-[0.9] tabular-nums">
            {a}
            <span className="ms-2 text-[0.28em]">{unit}</span>
          </p>
        </div>
        <span className="font-display text-[clamp(3rem,8vw,6rem)] leading-none text-ink-soft">→</span>
        <div className={`transition-colors duration-500 ${tone(true)}`}>
          <p className="text-[clamp(1.25rem,2.6vw,2rem)] font-medium">{muted ? "" : "✓ "}{H.with[lang]}</p>
          <p className="font-display text-[clamp(7rem,24vw,17rem)] leading-[0.9] tabular-nums">
            {b}
            <span className="ms-2 text-[0.28em]">{unit}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function Legend({ lang, outage }: { lang: Lang; outage: readonly [number, number] | null }) {
  const items: { key: EnergySource | "line"; label: string }[] = [
    { key: "solar", label: H.solar[lang] },
    { key: "grid", label: H.grid[lang] },
    { key: "basin", label: H.basin[lang] },
    { key: "line", label: H.basinLine[lang] },
  ];
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[length:calc(15px*var(--fs))]">
      {items.map((i) => (
        <li key={i.key} className="flex items-center gap-2">
          {i.key === "line" ? (
            <span aria-hidden="true" className="inline-block h-0.5 w-6" style={{ background: BASIN_LINE }} />
          ) : (
            <span aria-hidden="true" className="inline-block h-3 w-3" style={{ background: SOURCE[i.key].colour }} />
          )}
          {i.label}
        </li>
      ))}
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="inline-block h-3 w-3 border" style={{ background: `${BAD}22`, borderColor: BAD }} />
        {outage ? outageLabel(outage[0], outage[1], lang) : ""}
      </li>
    </ul>
  );
}

interface Model {
  kwMax: number;
  m3Max: number;
  outage: readonly [number, number] | null; // [first outage hour, hour after the last]
  naive: Row[];
  qatra: Row[];
}

function Panel({ title, rows, run, model, lang, bad = false }: { title: string; rows: Row[]; run: HeatwaveRun; model: Model; lang: Lang; bad?: boolean }) {
  const noBasin = rows.every((r) => r.basin === null);
  return (
    <section className="space-y-4">
      <h2 className="text-center text-3xl">{title}</h2>

      <div dir="ltr" role="img" aria-label={`${title}: ${run.hours_without_water} ${H.hoursNoWater[lang]}, ${run.grid_kwh} ${H.fromGrid[lang]}, ${run.solar_kwh} ${H.fromSun[lang]}`}>
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={rows} margin={{ top: 24, right: 8, bottom: 32, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
            <XAxis
              dataKey="hour"
              ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
              tick={{ fill: SOFT, fontSize: 13 }}
              tickFormatter={(h) => String(h)}
              label={{ value: H.hour[lang], position: "insideBottom", offset: -20, fill: SOFT, fontSize: 13 }}
            />
            <YAxis yAxisId="kw" domain={[0, model.kwMax]} tick={{ fill: SOFT, fontSize: 13 }} width={44}
              label={{ value: H.pumpAxis[lang], angle: -90, position: "insideLeft", offset: 8, fill: SOFT, fontSize: 13 }} />
            <YAxis yAxisId="m3" orientation="right" domain={[0, model.m3Max]} tick={{ fill: SOFT, fontSize: 13 }} width={52}
              label={{ value: H.basinAxis[lang], angle: 90, position: "insideRight", offset: 4, fill: SOFT, fontSize: 13 }} />
            <Tooltip content={<HourTooltip lang={lang} />} cursor={{ fill: "#00000010" }} />
            {model.outage && (
              <ReferenceArea
                yAxisId="kw"
                x1={model.outage[0]}
                x2={model.outage[1] - 1}
                fill={BAD}
                fillOpacity={0.14}
                stroke={BAD}
                strokeOpacity={0.5}
                label={{ value: outageLabel(model.outage[0], model.outage[1], lang), position: "insideTop", fill: BAD, fontSize: 13 }}
              />
            )}
            <Bar yAxisId="kw" dataKey="kw" isAnimationActive={false} maxBarSize={22}>
              {rows.map((r) => (
                <Cell key={r.hour} fill={SOURCE[r.source].colour} />
              ))}
            </Bar>
            {/* Always drawn: even without a basin the axis keeps its ticks, so both panels share the same plot area and scale */}
            <Line yAxisId="m3" dataKey={noBasin ? "ghost" : "basin"} stroke={noBasin ? "transparent" : BASIN_LINE} strokeWidth={2.5} dot={noBasin ? false : { r: 3 }}
              activeDot={noBasin ? false : undefined} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {noBasin && <p className="text-center text-[length:calc(15px*var(--fs))] text-ink-soft">{H.noBasin[lang]}</p>}

      <dl className="grid grid-cols-3 gap-3 text-center">
        <Stat value={run.hours_without_water} label={H.hoursNoWater[lang]} bad={bad && run.hours_without_water > 0} />
        <Stat value={Math.round(run.unserved_m3)} label={H.notDelivered[lang]} bad={bad && run.unserved_m3 > 0.5} />
        <Stat value={Math.round(run.grid_kwh)} label={H.fromGrid[lang]} />
      </dl>
      {run.solar_kwh > 0 && (
        <p className="text-center text-[length:calc(15px*var(--fs))] text-ink-soft">
          {Math.round(run.solar_kwh)} {H.fromSun[lang]}
        </p>
      )}
    </section>
  );
}

function Stat({ value, label, bad = false }: { value: number; label: string; bad?: boolean }) {
  return (
    <div className={`border px-2 py-3 ${bad ? "border-bad text-bad" : "border-line"}`}>
      <dd className="font-display text-4xl leading-none tabular-nums">{value}</dd>
      <dt className="mt-1 text-[length:calc(14px*var(--fs))] leading-snug">{label}</dt>
    </div>
  );
}

function HourTooltip({ active, payload, lang }: { active?: boolean; payload?: { payload: Row }[]; lang: Lang }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="border border-line bg-cream px-3 py-2 text-[length:calc(14px*var(--fs))] shadow" dir="ltr">
      <p className="font-medium">{`${r.hour}:00–${r.hour + 1}:00`}</p>
      <p>
        {H.tooltipSource[lang]}: {H[SOURCE[r.source].label][lang]} · {r.kw.toFixed(1)} kW
      </p>
      {r.demand > 0 && (
        <p className={r.delivered === 0 ? "text-bad" : ""}>
          {H.tooltipDemand[lang]} {r.demand.toFixed(1)} m³ · {H.tooltipDelivered[lang]} {r.delivered.toFixed(1)} m³
          {r.delivered === 0 ? ` · ${H.noWater[lang]}` : ""}
        </p>
      )}
      {r.basin !== null && (
        <p>
          {H.tooltipBasin[lang]}: {Math.round(r.basin)} m³
        </p>
      )}
    </div>
  );
}
