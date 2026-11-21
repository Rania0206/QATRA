import { useEffect } from "react";
import type { Analysis, AnalysisType, Batch } from "../../api/types";
import TagChip from "../../components/TagChip";
import ComplianceBadge from "./ComplianceBadge";
import { ANALYSIS_LABEL, REQUIRED_TYPES, daysBetween, fmtDate, fmtNumber, paramInfo } from "./format";
import StatusBadge from "./StatusBadge";

interface Props {
  batch: Batch;
  onClose: () => void;
}

/** Days left before the analysis expires, counted from the batch date (the demo's "today"). */
function ValidityBar({ a, batchDate }: { a: Analysis; batchDate: string }) {
  const total = Math.max(1, daysBetween(a.date, a.valid_until));
  const left = daysBetween(batchDate, a.valid_until);
  const pct = Math.max(0, Math.min(100, (left / total) * 100));
  const tone = left < 0 ? "var(--q-bad)" : pct <= 25 ? "var(--q-warn)" : "var(--q-ok)";
  const text =
    left < 0
      ? `Expired ${-left} day${left === -1 ? "" : "s"} before this batch`
      : `${left} of ${total} days left on batch day`;
  return (
    <div className="space-y-1.5">
      <div
        className="h-3 w-full overflow-hidden rounded-[2px] border border-[var(--q-ink)] bg-[var(--q-cream)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={Math.max(0, left)}
        aria-label={text}
      >
        <div className="h-full transition-[width] duration-300" style={{ width: `${left < 0 ? 100 : pct}%`, background: tone }} />
      </div>
      <p className="q-mono text-base font-semibold" style={{ color: left < 0 ? "var(--q-bad)" : "var(--q-ink)" }}>
        {text}
      </p>
    </div>
  );
}

function AnalysisCard({ a, batchDate }: { a: Analysis; batchDate: string }) {
  return (
    <section className="q-card space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="q-title text-xl">{ANALYSIS_LABEL[a.type]}</h3>
        <StatusBadge status={a.is_valid ? "valid" : "expired"} />
      </div>
      <dl className="grid grid-cols-2 gap-x-4">
        <dt className="q-label">Sampled</dt>
        <dt className="q-label">Valid until</dt>
        <dd className="q-mono text-lg font-semibold">{fmtDate(a.date)}</dd>
        <dd className="q-mono text-lg font-semibold" style={a.is_valid ? undefined : { color: "var(--q-bad)" }}>
          {fmtDate(a.valid_until)}
        </dd>
      </dl>
      <ValidityBar a={a} batchDate={batchDate} />
      <table className="q-dash w-full text-base">
        <tbody>
          {Object.entries(a.values).map(([k, v]) => {
            const { label, unit } = paramInfo(k);
            return (
              <tr key={k} className="border-b border-[var(--q-ink)]/10 last:border-0">
                <td className="py-2 pr-2">{label}</td>
                <td className="q-mono py-2 text-right font-semibold">{fmtNumber(v)}</td>
                <td className="q-mono w-32 py-2 pl-3 text-[var(--q-ink-2)]">{unit}</td>
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
    <section className="q-card space-y-2 border-[var(--q-bad)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="q-title text-xl">{ANALYSIS_LABEL[type]}</h3>
        <StatusBadge status="missing" />
      </div>
      <p className="text-base font-semibold" style={{ color: "var(--q-bad)" }}>
        No analysis on record for this batch.
      </p>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="q-label">{label}</dt>
      <dd>{children}</dd>
    </div>
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
    <div className="fixed inset-0 z-[1100] flex justify-end" role="dialog" aria-modal="true" aria-label={`Batch ${batch.id}`}>
      <button className="absolute inset-0 bg-[var(--q-ink)]/40" onClick={onClose} aria-label="Close" />
      <aside className="relative flex h-full w-full max-w-xl flex-col border-l border-[var(--q-ink)] bg-[var(--q-cream)]">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--q-ink)] bg-[var(--q-paper)] p-5">
          <div className="space-y-2">
            <p className="q-label">Batch</p>
            <h2 className="q-mono text-[28px] font-semibold leading-tight">{batch.id}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <ComplianceBadge status={batch.status} large />
              <TagChip tag={batch.tag} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-[2px] border border-[var(--q-ink)] px-3 py-1 text-2xl leading-none transition-colors duration-150 hover:bg-[var(--q-hover)]"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-base">
            <Field label="Date">
              <span className="q-mono text-lg font-semibold">{fmtDate(batch.date)}</span>
            </Field>
            <Field label="Volume">
              <span className="q-mono text-lg font-semibold">{fmtNumber(batch.volume_m3)} m³</span>
            </Field>
            <Field label="Plant">
              <span className="q-mono">{batch.plant_id}</span>
            </Field>
            <Field label="Analyses">
              <StatusBadge status={batch.analysis_status} />
            </Field>
            <div className="col-span-2">
              <Field label="Treatment">{batch.treatment_level}</Field>
            </div>
          </dl>

          {batch.warnings && batch.warnings.length > 0 && (
            <section className="q-card border-[var(--q-warn)] p-4">
              <h3 className="q-label" style={{ color: "var(--q-ink)" }}>
                ⚠ Warnings
              </h3>
              <ul className="mt-1 list-disc pl-5 text-base">
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
            <AnalysisCard key={a.type} a={a} batchDate={batch.date} />
          ))}
        </div>
      </aside>
    </div>
  );
}
