import type { Analysis, AnalysisType, Batch } from "../../api/types";
import TagChip from "../../components/TagChip";
import { Drawer } from "../../components/ui";
import { ANALYSIS_LABEL, REQUIRED_TYPES, daysBetween, fmtDate, fmtNumber, paramInfo } from "./format";
import { AnalysisPill, CompliancePill } from "./pills";

interface Props {
  batch: Batch;
  onClose: () => void;
}

/** Days left before the analysis expires, counted from the batch date (the demo's "today"). */
function Validity({ a, batchDate }: { a: Analysis; batchDate: string }) {
  const total = Math.max(1, daysBetween(a.date, a.valid_until));
  const left = daysBetween(batchDate, a.valid_until);
  const pct = left < 0 ? 100 : Math.max(0, Math.min(100, (left / total) * 100));
  const color = left < 0 ? "bg-bad" : pct <= 25 ? "bg-warn" : "bg-olive";
  const text =
    left < 0 ? `Expired ${-left} day${left === -1 ? "" : "s"} before this batch` : `${left} of ${total} days left on batch day`;
  return (
    <div className="space-y-2">
      <div className="h-px w-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.max(0, left)} aria-label={text}>
        <div className={`h-[3px] -translate-y-px transition-[width] duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`font-mono text-[15px] ${left < 0 ? "text-bad" : ""}`}>{text}</p>
    </div>
  );
}

function AnalysisSection({ a, batchDate }: { a: Analysis; batchDate: string }) {
  return (
    <section className="space-y-5">
      <div className="flex items-baseline justify-between gap-3 border-b border-ink pb-3">
        <h3 className="text-3xl">{ANALYSIS_LABEL[a.type]}</h3>
        <AnalysisPill status={a.is_valid ? "valid" : "expired"} />
      </div>
      <dl className="grid grid-cols-2 gap-x-6">
        <dt className="eyebrow">Sampled</dt>
        <dt className="eyebrow">Valid until</dt>
        <dd className="text-[19px]">{fmtDate(a.date)}</dd>
        <dd className={`text-[19px] ${a.is_valid ? "" : "text-bad"}`}>{fmtDate(a.valid_until)}</dd>
      </dl>
      <Validity a={a} batchDate={batchDate} />
      <table className="w-full">
        <tbody>
          {Object.entries(a.values).map(([k, v]) => {
            const { label, unit } = paramInfo(k);
            return (
              <tr key={k} className="border-b border-line last:border-0">
                <td className="py-2.5 pr-3">{label}</td>
                <td className="py-2.5 text-right tabular-nums">{fmtNumber(v)}</td>
                <td className="w-28 py-2.5 pl-3 font-mono text-[15px]">{unit}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function MissingSection({ type }: { type: AnalysisType }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 border-b border-bad pb-3">
        <h3 className="text-3xl">{ANALYSIS_LABEL[type]}</h3>
        <AnalysisPill status="missing" />
      </div>
      <p className="text-bad">No analysis on record for this batch.</p>
    </section>
  );
}

export default function BatchDrawer({ batch, onClose }: Props) {
  const present = new Set(batch.analyses.map((a) => a.type));
  const missing = REQUIRED_TYPES.filter((t) => !present.has(t));

  return (
    <Drawer
      label={`Batch ${batch.id}`}
      onClose={onClose}
      header={
        <div className="space-y-4 pr-16">
          <p className="eyebrow">Batch · {fmtDate(batch.date)}</p>
          <h2 className="font-mono text-3xl tracking-normal">{batch.id}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <CompliancePill status={batch.status} large />
            <TagChip tag={batch.tag} />
          </div>
        </div>
      }
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
        <div>
          <dt className="eyebrow">Volume</dt>
          <dd className="font-serif text-4xl">
            {fmtNumber(batch.volume_m3)} <span className="text-2xl">m³</span>
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Lab tests</dt>
          <dd className="pt-2">
            <AnalysisPill status={batch.analysis_status} />
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Plant</dt>
          <dd className="font-mono text-[16px]">{batch.plant_id}</dd>
        </div>
        <div>
          <dt className="eyebrow">Treatment</dt>
          <dd>{batch.treatment_level}</dd>
        </div>
      </dl>

      {batch.warnings && batch.warnings.length > 0 && (
        <section className="border-l-2 border-warn pl-5">
          <p className="eyebrow text-warn">Note</p>
          <ul className="mt-1 space-y-1">
            {batch.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      {missing.map((t) => (
        <MissingSection key={t} type={t} />
      ))}
      {batch.analyses.map((a) => (
        <AnalysisSection key={a.type} a={a} batchDate={batch.date} />
      ))}
    </Drawer>
  );
}
