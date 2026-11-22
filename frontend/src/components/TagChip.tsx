import type { Tag, TagStatus } from "../api/types";

// Data-status chip. Typewriter label + distinct glyph per status, so it stays readable without colour.
const STYLES: Record<TagStatus, { icon: string; label: string; cls: string }> = {
  REPORTED: { icon: "✓", label: "Reported", cls: "bg-ok-soft text-ok" },
  ESTIMATE: { icon: "≈", label: "Estimate", cls: "bg-neutral-soft text-ink-soft" },
  PROJECTION: { icon: "↗", label: "Projection", cls: "bg-neutral-soft text-ink-soft" },
  SIMULATED: { icon: "◆", label: "Simulated", cls: "bg-warn-soft text-warn" },
  TO_VERIFY: { icon: "?", label: "To verify", cls: "bg-bad-soft text-bad" },
};

export default function TagChip({ tag, showSource = true }: { tag: Tag; showSource?: boolean }) {
  const s = STYLES[tag.status];
  return (
    <span
      className={`inline-flex max-w-full items-baseline gap-1.5 rounded-full px-3 py-0.5 text-[15px] ${s.cls}`}
      title={tag.source ? `${s.label}: ${tag.source}` : s.label}
    >
      <span aria-hidden="true">{s.icon}</span>
      <span>{tag.status}</span>
      {showSource && tag.source ? <span className="truncate text-ink-soft">· {tag.source}</span> : null}
    </span>
  );
}
