import type { Analysis, AnalysisType, Batch } from "../../api/types";
import PassportQR from "../../components/PassportQR";
import { Drawer } from "../../components/ui";
import { useLang, type Lang } from "../../i18n";
import {
  ANALYSIS_LABEL,
  B,
  REQUIRED_TYPES,
  daysBetween,
  fmtDate,
  fmtNumber,
  paramInfo,
  treatmentName,
  validityText,
  warningText,
} from "./format";
import { AnalysisPill, CompliancePill } from "./pills";

interface Props {
  batch: Batch;
  onClose: () => void;
}

/** Days left before the analysis expires, counted from the batch date (the demo's "today"). */
function Validity({ a, batchDate, lang }: { a: Analysis; batchDate: string; lang: Lang }) {
  const total = Math.max(1, daysBetween(a.date, a.valid_until));
  const left = daysBetween(batchDate, a.valid_until);
  const pct = left < 0 ? 100 : Math.max(0, Math.min(100, (left / total) * 100));
  const color = left < 0 ? "bg-bad" : pct <= 25 ? "bg-warn" : "bg-olive";
  const text = validityText(left, total, lang);
  return (
    <div className="space-y-1.5">
      <div className="h-[3px] w-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.max(0, left)} aria-label={text}>
        <div className={`h-full transition-[width] duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-[length:calc(15px*var(--fs))] ${left < 0 ? "text-bad" : "text-ink-soft"}`}>{text}</p>
    </div>
  );
}

function AnalysisSection({ a, batchDate, lang }: { a: Analysis; batchDate: string; lang: Lang }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-2xl">{ANALYSIS_LABEL[a.type][lang]}</h3>
        <AnalysisPill status={a.is_valid ? "valid" : "expired"} />
      </div>
      <p className="text-[length:calc(15px*var(--fs))] text-ink-soft">
        {B.sampled[lang]} {fmtDate(a.date, lang)} · {B.validUntil[lang]}{" "}
        <span className={a.is_valid ? "" : "text-bad"}>{fmtDate(a.valid_until, lang)}</span>
      </p>
      <Validity a={a} batchDate={batchDate} lang={lang} />
      <table className="w-full text-[length:calc(15px*var(--fs))]">
        <tbody>
          {Object.entries(a.values).map(([k, v]) => {
            const { label, unit } = paramInfo(k, lang);
            return (
              <tr key={k} className="border-b border-line last:border-0">
                <td className="py-1.5 pe-3">{label}</td>
                <td className="py-1.5 text-end tabular-nums" dir="ltr">
                  {fmtNumber(v)}
                  <span className="ms-1.5 inline-block w-24 whitespace-nowrap text-start text-ink-soft">{unit === "–" ? "" : unit}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function MissingSection({ type, lang }: { type: AnalysisType; lang: Lang }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-2xl">{ANALYSIS_LABEL[type][lang]}</h3>
        <AnalysisPill status="missing" />
      </div>
      <p className="text-[length:calc(15px*var(--fs))] text-bad">{B.noAnalysis[lang]}</p>
    </section>
  );
}

export default function BatchDrawer({ batch, onClose }: Props) {
  const { lang } = useLang();
  const present = new Set(batch.analyses.map((a) => a.type));
  const missing = REQUIRED_TYPES.filter((t) => !present.has(t));

  return (
    <Drawer
      label={batch.id}
      onClose={onClose}
      header={
        <div className="space-y-3 pe-14">
          <p className="eyebrow">{fmtDate(batch.date, lang)}</p>
          <h2 dir="ltr" className="text-start text-3xl tabular-nums">
            {batch.id}
          </h2>
          <p className="text-[length:calc(17px*var(--fs))]">
            {fmtNumber(batch.volume_m3)} m³ · {B.treatmentWord[lang]} {treatmentName(batch.treatment_level, lang)}
          </p>
          <CompliancePill status={batch.status} />
        </div>
      }
    >
      {batch.warnings?.map((w) => (
        <p key={w} className="text-[length:calc(15px*var(--fs))] text-ink-soft">
          {B.note[lang]}: {warningText(w, lang)}
        </p>
      ))}

      {missing.map((t) => (
        <MissingSection key={t} type={t} lang={lang} />
      ))}
      {batch.analyses.map((a) => (
        <AnalysisSection key={a.type} a={a} batchDate={batch.date} lang={lang} />
      ))}
      <section className="space-y-3 border-t border-line pt-6">
        <PassportQR batchId={batch.id} />
      </section>
    </Drawer>
  );
}
