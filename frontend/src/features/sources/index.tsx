import { useMemo, useState, type ReactNode } from "react";
import { get, post } from "../../api/client";
import type { BusinessReport, MetaSources, SafeFigure, SavingsReport, SourceRow, TagStatus } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import { Band, Intro, Pill, Skeleton } from "../../components/ui";
import { fmtN } from "../../format";
import { useApi } from "../../hooks/useApi";
import { fmtDateL, useLang, type Lang } from "../../i18n";
import { assumptionName, assumptionValue, STATUS } from "../savings/texts";
import { LEGEND, SF_LABEL, Sx, refInfo, refOrder, tagOf, unitText } from "./texts";

interface RuleRow {
  rule_id: string;
  source_type: "tunisian_law" | "agronomic_advice";
  legal_ref: string;
}

const TAG_ORDER: (TagStatus | "OTHER")[] = ["TO_VERIFY", "SIMULATED", "ESTIMATE", "PROJECTION", "REPORTED", "OTHER"];

function TagPill({ tag, lang }: { tag: TagStatus; lang: Lang }) {
  return <Pill tone={STATUS[tag].tone}>{STATUS[tag].label[lang]}</Pill>;
}

function Section({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="mt-14 first:mt-0">
      <h2 className="text-3xl sm:text-4xl">{title}</h2>
      {lead && <p className="mt-2 max-w-3xl text-[length:calc(17px*var(--fs))] text-ink-soft">{lead}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const Loadingbars = () => (
  <div aria-busy="true" className="space-y-3">
    <Skeleton className="h-16 w-full" />
    <Skeleton className="h-16 w-full" />
    <Skeleton className="h-16 w-full" />
  </div>
);

const when = (v: string | null | undefined, lang: Lang) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? fmtDateL(v, lang) : (v ?? ""));

interface KeyFig {
  key: string;
  label: string;
  value?: string;
  unit?: string;
  tag?: TagStatus;
  text?: string;
  year?: string;
  yearIsDate?: boolean; // a full publication date, labelled "Published" instead of "Year"
  source?: string;
  url?: string | null;
}

/** One key figure: the number, its tag, what it is, its year and its source. A missing figure says "to be added". */
function FigureCard({ f, lang }: { f: KeyFig; lang: Lang }) {
  return (
    <li className="min-w-0 border border-line bg-white px-5 py-4">
      <p className="text-[length:calc(16px*var(--fs))] text-ink-soft">{f.label}</p>
      {f.value === undefined ? (
        <p className="mt-2 text-[length:calc(18px*var(--fs))] text-warn">{Sx.toAdd[lang]}</p>
      ) : (
        <>
          <p dir="ltr" className="mt-1 break-words font-display text-[length:calc(34px*var(--fs)*var(--fsn))] font-medium leading-tight">
            {f.value} <span className="text-[0.5em]">{f.unit}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">{f.tag && <TagPill tag={f.tag} lang={lang} />}</div>
          {f.text && <p className="mt-2 text-[length:calc(15px*var(--fs))] leading-snug">{f.text}</p>}
          <p className="mt-2 break-words text-[length:calc(14px*var(--fs))] text-ink-soft">
            {f.year && (
              <>
                {f.yearIsDate ? Sx.published[lang] : Sx.year[lang]}: {f.year} ·{" "}
              </>
            )}
            {f.source}{" "}
            {f.url ? (
              <a href={f.url} target="_blank" rel="noreferrer" className="link">
                {Sx.open[lang]}
              </a>
            ) : (
              <span>({Sx.noLink[lang]})</span>
            )}
          </p>
        </>
      )}
    </li>
  );
}

function KeyFigures({ meta, savings, business, lang }: { meta: MetaSources; savings?: SavingsReport; business?: BusinessReport; lang: Lang }) {
  const sf = (id: string): KeyFig => {
    const f: SafeFigure | undefined = meta.safe_figures.find((x) => x.id === id);
    const label = SF_LABEL[id]?.[lang] ?? id;
    if (!f) return { key: id, label };
    const num = Number(f.value);
    return {
      key: id,
      label,
      value: Number.isFinite(num) ? fmtN(num, lang, 1) : f.value,
      unit: unitText(f.unit),
      tag: (tagOf(f.status) ?? "REPORTED") as TagStatus,
      text: f.definition,
      year: when(f.as_of, lang),
      yearIsDate: /^\d{4}-\d{2}-\d{2}$/.test(f.as_of),
      source: f.source_name,
      url: f.source_url,
    };
  };
  const irrigated = business?.territory.find((t) => t.key === "irrigated_ha");
  const elec = savings?.assumptions.find((a) => a.name === "electricity_price");
  const steg: SourceRow | undefined = meta.sources.find((s) => s.id === "D26"); // STEG tariffs, in the catalogue
  const figs: KeyFig[] = [
    sf("SF1"),
    sf("SF2"),
    sf("SF3"),
    irrigated
      ? { key: "irrigated", label: Sx.kIrrigated[lang], value: fmtN(irrigated.value, lang, 0), unit: "ha", tag: "REPORTED", year: irrigated.period, source: irrigated.source, url: irrigated.source_url, text: irrigated.note ?? undefined }
      : { key: "irrigated", label: Sx.kIrrigated[lang] },
    elec && steg
      ? {
          key: "elec",
          label: Sx.kElectricity[lang],
          value: fmtN(elec.value * 1000, lang, 1),
          unit: Sx.millimes[lang],
          tag: elec.status,
          text: Sx.kElectricityNote[lang],
          year: steg.publication_date ?? undefined,
          source: steg.source_name,
          url: steg.source_url,
        }
      : { key: "elec", label: Sx.kElectricity[lang] },
    sf("SF5"),
  ];
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {figs.map((f) => (
        <FigureCard key={f.key} f={f} lang={lang} />
      ))}
    </ul>
  );
}

function Rules({ rules, lang }: { rules: RuleRow[]; lang: Lang }) {
  const groups = useMemo(() => {
    const m = new Map<string, { ref: string; type: RuleRow["source_type"]; n: number }>();
    for (const r of rules) {
      const g = m.get(r.legal_ref) ?? { ref: r.legal_ref, type: r.source_type, n: 0 };
      g.n += 1;
      m.set(r.legal_ref, g);
    }
    return [...m.values()].sort((a, b) => (a.type === b.type ? refOrder(a.ref) - refOrder(b.ref) : a.type === "tunisian_law" ? -1 : 1));
  }, [rules]);
  return (
    <ul className="grid gap-3">
      {groups.map((g) => {
        const info = refInfo(g.ref, lang);
        const advice = g.type === "agronomic_advice";
        return (
          <li key={g.ref} className="min-w-0 border border-line bg-white px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[length:calc(20px*var(--fs))]">{info.title}</h3>
              <span className="flex flex-wrap items-center gap-2">
                <Pill tone={advice ? "warn" : "good"}>{advice ? Sx.advice[lang] : Sx.law[lang]}</Pill>
                <span className="text-[length:calc(14px*var(--fs))] text-ink-soft">
                  <span dir="ltr">{g.n}</span> {g.n === 1 ? Sx.rule[lang] : Sx.rules[lang]}
                </span>
              </span>
            </div>
            {info.meaning && <p className="mt-2 text-[length:calc(16px*var(--fs))] leading-snug">{info.meaning}</p>}
            <p dir="ltr" className="mt-1.5 break-words text-start text-[length:calc(13px*var(--fs))] text-ink-soft">
              {g.ref}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function Prices({ report, lang }: { report: SavingsReport; lang: Lang }) {
  return (
    <>
      <p className="mb-2 text-[length:calc(15px*var(--fs))] text-ink-soft">{Sx.toVerifyHint[lang]}</p>
      <ul className="border border-line bg-white px-4 sm:px-5">
        {report.assumptions.map((a) => {
          const verify = a.status === "TO_VERIFY";
          return (
            <li key={a.name} className={`border-t border-line py-3 first:border-0 ${verify ? "bg-warn-soft px-3" : ""}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-[length:calc(16px*var(--fs))] font-medium">{assumptionName(a, lang)}</span>
                <span dir="ltr" className="text-[length:calc(16px*var(--fs))]">
                  {assumptionValue(a, lang)}
                </span>
              </div>
              <div className="mt-1.5">
                <TagPill tag={a.status} lang={lang} />
              </div>
              <p className="mt-1.5 break-words text-[length:calc(14px*var(--fs))] text-ink-soft">
                {Sx.source[lang]}: {a.source}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Datasets({ rows, lang }: { rows: SourceRow[]; lang: Lang }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle ? rows.filter((r) => `${r.id} ${r.title} ${r.source_name} ${r.definition ?? ""}`.toLowerCase().includes(needle)) : rows;
  const groups = TAG_ORDER.map((t) => ({ t, rows: shown.filter((r) => (tagOf(r.status) ?? "OTHER") === t) })).filter((g) => g.rows.length > 0);
  return (
    <>
      <label className="flex max-w-md flex-col gap-1.5 text-[length:calc(15px*var(--fs))]">
        <span>{Sx.search[lang]}</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={Sx.searchHint[lang]}
          className="border border-ink bg-cream px-3 py-2.5 text-[length:calc(17px*var(--fs))] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
      </label>
      {groups.length === 0 && <p className="mt-4 text-[length:calc(16px*var(--fs))]">{Sx.noMatch[lang]}</p>}
      <div className="mt-4 space-y-3">
        {groups.map((g) => (
          <details key={`${g.t}-${needle ? "q" : "n"}`} open={g.t === "TO_VERIFY" || !!needle} className="group border border-line bg-white px-4 py-3 sm:px-5">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 text-[length:calc(18px*var(--fs))] font-medium">
              {g.t === "OTHER" ? <Pill tone="neutral">{Sx.other[lang]}</Pill> : <TagPill tag={g.t} lang={lang} />}
              <span dir="ltr" className="text-ink-soft">
                {g.rows.length}
              </span>
              <span className="ms-auto inline-block transition-transform group-open:rotate-90 rtl:rotate-180 rtl:group-open:rotate-90">›</span>
            </summary>
            <ul className="mt-3">
              {g.rows.map((r) => (
                <li key={r.id} className={`border-t border-line py-3 ${g.t === "TO_VERIFY" ? "bg-warn-soft px-3" : ""}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="text-[length:calc(16px*var(--fs))] font-medium">{r.title}</span>
                    <span dir="ltr" className="text-[length:calc(13px*var(--fs))] text-ink-soft">
                      {r.id}
                    </span>
                  </div>
                  {r.definition && r.definition !== "-" && <p className="mt-1 text-[length:calc(15px*var(--fs))] leading-snug">{r.definition}</p>}
                  <p className="mt-1.5 break-words text-[length:calc(14px*var(--fs))] text-ink-soft">
                    {Sx.provider[lang]}: {r.source_name}
                    {r.publication_date ? ` · ${Sx.year[lang]}: ${r.publication_date}` : ""}
                    {r.scope && r.scope !== "-" ? ` · ${Sx.scope[lang]}: ${r.scope}` : ""}{" "}
                    {r.source_url ? (
                      <a href={r.source_url} target="_blank" rel="noreferrer" className="link">
                        {Sx.open[lang]}
                      </a>
                    ) : (
                      <span>({Sx.noLink[lang]})</span>
                    )}
                  </p>
                  <p className="mt-1 break-words text-[length:calc(13px*var(--fs))] text-ink-soft">
                    {Sx.catalogStatus[lang]}: <span dir="ltr">{r.status}</span> · {Sx.file[lang]}: <span dir="ltr">{r.file}</span>
                  </p>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </>
  );
}

/** "Where does this number come from?" One page: tags, key figures, the rules, the prices we assume, every dataset. */
export default function SourcesTab() {
  const { lang } = useLang();
  const meta = useApi<MetaSources>(() => get<MetaSources>("/api/meta/sources"));
  const rules = useApi<RuleRow[]>(() => get<RuleRow[]>("/api/rules"));
  const savings = useApi<SavingsReport>(() => post<SavingsReport>("/api/savings", {}));
  const business = useApi<BusinessReport>(() => get<BusinessReport>("/api/business"));

  return (
    <>
      <Band tone="olive">
        <Intro as="h1" size="xl" eyebrow={Sx.eyebrow[lang]} title={Sx.title[lang]}>
          <p>{Sx.lead[lang]}</p>
          {Sx.englishNote[lang] && <p className="mt-3 text-[length:calc(15px*var(--fs))]">{Sx.englishNote[lang]}</p>}
        </Intro>
      </Band>

      <Band tone="cream" wide>
        <div className="mx-auto max-w-4xl">
          <Section title={Sx.legendTitle[lang]}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {LEGEND.map((l) => (
                <li key={l.tag} className={`flex min-w-0 flex-col items-start gap-2 border border-line bg-white px-5 py-4 ${l.tag === "TO_VERIFY" ? "bg-warn-soft" : ""}`}>
                  <TagPill tag={l.tag} lang={lang} />
                  <p className="text-[length:calc(16px*var(--fs))] leading-snug">{l.sentence[lang]}</p>
                </li>
              ))}
            </ul>
          </Section>

          <Section title={Sx.keyTitle[lang]} lead={Sx.keyLead[lang]}>
            {meta.error ? (
              <ErrorBox error={meta.error} onRetry={meta.reload} />
            ) : !meta.data ? (
              <Loadingbars />
            ) : (
              <KeyFigures meta={meta.data} savings={savings.data} business={business.data} lang={lang} />
            )}
          </Section>

          <Section title={Sx.rulesTitle[lang]} lead={Sx.rulesLead[lang]}>
            {rules.error ? <ErrorBox error={rules.error} onRetry={rules.reload} /> : !rules.data ? <Loadingbars /> : rules.data.length === 0 ? <p>{Sx.empty[lang]}</p> : <Rules rules={rules.data} lang={lang} />}
          </Section>

          <Section title={Sx.pricesTitle[lang]} lead={Sx.pricesLead[lang]}>
            {savings.error ? <ErrorBox error={savings.error} onRetry={savings.reload} /> : !savings.data ? <Loadingbars /> : <Prices report={savings.data} lang={lang} />}
          </Section>

          <Section title={Sx.dataTitle[lang]} lead={Sx.dataLead[lang]}>
            {meta.error ? <ErrorBox error={meta.error} onRetry={meta.reload} /> : !meta.data ? <Loadingbars /> : meta.data.sources.length === 0 ? <p>{Sx.empty[lang]}</p> : <Datasets rows={meta.data.sources} lang={lang} />}
          </Section>
        </div>
      </Band>
    </>
  );
}
