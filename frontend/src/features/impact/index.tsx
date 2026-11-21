import { useState } from "react";
import { get } from "../../api/client";
import type { Tag } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import Loading from "../../components/Loading";
import TagChip from "../../components/TagChip";
import { useApi } from "../../hooks/useApi";

// Local shape for the example (GET /api/impact); the shared contract is untouched.
interface Impact {
  period: string;
  tww_allocated_m3: number;
  fresh_water_saved_m3: number;
  tag: Tag;
}

// Tiny usage example of useApi + Loading + ErrorBox + TagChip. B-xx replaces the body later.
export default function ImpactTab() {
  const [simulateFailure, setSimulateFailure] = useState(false);
  const { data, loading, error, reload } = useApi<Impact>(() =>
    simulateFailure ? Promise.reject(new Error("Simulated failure (demo)")) : get<Impact>("/api/impact"),
  );

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Impact</h2>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={simulateFailure}
          onChange={(e) => {
            setSimulateFailure(e.target.checked);
            setTimeout(reload, 0);
          }}
        />
        Simulate a failing call
      </label>
      {loading && <Loading />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">{data.period}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {data.fresh_water_saved_m3.toLocaleString()} m³ <span className="text-base font-normal">fresh water saved</span>
          </p>
          <div className="mt-3">
            <TagChip tag={data.tag} />
          </div>
        </div>
      )}
    </section>
  );
}
