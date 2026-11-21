import type { Tag, TagStatus } from "../api/types";

// Status chip. Colour AND a distinct glyph per status, so it stays readable without colour vision.
const STYLES: Record<TagStatus, { cls: string; icon: string; label: string }> = {
  REPORTED: { cls: "bg-emerald-100 text-emerald-900 ring-emerald-400", icon: "✓", label: "Reported" },
  ESTIMATE: { cls: "bg-sky-100 text-sky-900 ring-sky-400", icon: "≈", label: "Estimate" },
  PROJECTION: { cls: "bg-purple-100 text-purple-900 ring-purple-400", icon: "↗", label: "Projection" },
  SIMULATED: { cls: "bg-amber-100 text-amber-900 ring-amber-400", icon: "◆", label: "Simulated" },
  TO_VERIFY: { cls: "bg-white text-red-700 ring-2 ring-red-500", icon: "?", label: "To verify" },
};

export default function TagChip({ tag, showSource = true }: { tag: Tag; showSource?: boolean }) {
  const s = STYLES[tag.status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans text-sm font-medium ring-1 ${s.cls}`}
      title={tag.source ? `${s.label}: ${tag.source}` : s.label}
    >
      <span aria-hidden="true" className="font-bold">
        {s.icon}
      </span>
      {tag.status}
      {showSource && tag.source ? <span className="font-normal">· {tag.source}</span> : null}
    </span>
  );
}
