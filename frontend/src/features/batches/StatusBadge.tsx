import type { AnalysisStatus } from "../../api/types";
import { STATUS_BADGE } from "./format";
import { Badge } from "./ui";

export default function StatusBadge({ status, size }: { status: AnalysisStatus; size?: "md" | "lg" }) {
  const b = STATUS_BADGE[status];
  return <Badge tone={b.tone} icon={b.icon} label={b.label} size={size} />;
}
