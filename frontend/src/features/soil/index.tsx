import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { get, post } from "../../api/client";
import type { Farm, SoilSimulateRequest, SoilSimulation } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import Loading from "../../components/Loading";
import TagChip from "../../components/TagChip";
import { useApi } from "../../hooks/useApi";

const DEFAULT_FARM = "A"; // alfalfa
const DEMO_BATCH = "SSUD-20260713"; // EC 2.67 dS/m: the managed-leaching policy can hold alfalfa under its threshold

// Colours are not the only cue: the naive line is dashed with square markers, QATRA is solid with round markers.
const NAIVE = { colour: "#dc2626", dash: "7 4" };
const QATRA = { colour: "#15803d" };

// Square marker for the naive line (the QATRA line keeps the default round dot).
function SquareDot({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) {
  if (cx === undefined || cy === undefined) return null;
  return <rect key={index} x={cx - 3} y={cy - 3} width={6} height={6} fill={NAIVE.colour} />;
}

const crop = (c: string) => c.replace(/_/g, " ");
const year = (y: number | null) => (y === null ? "never" : `year ${y}`);

export default function SoilTab() {
  const [farmId, setFarmId] = useState(DEFAULT_FARM);
  const farms = useApi<Farm[]>(() => get<Farm[]>("/api/farms"));
  const sim = useApi<SoilSimulation>(
    () => post<SoilSimulation>("/api/soil/simulate", { farm_id: farmId, batch_id: DEMO_BATCH } satisfies SoilSimulateRequest),
    [farmId],
  );

  const rows = useMemo(
    () => sim.data?.years.map((y, i) => ({ year: y, naive: sim.data!.naive.series[i], qatra: sim.data!.qatra.series[i] })) ?? [],
    [sim.data],
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
          <select
            value={farmId}
            onChange={(e) => setFarmId(e.target.value)}
            className="ml-1 rounded border border-slate-300 bg-white px-2 py-1"
          >
            {(farms.data ?? [{ id: DEFAULT_FARM, name: "Farm A", crop: "alfalfa" } as Farm]).map((f) => (
              <option key={f.id} value={f.id}>
                {f.id} · {crop(f.crop)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {sim.loading && <Loading label="Simulating 30 years…" />}
      {sim.error && <ErrorBox error={sim.error} onRetry={sim.reload} />}

      {sim.data && !sim.loading && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <TagChip tag={sim.data.tag} />
            <span className="text-xs text-slate-500">ESTIMATE: simplified salt balance</span>
          </div>

          <div role="img" aria-label={`Soil ECe over ${sim.data.years.length - 1} years for ${crop(sim.data.crop)}, naive allocation versus QATRA`}>
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={rows} margin={{ top: 16, right: 24, bottom: 28, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" type="number" domain={[0, "dataMax"]} tickCount={7}
                  label={{ value: "Year", position: "insideBottom", offset: -16 }} />
                <YAxis domain={[0, "auto"]} label={{ value: "Soil ECe (dS/m)", angle: -90, position: "insideLeft" }} />
                <Tooltip formatter={(v) => (typeof v === "number" ? `${v.toFixed(2)} dS/m` : v)} labelFormatter={(y) => `Year ${y}`} />
                <Legend verticalAlign="top" height={32} />
                <Line name="Naive allocation" dataKey="naive" stroke={NAIVE.colour} strokeWidth={2.5} strokeDasharray={NAIVE.dash}
                  dot={SquareDot} isAnimationActive={false} />
                <Line name="QATRA" dataKey="qatra" stroke={QATRA.colour} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                <ReferenceLine
                  y={sim.data.threshold_ece}
                  stroke="#0f172a"
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  label={{ value: `${crop(sim.data.crop)} threshold ${sim.data.threshold_ece} dS/m`, position: "insideTopRight", fill: "#334155", fontSize: 12 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Summary name="Naive allocation" colour="text-red-700" over={sim.data.naive.first_year_over}
              water={sim.data.naive.water_used_m3_season} loss={sim.data.naive.yield_loss_pct_30y} />
            <Summary name="QATRA" colour="text-green-800" over={sim.data.qatra.first_year_over}
              water={sim.data.qatra.water_used_m3_season} loss={sim.data.qatra.yield_loss_pct_30y}
              extra={`leaching fraction ${sim.data.qatra.leaching_fraction.toFixed(2)}`} />
          </dl>

          {sim.data.warning && <p className="rounded bg-amber-50 p-2 text-sm text-amber-900">{sim.data.warning}</p>}
          <p className="text-xs text-slate-400">Water EC {sim.data.ecw} dS/m (batch {sim.data.batch_id}). Soil ECe is simulated.</p>
        </div>
      )}
    </section>
  );
}

function Summary(p: { name: string; colour: string; over: number | null; water: number; loss: number | null; extra?: string }) {
  return (
    <div className="rounded border border-slate-200 p-3">
      <dt className={`font-semibold ${p.colour}`}>{p.name}</dt>
      <dd className="mt-1 text-slate-600">
        Over the threshold: <strong>{year(p.over)}</strong>
        <br />
        Water: {Math.round(p.water).toLocaleString()} m³/season
        <br />
        Yield loss at year 30: {p.loss === null ? "n/a (no published slope)" : `${p.loss}%`}
        {p.extra && (
          <>
            <br />
            {p.extra}
          </>
        )}
      </dd>
    </div>
  );
}
