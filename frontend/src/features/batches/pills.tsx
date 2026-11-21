import type { AnalysisStatus } from "../../api/types";
import { Pill } from "../../components/ui";
import { ANALYSIS_STATUS, COMPLIANCE } from "./format";

export function AnalysisPill({ status }: { status: AnalysisStatus }) {
  const s = ANALYSIS_STATUS[status];
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

/** Batch.status pill (Meets the law / With conditions / Fails the law / Lab test too old). Unknown -> dash. */
export function CompliancePill({ status, large = false }: { status: string; large?: boolean }) {
  const c = COMPLIANCE[status];
  if (!c) return <span className="font-mono">—</span>;
  return (
    <Pill tone={c.tone} title={c.title} large={large}>
      {c.label}
    </Pill>
  );
}
