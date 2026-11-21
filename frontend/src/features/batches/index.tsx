import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { get } from "../../api/client";
import type { Batch, Tag } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import TagChip from "../../components/TagChip";
import { Band, Intro, Segmented, Skeleton } from "../../components/ui";
import BatchDrawer from "./BatchDrawer";
import BatchesTable, { TableSkeleton } from "./BatchesTable";
import { PERIMETER, fmtDate, fmtNumber } from "./format";
import { CompliancePill } from "./pills";

type Filter = "all" | "valid" | "problem";

const FILTERS: { id: Filter; label: string; test: (b: Batch) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "valid", label: "Tests up to date", test: (b) => b.analysis_status === "valid" },
  { id: "problem", label: "Tests too old or missing", test: (b) => b.analysis_status !== "valid" },
];

const newestFirst = (a: Batch, b: Batch) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id);

function distinctTags(batches: Batch[]): Tag[] {
  const seen = new Map<string, Tag>();
  for (const b of batches) seen.set(`${b.tag.status}|${b.tag.source ?? ""}`, b.tag);
  return [...seen.values()];
}

function Figure({ value, unit, caption, children }: { value: string; unit: string; caption: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 text-center">
      <p className="font-serif text-6xl leading-none tabular-nums md:text-7xl">
        {value}
        <span className="ml-2 text-3xl">{unit}</span>
      </p>
      <p className="eyebrow">{caption}</p>
      <div className="flex flex-wrap justify-center gap-2">{children}</div>
    </div>
  );
}

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

export default function BatchesTab() {
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
  const tags = useMemo(() => distinctTags(all), [all]);
  const latest = all[0];
  const expired = all.filter((b) => b.analysis_status === "expired").length;
  const visible = all.filter(FILTERS.find((f) => f.id === filter)!.test);

  return (
    <>
      {/* Hero */}
      <Band tone="olive" className="md:py-32">
        <Intro as="h1" size="xl" eyebrow="Sousse Sud plant → Zaouiet-Sousse" title="Treated water, batch by batch.">
          <p>
            Every day the plant releases a batch of treated water. Before it reaches a field, its lab analyses must be
            recent and its values within Tunisian limits.
          </p>
          <button type="button" className="btn mt-9" onClick={() => scrollTo("daily")}>
            See the batches
          </button>
        </Intro>
      </Band>

      {/* Key figures */}
      <Band tone="blush" wide>
        <div className="grid gap-14 md:grid-cols-3 md:gap-6">
          <Figure value={fmtNumber(PERIMETER.equipped_ha)} unit="ha" caption={`${PERIMETER.name}, equipped for treated water`}>
            <TagChip tag={PERIMETER.tag} showSource={false} />
          </Figure>
          <Figure value={fmtNumber(PERIMETER.delivered_m3)} unit="m³" caption={`Delivered to farms in ${PERIMETER.season}`}>
            <TagChip tag={PERIMETER.tag} showSource={false} />
          </Figure>
          {latest ? (
            <Figure value={fmtNumber(latest.volume_m3)} unit="m³" caption={`Today's batch · ${fmtDate(latest.date)}`}>
              <CompliancePill status={latest.status} />
              <TagChip tag={latest.tag} showSource={false} />
            </Figure>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-16 w-48" />
              <Skeleton className="h-5 w-40" />
            </div>
          )}
        </div>
        <p className="mt-14 text-center font-mono text-[15px]">Source: {PERIMETER.tag.source}</p>
      </Band>

      {/* Daily batches */}
      <Band tone="cream" wide id="daily">
        <Intro eyebrow="Daily batches" title="Sixty days of lab results.">
          {batches && (
            <p>
              {all.length} batches. {expired} had a lab test that was too old. Tap a batch to see its tests.
            </p>
          )}
        </Intro>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
          <Segmented
            label="Filter batches"
            value={filter}
            onChange={setFilter}
            options={FILTERS.map((f) => ({
              id: f.id,
              label: (
                <>
                  {f.label}
                  {batches && <span> ({all.filter(f.test).length})</span>}
                </>
              ),
            }))}
          />
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <TagChip key={`${t.status}|${t.source}`} tag={t} />
            ))}
          </div>
        </div>

        <div className="mt-6">
          {error ? (
            <ErrorBox error={error} onRetry={load} />
          ) : batches === null ? (
            <TableSkeleton />
          ) : visible.length === 0 ? (
            <p className="border-y border-line py-12 text-center font-serif text-3xl">
              {all.length === 0 ? "No batches yet." : "No batch matches this filter."}
            </p>
          ) : (
            <BatchesTable
              batches={visible}
              latestId={latest?.id}
              selectedId={selected?.id}
              showRowTags={tags.length > 1}
              onSelect={setSelected}
            />
          )}
        </div>
      </Band>

      {selected && <BatchDrawer batch={selected} onClose={close} />}
    </>
  );
}
