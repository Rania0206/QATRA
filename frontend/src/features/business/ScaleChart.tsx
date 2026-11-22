import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtCompact, fmtN } from "../../format";
import type { Lang } from "../../i18n";
import { Bz } from "./texts";

const FARMERS = "#5e7740"; // olive: what farmers keep
const QATRA = "#1f5f63"; // teal: QATRA's share (also striped, so it is not told by colour alone)
const INK = "#1b1b1a";
const SOFT = "#3a3834";

export interface Row {
  id: string;
  label: string; // short: "100 ha"
  ha: number;
  farmers: number;
  qatra: number;
}

function Tip({ active, payload, lang }: { active?: boolean; payload?: { payload: Row }[]; lang: Lang }) {
  const r = active ? payload?.[0]?.payload : undefined;
  if (!r) return null;
  return (
    <div className="border border-ink bg-cream px-3 py-2 text-[length:calc(15px*var(--fs))] shadow-sm">
      <p className="font-medium">
        <span dir="ltr">{fmtN(r.ha, lang, r.ha < 100 ? 1 : 0)}</span> {Bz.ha[lang]}
      </p>
      <p>
        {Bz.farmersSave[lang]}: <span dir="ltr">{fmtN(r.farmers, lang, 0)}</span> {Bz.tnd[lang]}
      </p>
      <p>
        {Bz.qatraEarns[lang]}: <span dir="ltr">{fmtN(r.qatra, lang, 0)}</span> {Bz.tnd[lang]}
      </p>
      <p className="text-ink-soft">{Bz.projection[lang]}</p>
    </div>
  );
}

/** Grouped horizontal bars: farmers' saving vs QATRA's share for each scale. Values are written beside the bars. */
export default function ScaleChart({ rows, selectedId, lang }: { rows: Row[]; selectedId: string; lang: Lang }) {
  const height = 70 + rows.length * 62;
  return (
    <figure className="mt-10" aria-label={Bz.chartAria[lang]}>
      <figcaption className="text-center">
        <h2 className="text-2xl sm:text-3xl">{Bz.chartTitle[lang]}</h2>
        <p className="mx-auto mt-2 max-w-2xl text-[length:calc(15px*var(--fs))] text-ink-soft">{Bz.chartLead[lang]}</p>
      </figcaption>

      <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[length:calc(15px*var(--fs))]">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-3.5 w-3.5" style={{ background: FARMERS }} /> {Bz.farmersSave[lang]}
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-3.5 w-3.5"
            style={{ background: `repeating-linear-gradient(45deg, ${QATRA} 0 3px, #fcf7f1 3px 6px)`, border: `1px solid ${QATRA}` }}
          />{" "}
          {Bz.qatraEarns[lang]}
        </li>
      </ul>

      <div dir="ltr" className="mt-3 w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 64, bottom: 4, left: 0 }} barGap={3} barCategoryGap={14}>
            <defs>
              <pattern id="qatra-stripes" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="#fcf7f1" />
                <rect width="3" height="6" fill={QATRA} />
              </pattern>
            </defs>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="label" width={78} tick={{ fill: INK, fontSize: 14 }} stroke={SOFT} tickLine={false} />
            <Tooltip content={<Tip lang={lang} />} cursor={{ fill: "rgba(27,27,26,0.06)" }} />
            <Bar dataKey="farmers" isAnimationActive={false} stroke={INK} strokeWidth={0.5}>
              {rows.map((r) => (
                <Cell key={r.id} fill={FARMERS} fillOpacity={r.id === selectedId ? 1 : 0.55} />
              ))}
              <LabelList dataKey="farmers" position="right" formatter={(v) => fmtCompact(Number(v), lang)} style={{ fill: INK, fontSize: 13 }} />
            </Bar>
            <Bar dataKey="qatra" isAnimationActive={false} stroke={QATRA} strokeWidth={0.8}>
              {rows.map((r) => (
                <Cell key={r.id} fill="url(#qatra-stripes)" fillOpacity={r.id === selectedId ? 1 : 0.6} />
              ))}
              <LabelList dataKey="qatra" position="right" formatter={(v) => fmtCompact(Number(v), lang)} style={{ fill: INK, fontSize: 13 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
