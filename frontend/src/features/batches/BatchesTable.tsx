import type { Batch } from "../../api/types";
import TagChip from "../../components/TagChip";
import ComplianceBadge from "./ComplianceBadge";
import { fmtDate, fmtNumber } from "./format";
import StatusBadge from "./StatusBadge";
import { Skeleton } from "./ui";

interface Props {
  batches: Batch[];
  latestId?: string; // newest batch overall, highlighted
  selectedId?: string;
  showRowTags: boolean; // true when batches come from more than one source
  onSelect: (b: Batch) => void;
}

const TH = "q-label sticky top-0 z-10 border-b border-[var(--q-ink)] bg-[var(--q-paper)] px-4 py-3 text-left";
const TD = "px-4 py-3";

export function TableSkeleton() {
  return (
    <div className="q-card space-y-3 p-4" aria-busy="true" aria-label="Loading batches">
      <Skeleton className="h-6 w-full" />
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export default function BatchesTable({ batches, latestId, selectedId, showRowTags, onSelect }: Props) {
  return (
    <div className="q-card max-h-[65vh] overflow-auto">
      <table className="w-full border-collapse text-base">
        <thead>
          <tr>
            <th className={TH}>Date</th>
            <th className={TH}>Batch ID</th>
            <th className={`${TH} text-right`}>Volume (m³)</th>
            <th className={TH}>Treatment</th>
            <th className={TH}>Analyses</th>
            <th className={TH} title="NT 106.03 limits and Decree 89-1047 analyses">
              Compliance
            </th>
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => {
            const latest = b.id === latestId;
            const selected = b.id === selectedId;
            return (
              <tr
                key={b.id}
                onClick={() => onSelect(b)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(b)}
                tabIndex={0}
                aria-selected={selected}
                className={`cursor-pointer border-b border-[var(--q-ink)]/15 transition-colors duration-150 odd:bg-[var(--q-paper)] even:bg-[var(--q-paper-alt)] hover:!bg-[var(--q-hover)] focus:outline-none focus-visible:!bg-[var(--q-hover)] ${
                  selected ? "!bg-[var(--q-hover)]" : ""
                } ${latest ? "shadow-[inset_6px_0_0_var(--q-accent)]" : ""}`}
              >
                <td className={`${TD} q-mono whitespace-nowrap`}>
                  {fmtDate(b.date)}
                  {latest && (
                    <span className="q-mono ml-2 rounded-[2px] bg-[var(--q-accent)] px-1.5 py-0.5 text-[15px] font-semibold uppercase text-white">
                      Latest
                    </span>
                  )}
                </td>
                <td className={`${TD} q-mono whitespace-nowrap font-semibold`}>
                  {b.id}
                  {showRowTags && (
                    <span className="ml-2">
                      <TagChip tag={b.tag} showSource={false} />
                    </span>
                  )}
                </td>
                <td className={`${TD} q-mono text-right`}>{fmtNumber(b.volume_m3)}</td>
                <td className={`${TD} max-w-56 truncate text-[var(--q-ink-2)]`} title={b.treatment_level}>
                  {b.treatment_level.split(" (")[0]}
                </td>
                <td className={TD}>
                  <StatusBadge status={b.analysis_status} />
                </td>
                <td className={TD}>
                  <ComplianceBadge status={b.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
