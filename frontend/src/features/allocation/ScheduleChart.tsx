import { Bar, BarChart, CartesianGrid, Cell, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Allocation, EnergySource, ScheduleSlot } from "../../api/types";
import type { Lang } from "../../i18n";
import { OUTAGE_HOURS, type Scenario } from "./data";
import { A, fmtN, hh } from "./texts";

// Palette: sun = warm gold, grid = neutral grey with diagonal stripes (so it is not told by colour alone), power cut = the app's red tint.
const SUN = "#d99a1c";
const GRID = "#7a7468";
const BASIN = "#1f5f63";
const INK = "#1b1b1a";
const SOFT = "#3a3834";
const LINE = "#d9cfc1";
const CUT_FILL = "#f4dedb";
const CUT_TEXT = "#9e2a2b";

const FILL: Record<EnergySource, string> = { solar: SUN, grid: "url(#grid-stripes)", basin: BASIN, off: "none" };
const LABEL: Record<EnergySource, keyof typeof A> = { solar: "srcSolar", grid: "srcGrid", basin: "srcBasin", off: "notPumping" };

const inCut = (h: number) => h >= OUTAGE_HOURS[0] && h <= OUTAGE_HOURS[1];

/** The plain sentence under the chart: solar share, and what the pump did during the power cut. */
export function scheduleSentence(a: Allocation, scenario: Scenario, lang: Lang): string {
  const pumping = a.schedule.filter((s) => s.pump_kw > 0);
  if (!pumping.length) return A.noPumping[lang];
  const pct = fmtN(a.solar_share * 100, lang, 0);
  const base = {
    en: `Solar covers ${pct}% of the pumping energy.`,
    fr: `Le solaire couvre ${pct} % de l'énergie de pompage.`,
    ar: `الطاقة الشمسية تغطي ${pct}% من طاقة الضخ.`,
  }[lang];
  if (scenario !== "outage") return base;
  const cut = a.schedule.filter((s) => inCut(s.hour));
  if (cut.some((s) => s.source === "grid")) return base; // (sample data) never claim what the data does not show
  const tail = cut.some((s) => s.pump_kw > 0)
    ? {
        en: " The pump never uses the grid during the power cut: it runs on solar only, at a lower flow.",
        fr: " La pompe n'utilise jamais le réseau pendant la coupure : elle fonctionne au solaire seul, à débit réduit.",
        ar: " لا تستعمل المضخة الشبكة أبدًا أثناء الانقطاع: تعمل بالطاقة الشمسية فقط وبتدفق أقل.",
      }[lang]
    : {
        en: " The pump does not run during the power cut: there is no grid power and too little sun.",
        fr: " La pompe s'arrête pendant la coupure : pas de courant du réseau et trop peu de soleil.",
        ar: " تتوقف المضخة أثناء الانقطاع: لا كهرباء من الشبكة وشمس قليلة.",
      }[lang];
  return base + tail;
}

interface TipProps {
  active?: boolean;
  payload?: { payload: ScheduleSlot }[];
  lang: Lang;
  cut: boolean;
}

function Tip({ active, payload, lang, cut }: TipProps) {
  const s = active ? payload?.[0]?.payload : undefined;
  if (!s) return null;
  const solarOnly = cut && inCut(s.hour) && s.source === "solar";
  return (
    <div className="border border-ink bg-cream px-3 py-2 text-[15px] shadow-sm">
      <p className="font-medium">
        {A.hour[lang]} <span dir="ltr">{hh(s.hour)}</span>
      </p>
      <p>
        {fmtN(s.pump_kw, lang)} kW · {A[LABEL[s.source]][lang]}
        {solarOnly && <span className="text-bad"> · {A.solarOnly[lang]}</span>}
      </p>
      <p className="text-ink-soft">
        {A.basinLevel[lang]}: <span dir="ltr">{fmtN(s.basin_m3, lang, 0)}</span> {A.m3[lang]}
      </p>
    </div>
  );
}

function Swatch({ kind }: { kind: "solar" | "grid" | "cut" }) {
  const style =
    kind === "solar"
      ? { background: SUN }
      : kind === "grid"
        ? { background: `repeating-linear-gradient(45deg, ${GRID} 0 2px, #fcf7f1 2px 5px)`, border: `1px solid ${GRID}` }
        : { background: CUT_FILL, border: `1px solid ${CUT_TEXT}` };
  return <span aria-hidden="true" className="inline-block h-3.5 w-3.5 shrink-0" style={style} />;
}

/** 24 hourly bars: height = pump power (kW), colour AND pattern by energy source, power cut shaded. */
export default function ScheduleChart({ allocation, scenario, lang }: { allocation: Allocation; scenario: Scenario; lang: Lang }) {
  const cut = scenario === "outage";
  const data = allocation.schedule;
  const used = new Set(data.filter((s) => s.pump_kw > 0).map((s) => s.source));
  return (
    <figure className="mx-auto max-w-4xl" aria-label={A.chartAria[lang]}>
      <figcaption className="text-center">
        <h2 className="text-3xl sm:text-4xl">{A.chartTitle[lang]}</h2>
        <p className="mt-2 text-[16px] text-ink-soft">{A.chartLead[lang]}</p>
      </figcaption>

      <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[15px]">
        <li className="flex items-center gap-2">
          <Swatch kind="solar" /> {A.srcSolar[lang]}
        </li>
        <li className="flex items-center gap-2">
          <Swatch kind="grid" /> {A.srcGrid[lang]}
        </li>
        {used.has("basin") && (
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-block h-3.5 w-3.5" style={{ background: BASIN }} /> {A.srcBasin[lang]}
          </li>
        )}
        {cut && (
          <li className="flex items-center gap-2">
            <Swatch kind="cut" /> {A.powerCut[lang]}{" "}
            <span dir="ltr">
              ({hh(OUTAGE_HOURS[0])}–{hh(OUTAGE_HOURS[1] + 1)})
            </span>
          </li>
        )}
      </ul>

      <div dir="ltr" className="mt-4 h-[260px] w-full sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 22, right: 8, bottom: 4, left: 0 }}>
            <defs>
              <pattern id="grid-stripes" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="#fcf7f1" />
                <rect width="3" height="6" fill={GRID} />
              </pattern>
            </defs>
            <CartesianGrid stroke={LINE} vertical={false} />
            {cut && (
              <ReferenceArea
                x1={OUTAGE_HOURS[0]}
                x2={OUTAGE_HOURS[1]}
                fill={CUT_FILL}
                fillOpacity={0.9}
                stroke={CUT_TEXT}
                strokeDasharray="4 3"
                label={{ value: A.powerCut[lang], position: "top", fill: CUT_TEXT, fontSize: 14, fontWeight: 600 }}
              />
            )}
            <XAxis
              dataKey="hour"
              tickFormatter={(h: number) => String(h).padStart(2, "0")}
              interval={1}
              tick={{ fill: SOFT, fontSize: 13 }}
              stroke={INK}
              tickLine={false}
            />
            <YAxis tick={{ fill: SOFT, fontSize: 13 }} stroke={INK} tickLine={false} width={38} unit="" allowDecimals={false} />
            <Tooltip content={<Tip lang={lang} cut={cut} />} cursor={{ fill: "rgba(27,27,26,0.06)" }} />
            <Bar dataKey="pump_kw" isAnimationActive={false} stroke={INK} strokeWidth={0.5}>
              {data.map((s) => (
                <Cell key={s.hour} fill={FILL[s.source]} stroke={s.pump_kw > 0 ? INK : "none"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-center text-[14px] text-ink-soft">kW · {A.hour[lang]}</p>

      <p className="mx-auto mt-4 max-w-2xl text-center text-[17px] leading-snug">{scheduleSentence(allocation, scenario, lang)}</p>
    </figure>
  );
}
