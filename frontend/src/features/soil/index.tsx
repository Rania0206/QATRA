import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { get, post } from "../../api/client";
import type { Farm, SoilSimulateRequest, SoilSimulation, Tag } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import Loading from "../../components/Loading";
import TagChip from "../../components/TagChip";
import { useApi } from "../../hooks/useApi";

const DEFAULT_FARM = "A"; // alfalfa
const DEMO_BATCH = "SSUD-20260713"; // EC 2.67 dS/m: the managed-leaching policy can hold alfalfa under its threshold
const PLAY_SECONDS = 6; // a full sweep 0 -> 30 for the live pitch

// Colours are not the only cue: the naive line is dashed with square markers, QATRA is solid with round markers.
const NAIVE = { colour: "#dc2626", dash: "7 4" };
const QATRA = { colour: "#15803d" };

// Square marker for the naive line (the QATRA line keeps the default round dot).
function SquareDot({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) {
  if (cx === undefined || cy === undefined) return null;
  return <rect key={index} x={cx - 3} y={cy - 3} width={6} height={6} fill={NAIVE.colour} />;
}

const crop = (c: string) => c.replace(/_/g, " ");
const firstOver = (y: number | null, years: number) => (y === null ? `Never in ${years} years` : `Year ${y}`);
const yieldText = (loss: number | null) => (loss === null ? "n/a (TO_VERIFY)" : loss === 0 ? "No loss" : `−${loss}% yield`);

export default function SoilTab() {
  const [farmId, setFarmId] = useState(DEFAULT_FARM);
  const farms = useApi<Farm[]>(() => get<Farm[]>("/api/farms"));
  const sim = useApi<SoilSimulation>(
    () => post<SoilSimulation>("/api/soil/simulate", { farm_id: farmId, batch_id: DEMO_BATCH } satisfies SoilSimulateRequest),
    [farmId],
  );

  const lastYear = sim.data ? sim.data.years[sim.data.years.length - 1] : 30;
  const [year, setYear] = useState(30);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  // A new simulation shows the whole 30 years and stops any running sweep.
  useEffect(() => {
    setPlaying(false);
    setYear(lastYear);
  }, [sim.data, lastYear]);

  // Play: sweep 0 -> last year in ~6 s (one step every PLAY_SECONDS / years).
  useEffect(() => {
    if (!playing) return;
    const stepMs = (PLAY_SECONDS * 1000) / lastYear;
    timer.current = window.setInterval(() => {
      setYear((y) => {
        if (y >= lastYear) {
          setPlaying(false);
          return lastYear;
        }
        return y + 1;
      });
    }, stepMs);
    return () => window.clearInterval(timer.current);
  }, [playing, lastYear]);

  const togglePlay = () => {
    if (playing) return setPlaying(false);
    if (year >= lastYear) setYear(0); // restart from the beginning
    setPlaying(true);
  };

  const data = sim.data;
  const blocked = data?.blocked_reason ?? null;

  // Each curve is drawn only up to the selected year; the axes stay fixed so the chart does not jump.
  const rows = useMemo(
    () => data?.years.map((y, i) => ({ year: y, naive: y <= year ? data.naive.series[i] : null, qatra: y <= year ? data.qatra.series[i] : null })) ?? [],
    [data, year],
  );
  const yMax = useMemo(
    () => (data ? Math.ceil(Math.max(data.threshold_ece, ...data.naive.series, ...data.qatra.series) * 1.1 * 2) / 2 : 4),
    [data],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Soil salinity over 30 years</h2>
          <p className="text-sm text-slate-500">Root-zone ECe if the field is irrigated with this treated water, every year.</p>
        </div>
        <label className="text-sm text-slate-600">
          Farm{" "}
          <select value={farmId} onChange={(e) => setFarmId(e.target.value)} className="ml-1 rounded border border-slate-300 bg-white px-2 py-1">
            {(farms.data ?? [{ id: DEFAULT_FARM, crop: "alfalfa" } as Farm]).map((f) => (
              <option key={f.id} value={f.id}>
                {f.id} · {crop(f.crop)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {sim.loading && <Loading label="Simulating 30 years…" />}
      {sim.error && <ErrorBox error={sim.error} onRetry={sim.reload} />}

      {data && !sim.loading && blocked && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
          <p className="font-semibold">Blocked by law: no simulation</p>
          <p className="mt-1 text-sm">
            Farm {data.farm_id} grows {crop(data.crop)}. {blocked.charAt(0).toUpperCase() + blocked.slice(1)}.
          </p>
        </div>
      )}

      {data && !sim.loading && !blocked && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <TagChip tag={data.tag} />
            <span className="text-xs text-slate-500">ESTIMATE: simplified salt balance</span>
          </div>

          <div role="img" aria-label={`Soil ECe over ${lastYear} years for ${crop(data.crop)}, naive allocation versus QATRA, shown up to year ${year}`}>
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={rows} margin={{ top: 16, right: 24, bottom: 28, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" type="number" domain={[0, lastYear]} tickCount={7} label={{ value: "Year", position: "insideBottom", offset: -16 }} />
                <YAxis domain={[0, yMax]} label={{ value: "Soil ECe (dS/m)", angle: -90, position: "insideLeft" }} />
                <Tooltip formatter={(v) => (typeof v === "number" ? `${v.toFixed(2)} dS/m` : v)} labelFormatter={(y) => `Year ${y}`} />
                <Legend verticalAlign="top" height={32} />
                <Line name="Naive allocation" dataKey="naive" stroke={NAIVE.colour} strokeWidth={2.5} strokeDasharray={NAIVE.dash} dot={SquareDot} isAnimationActive={false} />
                <Line name="QATRA" dataKey="qatra" stroke={QATRA.colour} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                <ReferenceLine
                  y={data.threshold_ece}
                  stroke="#0f172a"
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  label={{ value: `${crop(data.crop)} threshold ${data.threshold_ece} dS/m`, position: "insideTopRight", fill: "#334155", fontSize: 12 }}
                />
                <ReferenceDot x={year} y={data.naive.series[year]} r={7} fill="#fff" stroke={NAIVE.colour} strokeWidth={3}
                  label={{ value: data.naive.series[year].toFixed(2), position: "top", fill: NAIVE.colour, fontSize: 12, fontWeight: 600 }} />
                <ReferenceDot x={year} y={data.qatra.series[year]} r={7} fill="#fff" stroke={QATRA.colour} strokeWidth={3}
                  label={{ value: data.qatra.series[year].toFixed(2), position: "bottom", fill: QATRA.colour, fontSize: 12, fontWeight: 600 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={togglePlay} className="w-24 rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800">
              {playing ? "Pause" : "Play"}
            </button>
            <label className="flex min-w-0 flex-1 items-center gap-3 text-sm text-slate-600">
              <span className="w-16 shrink-0 font-semibold text-slate-800">Year {year}</span>
              <input
                type="range" min={0} max={lastYear} step={1} value={year} aria-label="Year"
                onChange={(e) => { setPlaying(false); setYear(Number(e.target.value)); }}
                className="min-w-0 flex-1 accent-teal-700"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Card title="First year over limit" tag={data.tag}>
              <Row name="Naive allocation" colour="text-red-700" value={firstOver(data.naive.first_year_over, lastYear)} />
              <Row name="QATRA" colour="text-green-800" value={firstOver(data.qatra.first_year_over, lastYear)} />
            </Card>
            <Card title="Water used per plan" tag={data.tag}>
              <Row name="Naive allocation" colour="text-red-700" value={`${Math.round(data.naive.water_used_m3_season).toLocaleString()} m³/season`} />
              <Row name="QATRA" colour="text-green-800" value={`${Math.round(data.qatra.water_used_m3_season).toLocaleString()} m³/season`} />
            </Card>
            <Card title="Yield at year 30" tag={data.tag}>
              <Row name="Naive allocation" colour="text-red-700" value={yieldText(data.naive.yield_loss_pct_30y)} />
              <Row name="QATRA" colour="text-green-800" value={yieldText(data.qatra.yield_loss_pct_30y)} />
            </Card>
          </div>

          {data.warning && <p className="rounded bg-amber-50 p-2 text-sm text-amber-900">{data.warning}</p>}
          <p className="text-xs text-slate-400">
            Water EC {data.ecw} dS/m (batch {data.batch_id}). QATRA leaching fraction {data.qatra.leaching_fraction.toFixed(2)}. Soil ECe is simulated.
          </p>
        </div>
      )}
    </section>
  );
}

function Card({ title, tag, children }: { title: string; tag: Tag; children: ReactNode }) {
  return (
    <div className="space-y-2 rounded border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <TagChip tag={tag} showSource={false} />
      </div>
      <dl className="space-y-1 text-sm">{children}</dl>
    </div>
  );
}

function Row({ name, colour, value }: { name: string; colour: string; value: string }) {
  return (
    <div>
      <dt className={`text-xs font-semibold ${colour}`}>{name}</dt>
      <dd className="text-base font-medium text-slate-900">{value}</dd>
    </div>
  );
}
