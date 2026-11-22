import { get } from "../../api/client";
import type { ImpactSummary, MetaSources, SafeFigure } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import Loading from "../../components/Loading";
import TagChip from "../../components/TagChip";
import { Band, Intro } from "../../components/ui";
import { useApi } from "../../hooks/useApi";
import { fmtDateL, useLang } from "../../i18n";
import { PB } from "./texts";

const n0 = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 0 });

/** Units as the data writes them (m3, degC) shown with proper signs. */
const unitText = (u: string) => u.replace(/\bm3\b/g, "m³").replace("degC", "°C");

function Big({ value, unit, label, tag }: { value: string; unit?: string; label: string; tag: ImpactSummary["tag"] }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p dir="ltr" className="font-display text-6xl leading-none tabular-nums md:text-7xl">
        {value}
        {unit && <span className="ms-2 text-3xl">{unit}</span>}
      </p>
      <p className="text-[length:calc(18px*var(--fs))]">{label}</p>
      <TagChip tag={tag} showSource={false} />
    </div>
  );
}

function Figure({ f, lang }: { f: SafeFigure; lang: "en" | "fr" | "ar" }) {
  return (
    <li className="border-b border-line py-6">
      <p className="eyebrow">{f.label}</p>
      <p dir="ltr" className="mt-1 font-display text-4xl tabular-nums">
        {f.value} <span className="text-2xl">{unitText(f.unit)}</span>
      </p>
      <p className="mt-2 text-[length:calc(17px*var(--fs))]">{f.definition}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[length:calc(16px*var(--fs))]">
        <TagChip tag={{ status: f.status as "REPORTED" | "PROJECTION" }} />
        <span className="text-ink-soft">
          {PB.as_of[lang]} {fmtDateL(f.as_of, lang)}
        </span>
        <a className="underline" href={f.source_url} target="_blank" rel="noreferrer">
          {f.source_name} · {PB.open[lang]}
        </a>
      </div>
    </li>
  );
}

export default function PublicTab() {
  const { lang } = useLang();
  const impact = useApi<ImpactSummary>(() => get<ImpactSummary>("/api/impact"));
  const meta = useApi<MetaSources>(() => get<MetaSources>("/api/meta/sources"));
  const d = impact.data;

  return (
    <>
      <Band tone="olive">
        <Intro as="h1" size="xl" eyebrow={PB.eyebrow[lang]} title={PB.title[lang]}>
          <p>{PB.lead[lang]}</p>
        </Intro>
      </Band>

      <Band tone="cream" wide>
        {impact.loading && !d && <Loading />}
        {impact.error && <ErrorBox error={impact.error} onRetry={impact.reload} />}
        {d && (
          <>
            <p className="eyebrow mb-10 text-center">{d.period}</p>
            <div className="fade-up grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              <Big value={n0(d.fresh_water_saved_m3)} unit="m³" label={PB.fresh[lang]} tag={d.tag} />
              <Big value={n0(d.tww_allocated_m3)} unit="m³" label={PB.tww[lang]} tag={d.tag} />
              <Big value={`${Math.round(d.solar_share * 100)}`} unit="%" label={PB.solar[lang]} tag={d.tag} />
              <Big value={n0(d.farms_served)} label={PB.farms[lang]} tag={d.tag} />
              <Big value={n0(d.batches_blocked)} label={PB.blocked[lang]} tag={d.tag} />
            </div>
          </>
        )}
      </Band>

      <Band tone="sand">
        <Intro eyebrow={PB.sourcesEyebrow[lang]} title={PB.sourcesTitle[lang]}>
          <p>{PB.sourcesLead[lang]}</p>
        </Intro>
        <div className="mt-10">
          {meta.loading && !meta.data && <Loading />}
          {meta.error && <ErrorBox error={meta.error} onRetry={meta.reload} />}
          {meta.data && (
            <ul>
              {meta.data.safe_figures.map((f) => (
                <Figure key={f.id} f={f} lang={lang} />
              ))}
            </ul>
          )}
        </div>
      </Band>
    </>
  );
}
