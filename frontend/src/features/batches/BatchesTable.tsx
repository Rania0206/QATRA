import type { Batch } from "../../api/types";
import { Skeleton } from "../../components/ui";
import { fmtDate, fmtNumber } from "./format";
import { AnalysisPill, CompliancePill } from "./pills";

interface Props {
  batches: Batch[];
  latestId?: string;
  selectedId?: string;
  showRowTags?: boolean; // unused since tags were removed from the UI
  onSelect: (b: Batch) => void;
}

const TH = "sticky top-0 z-10 border-b border-ink bg-cream px-4 py-4 text-left text-[15px] font-normal";
const TD = "px-4 py-4";

export function TableSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading batches">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export default function BatchesTable({ batches, latestId, selectedId, onSelect }: Props) {
  return (
    <div className="max-h-[70vh] overflow-auto border-y border-ink">
      <table className="w-full border-collapse text-[17px]">
        <thead>
          <tr>
            <th className={TH}>Date</th>
            <th className={TH}>Batch ID</th>
            <th className={`${TH} text-right`}>Volume (m³)</th>
            <th className={TH}>Treatment</th>
            <th className={TH}>Lab tests</th>
            <th className={TH} title="NT 106.03 limits and Decree 89-1047 analyses">
              Water quality
            </th>
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => {
            const latest = b.id === latestId;
            return (
              <tr
                key={b.id}
                onClick={() => onSelect(b)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(b)}
                tabIndex={0}
                aria-selected={b.id === selectedId}
                className={`cursor-pointer border-b border-line transition-colors duration-200 hover:bg-sand focus:bg-sand focus:outline-none ${
                  b.id === selectedId ? "bg-sand" : ""
                }`}
              >
                <td className={`${TD} whitespace-nowrap`}>
                  {fmtDate(b.date)}
                  {latest && <span className="ml-3 rounded-sm bg-olive px-2 py-0.5 text-[14px] font-medium text-ink">today</span>}
                </td>
                <td className={`${TD} whitespace-nowrap text-[16px]`}>
                  {b.id}
                </td>
                <td className={`${TD} text-right tabular-nums`}>{fmtNumber(b.volume_m3)}</td>
                <td className={`${TD} max-w-52 truncate`} title={b.treatment_level}>
                  {b.treatment_level.split(" (")[0]}
                </td>
                <td className={TD}>
                  <AnalysisPill status={b.analysis_status} />
                </td>
                <td className={TD}>
                  <CompliancePill status={b.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
