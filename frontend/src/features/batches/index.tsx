import { useCallback, useEffect, useMemo, useState } from "react";
import { get } from "../../api/client";
import type { Batch, Tag } from "../../api/types";
import BatchDrawer from "./BatchDrawer";
import BatchesTable from "./BatchesTable";
import TagChip from "../../components/TagChip";

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

  const all = batches ?? [];
  const tags = useMemo(() => distinctTags(all), [all]);
  const expired = all.filter((b) => b.analysis_status === "expired").length;
  const missing = all.filter((b) => b.analysis_status === "missing").length;
  const visible = all.filter(FILTERS.find((f) => f.id === filter)!.test);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sousse Sud plant · Zaouiet-Sousse irrigated area</h2>
          {batches && (
            <p className="mt-1 text-lg text-slate-700">
              <strong>{all.length}</strong> batches · <strong className="text-orange-600">{expired}</strong> with
              expired analyses
              {missing > 0 && (
                <>
                  {" "}
                  · <strong className="text-red-600">{missing}</strong> missing
                </>
              )}
            </p>
          )}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <TagChip key={`${t.status}|${t.source}`} tag={t} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter batches">
        {FILTERS.map((f) => {
          const count = all.filter(f.test).length;
          const on = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={on}
              className={`rounded-full px-4 py-2 text-base font-medium ring-1 ${
                on ? "bg-teal-700 text-white ring-teal-700" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
              }`}
            >
              {f.label}
              {batches && <span className={on ? "text-teal-100" : "text-slate-400"}> ({count})</span>}
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-5 text-base text-red-900">
          <p className="font-semibold">Could not load batches.</p>
          <p className="mt-1 font-mono text-sm">{error}</p>
          <button onClick={load} className="mt-3 rounded-md bg-red-700 px-4 py-2 font-medium text-white hover:bg-red-800">
            Retry
          </button>
        </div>
      ) : batches === null ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-lg text-slate-500">
          Loading batches…
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-lg text-slate-500">
          {all.length === 0 ? "No batches yet." : "No batches match this filter."}
        </div>
      ) : (
        <BatchesTable batches={visible} selectedId={selected?.id} showRowTags={tags.length > 1} onSelect={setSelected} />
      )}

      {selected && <BatchDrawer batch={selected} onClose={close} />}
    </div>
  );
}
