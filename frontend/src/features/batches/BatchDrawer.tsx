import { useEffect } from "react";
import type { Analysis, AnalysisType, Batch } from "../../api/types";
import { ANALYSIS_LABEL, REQUIRED_TYPES, fmtDate, fmtNumber, paramInfo } from "./format";
import StatusBadge from "./StatusBadge";
import TagChip from "./TagChip";

interface Props {
  batch: Batch;
  onClose: () => void;
}

function AnalysisCard({ a }: { a: Analysis }) {
  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{ANALYSIS_LABEL[a.type]}</h3>
        <StatusBadge status={a.is_valid ? "valid" : "expired"} />
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 text-base">
        <dt className="text-slate-500">Sampled</dt>
        <dt className="text-slate-500">Valid until</dt>
        <dd className="font-medium">{fmtDate(a.date)}</dd>
        <dd className={`font-medium ${a.is_valid ? "" : "text-orange-600"}`}>{fmtDate(a.valid_until)}</dd>
      </dl>
      <table className="mt-3 w-full text-base">
        <tbody className="divide-y divide-slate-100">
          {Object.entries(a.values).map(([k, v]) => {
            const { label, unit } = paramInfo(k);
            return (
              <tr key={k}>
                <td className="py-1.5 text-slate-700">{label}</td>
                <td className="py-1.5 text-right font-medium tabular-nums">{fmtNumber(v)}</td>
                <td className="w-28 py-1.5 pl-2 text-sm text-slate-500">{unit}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function MissingCard({ type }: { type: AnalysisType }) {
  return (
    <section className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{ANALYSIS_LABEL[type]}</h3>
        <StatusBadge status="missing" />
      </div>
      <p className="mt-1 text-base text-red-800">No analysis on record for this batch.</p>
    </section>
  );
}

export default function BatchDrawer({ batch, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const present = new Set(batch.analyses.map((a) => a.type));
  const missing = REQUIRED_TYPES.filter((t) => !present.has(t));

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end" role="dialog" aria-modal="true" aria-label={`Batch ${batch.id}`}>
      <button className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-label="Close" />
      <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <p className="text-sm text-slate-500">Batch</p>
            <h2 className="font-mono text-2xl font-bold">{batch.id}</h2>
            <div className="mt-2">
              <TagChip tag={batch.tag} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-2xl leading-none text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-base">
            <div>
              <dt className="text-slate-500">Date</dt>
              <dd className="font-medium">{fmtDate(batch.date)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Volume</dt>
              <dd className="font-medium tabular-nums">{fmtNumber(batch.volume_m3)} m³</dd>
            </div>
            <div>
              <dt className="text-slate-500">Plant</dt>
              <dd className="font-medium">{batch.plant_id}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Analyses</dt>
              <dd>
                <StatusBadge status={batch.analysis_status} />
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-slate-500">Treatment</dt>
              <dd className="font-medium">{batch.treatment_level}</dd>
            </div>
          </dl>

          {batch.warnings && batch.warnings.length > 0 && (
            <section className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <h3 className="text-base font-semibold text-amber-900">Warnings</h3>
              <ul className="mt-1 list-disc pl-5 text-base text-amber-900">
                {batch.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </section>
          )}

          {missing.map((t) => (
            <MissingCard key={t} type={t} />
          ))}
          {batch.analyses.map((a) => (
            <AnalysisCard key={a.type} a={a} />
          ))}
        </div>
      </aside>
    </div>
  );
}
