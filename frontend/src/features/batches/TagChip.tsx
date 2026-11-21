import type { Tag, TagStatus } from "../../api/types";

// Local stand-in until the shared status-tag chip (B-01b) lands; replace imports then.
const STYLES: Record<TagStatus, string> = {
  REPORTED: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  ESTIMATE: "bg-sky-100 text-sky-900 ring-sky-300",
  PROJECTION: "bg-indigo-100 text-indigo-900 ring-indigo-300",
  SIMULATED: "bg-violet-100 text-violet-900 ring-violet-300",
  TO_VERIFY: "bg-amber-100 text-amber-900 ring-amber-300",
};

export default function TagChip({ tag, showSource = true }: { tag: Tag; showSource?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans text-sm font-medium ring-1 ${STYLES[tag.status]}`}
      title={tag.source}
    >
      {tag.status}
      {showSource && tag.source ? <span className="font-normal">· {tag.source}</span> : null}
    </span>
  );
}
