import type { Analysis, AnalysisType, Batch } from "../../api/types";
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
  const text = left < 0 ? `Expired ${-left} day${left === -1 ? "" : "s"} before this batch` : `${left} of ${total} days left`;
  return (
    <div className="space-y-1.5">
      <div className="h-[3px] w-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.max(0, left)} aria-label={text}>
        <div className={`h-full transition-[width] duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-[15px] ${left < 0 ? "text-bad" : "text-ink-soft"}`}>{text}</p>
    </div>
  );
}

function AnalysisSection({ a, batchDate }: { a: Analysis; batchDate: string }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-2xl">{ANALYSIS_LABEL[a.type]}</h3>
        <AnalysisPill status={a.is_valid ? "valid" : "expired"} />
      </div>
      <p className="text-[15px] text-ink-soft">
        Sampled {fmtDate(a.date)} · valid until <span className={a.is_valid ? "" : "text-bad"}>{fmtDate(a.valid_until)}</span>
      </p>
      <Validity a={a} batchDate={batchDate} />
      <table className="w-full text-[15px]">
        <tbody>
          {Object.entries(a.values).map(([k, v]) => {
            const { label, unit } = paramInfo(k);
            return (
              <tr key={k} className="border-b border-line last:border-0">
                <td className="py-1.5 pr-3">{label}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {fmtNumber(v)}
                  <span className="ml-1.5 inline-block w-24 whitespace-nowrap text-left text-ink-soft">{unit === "–" ? "" : unit}</span>
                </td>
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
    <section className="flex items-center justify-between gap-3">
      <h3 className="text-2xl">{ANALYSIS_LABEL[type]}</h3>
      <AnalysisPill status="missing" />
    </section>
  );
}

export default function BatchDrawer({ batch, onClose }: Props) {
  const present = new Set(batch.analyses.map((a) => a.type));
  const missing = REQUIRED_TYPES.filter((t) => !present.has(t));
  const treatment = batch.treatment_level.split(" (")[0];

  return (
    <Drawer
      label={`Batch ${batch.id}`}
      onClose={onClose}
      header={
        <div className="space-y-3 pe-14">
          <p className="eyebrow">{fmtDate(batch.date)}</p>
          <h2 className="text-3xl tabular-nums">{batch.id}</h2>
          <p className="text-[17px]">
            {fmtNumber(batch.volume_m3)} m³ · {treatment} treatment
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <CompliancePill status={batch.status} />
          </div>
        </div>
      }
    >
      {batch.warnings?.map((w) => (
        <p key={w} className="text-[15px] text-ink-soft">
          Note: {w}
        </p>
      ))}

      {missing.map((t) => (
        <MissingSection key={t} type={t} />
      ))}
      {batch.analyses.map((a) => (
        <AnalysisSection key={a.type} a={a} batchDate={batch.date} />
      ))}
    </Drawer>
  );
}
