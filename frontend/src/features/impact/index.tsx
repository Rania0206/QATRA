import type { ReactNode } from "react";
import { get, post } from "../../api/client";
import type { Allocation, BusinessReport, SavingsReport } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import { Band, Intro, Pill, Skeleton } from "../../components/ui";
import { USE_MOCKS } from "../../config";
import { fmtN } from "../../format";
import { useApi } from "../../hooks/useApi";
import { useLang, type Lang } from "../../i18n";
import { project } from "../business/data"; // the same arithmetic as the Business screen, so both show the same numbers
import { Im, growSub, headline, nf, pilotSub } from "./texts";

const ADOPTION = 0.3; // the scale-up shown here: 30 % of the equipped hectares

interface Data {
  savings: SavingsReport;
  allocation: Allocation | null; // only for the solar share
  business: BusinessReport | null; // only for the scale-up
}

/**
 * One screen for the jury: water, energy and dinars. Nothing is computed from scratch: the figures come from
 * POST /api/savings (the pilot's day and season), POST /api/allocate (solar share) and GET /api/business (per hectare, scale-up).
 */
function useImpact() {
  return useApi<Data>(async () => {
    const [savings, allocation, business] = await Promise.all([
      post<SavingsReport>("/api/savings", {}),
      post<Allocation>("/api/allocate", {}).catch(() => null),
      get<BusinessReport>(`/api/business?adoption_rate=${ADOPTION}`).catch(() => null),
    ]);
    return { savings, allocation, business };
  });
}

function Cell({ value, unit, caption }: { value: string; unit: string; caption: string }) {
  return (
    <div className="min-w-0">
      <p dir="ltr" className="break-words font-display text-[22px] font-medium leading-tight sm:text-[28px]">
        {value}
      </p>
      <p className="text-[13px] leading-tight text-ink-soft">
        {unit} · {caption}
      </p>
    </div>
  );
}

interface RowData {
  key: string;
  label: string;
  day?: number;
  season?: number;
  unit: string;
  dayTag: string;
  seasonTag: string;
}

function Block({ title, rows, lang }: { title: string; rows: RowData[]; lang: Lang }) {
  return (
    <div className="mt-5">
      <p className="eyebrow">{title}</p>
      <ul className="mt-1">
        {rows.map((r) => (
          <li key={r.key} className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)] items-start gap-x-3 border-b border-line py-3 last:border-0">
            <span className="text-[16px] leading-snug">{r.label}</span>
            {r.day !== undefined ? <Cell value={nf(r.day, lang)} unit={r.unit} caption={r.dayTag} /> : <span />}
            {r.season !== undefined ? <Cell value={nf(r.season, lang)} unit={r.unit} caption={r.seasonTag} /> : <span />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Panel({ title, sub, note, children, lang }: { title: string; sub: string; note?: string; children: ReactNode; lang: Lang }) {
  return (
    <article className="min-w-0 border border-line bg-white px-5 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-3xl sm:text-4xl">{title}</h2>
        <a href="#/public" className="link text-[15px]">
          {Im.sources[lang]}
        </a>
      </div>
      <p className="mt-1 text-[16px] text-ink-soft">{sub}</p>
      <div className="mt-4 grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 text-[14px] text-ink-soft">
        <span />
        <span>{Im.perDay[lang]}</span>
        <span>{Im.perSeason[lang]}</span>
      </div>
      {children}
      {note && <p className="mt-4 text-[14px] text-ink-soft">{note}</p>}
    </article>
  );
}

export default function ImpactTab() {
  const { lang } = useLang();
  const api = useImpact();
  const d = api.data;

  if (api.error)
    return (
      <Band tone="cream">
        <ErrorBox error={api.error} onRetry={api.reload} />
      </Band>
    );

  if (!d)
    return (
      <>
        <Band tone="olive" className="md:py-24">
          <Intro as="h1" eyebrow={Im.eyebrow[lang]} title={Im.eyebrow[lang]}>
            <p>{Im.lead[lang]}</p>
          </Intro>
        </Band>
        <Band tone="cream" wide>
          <div aria-busy="true" className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </Band>
      </>
    );

  // ---- the pilot: the savings of the default plan (day), its season projection, and the per-hectare pilot figures of /api/business
  const s = d.savings;
  const days = s.assumptions.find((a) => a.name === "irrigation_days")?.value ?? 150;
  const farms = s.items.length;
  const b = d.business;
  const pilotHa = b?.pilot.pilot_ha ?? 0; // the hectares that receive water (the per-hectare figures are per such hectare)
  const pilotNow = b ? project(b.pilot, pilotHa, 1) : undefined; // the pilot hectares at 100 % (= the "Our pilot" row of the Business screen)
  const wellSeason = pilotNow?.water;
  const kwhSeason = pilotNow?.kwh;
  const wellDay = wellSeason !== undefined ? wellSeason / days : undefined;
  const kwhDay = kwhSeason !== undefined ? kwhSeason / days : undefined;
  const solar = d.allocation ? d.allocation.solar_share * 100 : undefined;

  const est = Im.estimate[lang];
  const proj = Im.projection[lang];
  const mk = (key: string, label: string, day: number | undefined, season: number | undefined, unit: string): RowData => ({
    key, label, day, season, unit, dayTag: est, seasonTag: proj,
  });

  // ---- the scale-up: GET /api/business at 30 % adoption of the equipped hectares (per year = per season with one season a year)
  const eq = b?.scenarios.find((x) => x.id === "equipped");
  const grown = b && eq ? project(b.pilot, eq.ha, b.adoption_rate) : undefined; // same as the Business screen at that adoption rate
  const seasons = b?.pilot.seasons_per_year ?? 1;
  const perSeason = (yearly: number) => yearly / seasons;
  const perDay = (yearly: number) => yearly / seasons / days;
  const grow = (label: string, key: string, yearly: number | undefined, unit: string): RowData => ({
    key, label, unit, dayTag: proj, seasonTag: proj,
    day: yearly === undefined ? undefined : perDay(yearly),
    season: yearly === undefined ? undefined : perSeason(yearly),
  });

  return (
    <>
      <Band tone="olive" className="md:py-24">
        <Intro as="h1" eyebrow={Im.eyebrow[lang]} title={wellDay !== undefined ? headline(farms, s.day.farmer_net_tnd, wellDay, lang) : Im.eyebrow[lang]}>
          <p>{Im.lead[lang]}</p>
          <p className="mt-3 text-[15px]">{Im.leadNote[lang]}</p>
        </Intro>
      </Band>

      <Band tone="cream" wide>
        {USE_MOCKS && <p className="mb-6 text-center text-[15px]">{Im.mockNote[lang]}</p>}
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Panel title={Im.pilotTitle[lang]} sub={pilotSub(farms, b?.pilot.total_area_ha ?? 0, days, lang)} lang={lang}>
            <Block
              title={Im.water[lang]}
              lang={lang}
              rows={[mk("treated", Im.treated[lang], s.day.m3, s.season.m3, Im.m3[lang]), mk("well", Im.well[lang], wellDay, wellSeason, Im.m3[lang])]}
            />
            <Block
              title={Im.energy[lang]}
              lang={lang}
              rows={[
                mk("kwh", Im.kwh[lang], kwhDay, kwhSeason, Im.kwhUnit[lang]),
                ...(solar !== undefined
                  ? [{ key: "solar", label: Im.solar[lang], day: solar, unit: "%", dayTag: est, seasonTag: est } as RowData]
                  : []),
              ]}
            />
            <Block
              title={Im.money[lang]}
              lang={lang}
              rows={[
                mk("farmers", Im.farmers[lang], s.day.farmer_net_tnd, s.season.farmer_net_tnd, Im.tnd[lang]),
                mk("qatra", `${Im.qatra[lang]} (${Im.qatraShare[lang]})`, s.day.qatra_fee_tnd, s.season.qatra_fee_tnd, Im.tnd[lang]),
              ]}
            />
          </Panel>

          {eq && b ? (
            <Panel title={Im.growTitle[lang]} sub={growSub(b.adoption_rate * 100, eq.ha * b.adoption_rate, eq.ha, lang)} note={Im.growNote[lang]} lang={lang}>
              <Block title={Im.water[lang]} lang={lang} rows={[grow(Im.well[lang], "g-well", grown?.water, Im.m3[lang])]} />
              <p className="mt-1 text-[13px] text-ink-soft">{Im.noGrowWater[lang]}</p>
              <Block title={Im.energy[lang]} lang={lang} rows={[grow(Im.kwh[lang], "g-kwh", grown?.kwh, Im.kwhUnit[lang])]} />
              <Block
                title={Im.money[lang]}
                lang={lang}
                rows={[
                  grow(Im.farmers[lang], "g-farmers", grown?.farmers, Im.tnd[lang]),
                  grow(`${Im.qatra[lang]} (${Im.qatraShare[lang]})`, "g-qatra", grown?.qatra, Im.tnd[lang]),
                ]}
              />
              <div className="mt-4 flex flex-wrap items-center gap-3 text-[14px]">
                <Pill tone="ok">{fmtN(eq.ha, lang, 0)} {Im.hectaresReported[lang]}</Pill>
                <a href="#/territory" className="link">
                  {Im.moreBusiness[lang]}
                </a>
              </div>
            </Panel>
          ) : (
            <Panel title={Im.growTitle[lang]} sub="" lang={lang}>
              <p className="mt-4 text-[16px]">{Im.growMissing[lang]}</p>
            </Panel>
          )}
        </div>
      </Band>
    </>
  );
}
