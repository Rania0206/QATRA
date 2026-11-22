import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { post } from "../../api/client";
import type { SoilSimulateRequest, SoilSimulation } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import FarmCodeForm from "../../components/FarmCodeForm";
import { Band, Intro, Skeleton } from "../../components/ui";
import { getFarmCode, saveFarmCode } from "../../farm";
import { useApi } from "../../hooks/useApi";
import { useLang } from "../../i18n";
import { fmtNumber } from "../batches/format";
import { cropName } from "../compatibility/format";
import { S, blockedText, soilVerdict, yearText, yieldText } from "./texts";

const DEMO_BATCH = "SSUD-20260713"; // EC 2.67 dS/m: the managed-leaching policy can hold alfalfa under its threshold
const PLAY_SECONDS = 6; // a full sweep 0 -> 30 for the live pitch

// Colours are not the only cue: the usual-irrigation line is dashed with square markers, QATRA is solid with round markers.
const NAIVE = { colour: "#9e2a2b", dash: "7 4" };
const QATRA = { colour: "#3d6b26" };
const INK = "#1b1b1a";
const SOFT = "#3a3834";
const LINE = "#d9cfc1";

// Square marker for the usual-irrigation line (the QATRA line keeps the default round dot).
function SquareDot({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) {
  if (cx === undefined || cy === undefined) return null;
  return <rect key={index} x={cx - 3} y={cy - 3} width={6} height={6} fill={NAIVE.colour} />;
}

/** The soil simulation for one farm only: the farmer's own code, never a list of farms. */
export default function SoilTab() {
  const { lang } = useLang();
  const [farmCode, setFarmCode] = useState<string | null>(getFarmCode);

  const sim = useApi<SoilSimulation | null>(
    () =>
      farmCode
        ? post<SoilSimulation>("/api/soil/simulate", { farm_id: farmCode, batch_id: DEMO_BATCH } satisfies SoilSimulateRequest)
        : Promise.resolve(null),
    [farmCode],
  );

  const data = sim.data ?? undefined;
  const lastYear = data ? data.years[data.years.length - 1] : 30;
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

  const choose = (code: string) => {
    setFarmCode(code);
    saveFarmCode(code);
  };
  const change = () => {
    setFarmCode(null);
    saveFarmCode(null);
  };

  const blocked = data?.blocked_reason ?? null;
  const crop = data ? cropName(data.crop, lang) : "";

  // Each curve is drawn only up to the selected year; the axes stay fixed so the chart does not jump.
  const rows = useMemo(
    () => data?.years.map((y, i) => ({ year: y, naive: y <= year ? data.naive.series[i] : null, qatra: y <= year ? data.qatra.series[i] : null })) ?? [],
    [data, year],
  );
  const yMax = useMemo(
    () => (data ? Math.ceil(Math.max(data.threshold_ece, ...data.naive.series, ...data.qatra.series) * 1.1 * 2) / 2 : 4),
    [data],
  );

  const verdict = data && !blocked ? soilVerdict(data, lang) : null;

  return (
    <>
      <Band tone="olive" className="md:py-24">
        <Intro as="h1" size="xl" eyebrow={S.eyebrow[lang]} title={S.title[lang]}>
          <p>{S.lead[lang]}</p>
        </Intro>
        {!farmCode && <FarmCodeForm onSubmit={choose} />}
        {farmCode && data && (
          <p className="fade-up mt-8 text-center text-[17px]">
            {S.yourCrop[lang]}: <strong className="font-medium">{crop}</strong> ·{" "}
            <button type="button" onClick={change} className="link text-[15px]">
              {S.change[lang]}
            </button>
          </p>
        )}
      </Band>

      {farmCode && (
        <Band tone="cream" wide>
          {sim.loading ? (
            <div className="space-y-4" aria-busy="true" aria-label={S.simulating[lang]}>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : sim.error ? (
            <div className="space-y-4">
              <ErrorBox error={sim.error} onRetry={sim.reload} />
              <p className="text-center">
                <button type="button" onClick={change} className="link">
                  {S.change[lang]}
                </button>
              </p>
            </div>
          ) : data && blocked ? (
            <div role="alert" className="mx-auto max-w-2xl border border-bad px-6 py-8 text-center">
              <h2 className="text-3xl text-bad">{S.blockedTitle[lang]}</h2>
              <p className="mt-3 text-[18px]">{blockedText(crop, lang)}</p>
            </div>
          ) : data && verdict ? (
            <div className="space-y-10">
              <p
                className={`mx-auto max-w-3xl border-s-4 ps-5 font-display text-[26px] leading-snug ${
                  verdict.tone === "ok" ? "border-ok" : "border-warn"
                }`}
              >
                {verdict.text}
              </p>

              <div dir="ltr" role="img" aria-label={`${S.axisY[lang]}, ${S.year[lang]} 0–${lastYear}: ${S.usual[lang]} / ${S.plan[lang]}`}>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={rows} margin={{ top: 16, right: 24, bottom: 32, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
                    <XAxis
                      dataKey="year"
                      type="number"
                      domain={[0, lastYear]}
                      tickCount={7}
                      tick={{ fill: SOFT, fontSize: 14 }}
                      label={{ value: S.year[lang], position: "insideBottom", offset: -18, fill: SOFT, fontSize: 14 }}
                    />
                    <YAxis
                      domain={[0, yMax]}
                      tick={{ fill: SOFT, fontSize: 14 }}
                      label={{ value: S.axisY[lang], angle: -90, position: "insideLeft", fill: SOFT, fontSize: 14 }}
                    />
                    <Tooltip formatter={(v) => (typeof v === "number" ? `${v.toFixed(2)} dS/m` : v)} labelFormatter={(y) => `${S.year[lang]} ${y}`} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 15 }} />
                    <Line name={S.usual[lang]} dataKey="naive" stroke={NAIVE.colour} strokeWidth={2.5} strokeDasharray={NAIVE.dash} dot={SquareDot} isAnimationActive={false} />
                    <Line name={S.plan[lang]} dataKey="qatra" stroke={QATRA.colour} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                    <ReferenceLine
                      y={data.threshold_ece}
                      stroke={INK}
                      strokeDasharray="5 4"
                      strokeWidth={1.5}
                      label={{ value: `${crop} · ${data.threshold_ece} dS/m`, position: "insideTopRight", fill: INK, fontSize: 14 }}
                    />
                    <ReferenceDot x={year} y={data.naive.series[year]} r={7} fill="#fff" stroke={NAIVE.colour} strokeWidth={3}
                      label={{ value: data.naive.series[year].toFixed(2), position: "top", fill: NAIVE.colour, fontSize: 14, fontWeight: 600 }} />
                    <ReferenceDot x={year} y={data.qatra.series[year]} r={7} fill="#fff" stroke={QATRA.colour} strokeWidth={3}
                      label={{ value: data.qatra.series[year].toFixed(2), position: "bottom", fill: QATRA.colour, fontSize: 14, fontWeight: 600 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-4">
                <button type="button" onClick={togglePlay} className="btn min-w-32 bg-ink text-cream">
                  {playing ? S.pause[lang] : S.play[lang]}
                </button>
                <label className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="w-24 shrink-0 font-medium">
                    {S.year[lang]} {year}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={lastYear}
                    step={1}
                    value={year}
                    aria-label={S.year[lang]}
                    onChange={(e) => {
                      setPlaying(false);
                      setYear(Number(e.target.value));
                    }}
                    className="min-w-0 flex-1 accent-ink"
                  />
                </label>
              </div>

              <div className="grid gap-x-10 gap-y-8 md:grid-cols-3">
                <Stat title={S.firstOver[lang]}>
                  <Row name={S.usual[lang]} colour="text-bad" value={yearText(data.naive.first_year_over, lastYear, lang)} />
                  <Row name={S.plan[lang]} colour="text-ok" value={yearText(data.qatra.first_year_over, lastYear, lang)} />
                </Stat>
                <Stat title={S.waterUsed[lang]}>
                  <Row name={S.usual[lang]} colour="text-bad" value={`${fmtNumber(Math.round(data.naive.water_used_m3_season))} ${S.perSeason[lang]}`} />
                  <Row name={S.plan[lang]} colour="text-ok" value={`${fmtNumber(Math.round(data.qatra.water_used_m3_season))} ${S.perSeason[lang]}`} />
                </Stat>
                <Stat title={S.yield30[lang]}>
                  <Row name={S.usual[lang]} colour="text-bad" value={yieldText(data.naive.yield_loss_pct_30y, lang)} />
                  <Row name={S.plan[lang]} colour="text-ok" value={yieldText(data.qatra.yield_loss_pct_30y, lang)} />
                </Stat>
              </div>

              {data.warning && <p className="border-s-2 border-warn ps-4 text-[15px]">{data.warning}</p>}
              <p className="text-center text-[15px] text-ink-soft">
                {S.basedOn[lang]} <span dir="ltr">{data.batch_id}</span> · {S.waterSalt[lang]} {data.ecw} dS/m. {S.estimate[lang]}
              </p>
            </div>
          ) : null}
        </Band>
      )}
    </>
  );
}

function Stat({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="border-b border-ink pb-3 text-2xl">{title}</h3>
      <dl className="mt-3 space-y-3">{children}</dl>
    </section>
  );
}

function Row({ name, colour, value }: { name: string; colour: string; value: string }) {
  return (
    <div>
      <dt className={`text-[15px] font-medium ${colour}`}>{name}</dt>
      <dd className="text-[19px]">{value}</dd>
    </div>
  );
}
