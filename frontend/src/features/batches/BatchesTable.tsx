import type { Batch } from "../../api/types";
import { fmtDate, fmtNumber } from "./format";
import StatusBadge from "./StatusBadge";
import TagChip from "./TagChip";

interface Props {
  batches: Batch[];
  selectedId?: string;
  showRowTags: boolean; // true when batches come from more than one source
  onSelect: (b: Batch) => void;
}

const TH = "px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide text-slate-600";
const TD = "px-4 py-3";

export default function BatchesTable({ batches, selectedId, showRowTags, onSelect }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-base">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className={TH}>Date</th>
            <th className={TH}>Batch ID</th>
            <th className={`${TH} text-right`}>Volume (m³)</th>
            <th className={TH}>Treatment</th>
            <th className={TH}>Analyses</th>
            <th className={TH} title="Legal limits check (A-03)">Compliance</th>
            <th className={TH} title="Risk model (A-08)">Risk</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {batches.map((b) => (
            <tr
              key={b.id}
              onClick={() => onSelect(b)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(b)}
              tabIndex={0}
              className={`cursor-pointer hover:bg-teal-50 focus:bg-teal-50 focus:outline-none ${
                b.id === selectedId ? "bg-teal-50" : ""
              }`}
            >
              <td className={`${TD} whitespace-nowrap`}>{fmtDate(b.date)}</td>
              <td className={`${TD} whitespace-nowrap font-mono`}>
                {b.id}
                {showRowTags && (
                  <span className="ml-2">
                    <TagChip tag={b.tag} showSource={false} />
                  </span>
                )}
              </td>
              <td className={`${TD} text-right tabular-nums`}>{fmtNumber(b.volume_m3)}</td>
              <td className={`${TD} max-w-56 truncate text-slate-600`} title={b.treatment_level}>
                {b.treatment_level.split(" (")[0]}
              </td>
              <td className={TD}>
                <StatusBadge status={b.analysis_status} />
              </td>
              <td className={`${TD} text-slate-400`}>—</td>
              <td className={`${TD} text-slate-400`}>—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
