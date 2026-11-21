import type { AnalysisStatus } from "../../api/types";
import { STATUS_BADGE } from "./format";

export default function StatusBadge({ status }: { status: AnalysisStatus }) {
  const { label, cls } = STATUS_BADGE[status];
  return <span className={`inline-block rounded-md px-2.5 py-1 text-sm font-semibold ${cls}`}>{label}</span>;
}
