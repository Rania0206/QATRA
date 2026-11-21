import { useCallback, useEffect, useMemo, useState } from "react";
import { get } from "../../api/client";
import type { Batch, Tag } from "../../api/types";
import TagChip from "../../components/TagChip";
import BatchDrawer from "./BatchDrawer";
import BatchesTable, { TableSkeleton } from "./BatchesTable";
import StatStrip from "./StatStrip";
import { Screen, SectionTitle, Segmented } from "./ui";

type Filter = "all" | "valid" | "problem";

const FILTERS: { id: Filter; label: string; test: (b: Batch) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "valid", label: "Valid", test: (b) => b.analysis_status === "valid" },
  { id: "problem", label: "Expired or missing", test: (b) => b.analysis_status !== "valid" },
];

const newestFirst = (a: Batch, b: Batch) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id);

function distinctTags(batches: Batch[]): Tag[] {
  const seen = new Map<string, Tag>();
  for (const b of batches) seen.set(`${b.tag.status}|${b.tag.source ?? ""}`, b.tag);
  return [...seen.values()];
}

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
  const missing = all.filter((b) => b.analysis_status === "missing").length;
  const visible = all.filter(FILTERS.find((f) => f.id === filter)!.test);

  return (
    <Screen>
      <header className="space-y-2">
        <p className="q-label">Sousse Sud plant → Zaouiet-Sousse irrigated area</p>
        <h2 className="q-display text-[28px] uppercase sm:text-4xl">Treated-water batches</h2>
      </header>

      <StatStrip latest={latest} />

      <SectionTitle
        right={
          tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <TagChip key={`${t.status}|${t.source}`} tag={t} />
              ))}
            </div>
          )
        }
      >
        Daily batches
        {batches && (
          <span className="q-mono ml-3 text-lg font-semibold normal-case tracking-normal text-[var(--q-ink-2)]">
            {all.length} batches · <span style={{ color: "var(--q-bad)" }}>{expired} expired</span>
            {missing > 0 && <> · {missing} missing</>}
          </span>
        )}
      </SectionTitle>

      <Segmented
        label="Filter batches"
        value={filter}
        onChange={setFilter}
        options={FILTERS.map((f) => ({
          id: f.id,
          label: (
            <>
              {f.label}
              {batches && <span className="ml-1.5 font-normal">({all.filter(f.test).length})</span>}
            </>
          ),
        }))}
      />

      {error ? (
        <div role="alert" className="q-card space-y-3 border-[var(--q-bad)] p-5">
          <p className="q-title text-xl" style={{ color: "var(--q-bad)" }}>
            Could not load batches
          </p>
          <p className="q-mono text-base">{error}</p>
          <button
            onClick={load}
            className="q-mono rounded-[2px] border border-[var(--q-ink)] bg-[var(--q-ink)] px-4 py-2 font-semibold uppercase text-[var(--q-paper)] transition-colors hover:bg-[var(--q-ink-2)]"
          >
            Retry
          </button>
        </div>
      ) : batches === null ? (
        <TableSkeleton />
      ) : visible.length === 0 ? (
        <div className="q-card border-dashed p-8 text-center text-lg">
          {all.length === 0 ? "No batches yet." : "No batches match this filter."}
        </div>
      ) : (
        <BatchesTable
          batches={visible}
          latestId={latest?.id}
          selectedId={selected?.id}
          showRowTags={tags.length > 1}
          onSelect={setSelected}
        />
      )}

      {selected && <BatchDrawer batch={selected} onClose={close} />}
    </Screen>
  );
}
