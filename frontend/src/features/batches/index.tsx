import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { get } from "../../api/client";
import type { Batch } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import { Band, Intro, Segmented, Skeleton } from "../../components/ui";
import { useLang, type Tr } from "../../i18n";
import BatchDrawer from "./BatchDrawer";
import BatchesTable, { TableSkeleton } from "./BatchesTable";
import { B, PERIMETER, fmtDate, fmtNumber } from "./format";
import { CompliancePill } from "./pills";

type Filter = "all" | "valid" | "problem";

const FILTERS: { id: Filter; label: Tr; test: (b: Batch) => boolean }[] = [
  { id: "all", label: B.all, test: () => true },
  { id: "valid", label: B.testsOk, test: (b) => b.analysis_status === "valid" },
  { id: "problem", label: B.testsBad, test: (b) => b.analysis_status !== "valid" },
];

const newestFirst = (a: Batch, b: Batch) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id);

function Figure({ value, unit, caption, children }: { value: string; unit: string; caption: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 text-center">
      <p dir="ltr" className="font-display text-6xl leading-none tabular-nums md:text-7xl">
        {value}
        <span className="ms-2 text-3xl">{unit}</span>
      </p>
      <p className="eyebrow">{caption}</p>
      <div className="flex flex-wrap justify-center gap-2">{children}</div>
    </div>
  );
}

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

const summary = (n: number, expired: number): Tr => ({
  en: `${n} batches. ${expired} had a lab test that was too old. Tap a batch to see its tests.`,
  fr: `${n} lots. ${expired} avaient un test de laboratoire trop ancien. Touchez un lot pour voir ses tests.`,
  ar: `${n} دفعة. ${expired} منها بتحليل قديم. اضغط على دفعة لرؤية تحاليلها.`,
});

export default function BatchesTab() {
  const { lang } = useLang();
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Batch | null>(null);

  const load = useCallback(() => {
    setError(null);
    setBatches(null);
    get<Batch[]>("/api/batches")
      .then((data) => setBatches([...data].sort(newestFirst)))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(load, [load]);
  const close = useCallback(() => setSelected(null), []);

  const all = useMemo(() => batches ?? [], [batches]);
  const latest = all[0];
  const expired = all.filter((b) => b.analysis_status === "expired").length;
  const visible = all.filter(FILTERS.find((f) => f.id === filter)!.test);

  return (
    <>
      {/* Hero */}
      <Band tone="olive">
        <Intro as="h1" size="xl" eyebrow={B.eyebrow[lang]} title={B.title[lang]}>
          <p>{B.lead[lang]}</p>
          <button type="button" className="btn mt-5" onClick={() => scrollTo("daily")}>
            {B.see[lang]}
          </button>
        </Intro>
      </Band>

      {/* Key figures */}
      <Band tone="khaki" wide>
        <div className="grid gap-14 md:grid-cols-3 md:gap-6">
          <Figure value={fmtNumber(PERIMETER.equipped_ha)} unit="ha" caption={B.equipped[lang]} />
          <Figure value={fmtNumber(PERIMETER.delivered_m3)} unit="m³" caption={B.delivered[lang]} />
          {latest ? (
            <Figure value={fmtNumber(latest.volume_m3)} unit="m³" caption={`${B.todayBatch[lang]} · ${fmtDate(latest.date, lang)}`}>
              <CompliancePill status={latest.status} />
            </Figure>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-16 w-48" />
              <Skeleton className="h-5 w-40" />
            </div>
          )}
        </div>
        <p className="mt-14 text-center text-[length:calc(15px*var(--fs))]">{B.source[lang]}</p>
      </Band>

      {/* Daily batches */}
      <Band tone="cream" wide id="daily">
        <Intro eyebrow={B.dailyEyebrow[lang]} title={B.dailyTitle[lang]}>
          {batches && <p>{summary(all.length, expired)[lang]}</p>}
        </Intro>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
          <Segmented
            label={B.dailyEyebrow[lang]}
            value={filter}
            onChange={setFilter}
            options={FILTERS.map((f) => ({
              id: f.id,
              label: (
                <>
                  {f.label[lang]}
                  {batches && <span> ({all.filter(f.test).length})</span>}
                </>
              ),
            }))}
          />
        </div>

        <div className="mt-6">
          {error ? (
            <ErrorBox error={error} onRetry={load} />
          ) : batches === null ? (
            <TableSkeleton />
          ) : visible.length === 0 ? (
            <p className="border-y border-line py-12 text-center font-display text-3xl">
              {all.length === 0 ? B.noBatches[lang] : B.noMatch[lang]}
            </p>
          ) : (
            <BatchesTable batches={visible} latestId={latest?.id} selectedId={selected?.id} onSelect={setSelected} />
          )}
        </div>
      </Band>

      {selected && <BatchDrawer batch={selected} onClose={close} />}
    </>
  );
}
