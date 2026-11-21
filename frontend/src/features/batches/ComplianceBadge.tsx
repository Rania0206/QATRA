import { COMPLIANCE_BADGE } from "./format";
import { Badge } from "./ui";

/** Batch.status badge (Compliant / Conditional / Non-compliant / Analysis invalid). Unknown -> dash. */
export default function ComplianceBadge({ status, large = false }: { status: string; large?: boolean }) {
  const b = COMPLIANCE_BADGE[status];
  if (!b) return <span className="text-[var(--q-ink-2)]">—</span>;
  return <Badge tone={b.tone} icon={b.icon} label={b.label} title={b.title} size={large ? "lg" : "md"} />;
}
