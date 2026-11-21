import { COMPLIANCE_BADGE } from "./format";

/** Batch.status badge (Compliant / Conditional / Non-compliant / Analysis invalid). Unknown -> dash. */
export default function ComplianceBadge({ status, large = false }: { status: string; large?: boolean }) {
  const b = COMPLIANCE_BADGE[status];
  if (!b) return <span className="text-slate-400">—</span>;
  return (
    <span
      title={b.title}
      className={`inline-block whitespace-nowrap rounded-md font-semibold ${b.cls} ${
        large ? "px-3 py-1.5 text-base" : "px-2.5 py-1 text-sm"
      }`}
    >
      {b.label}
    </span>
  );
}
