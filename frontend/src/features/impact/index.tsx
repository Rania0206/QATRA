import { useState } from "react";
import { get } from "../../api/client";
import type { Tag } from "../../api/types";
import ErrorBox from "../../components/ErrorBox";
import Loading from "../../components/Loading";
import { Band, Intro } from "../../components/ui";
import { useApi } from "../../hooks/useApi";

// Local shape for the example (GET /api/impact); the shared contract is untouched.
interface Impact {
  period: string;
  tww_allocated_m3: number;
  fresh_water_saved_m3: number;
  tag: Tag;
}

// Usage example of useApi + Loading + ErrorBox. B-xx replaces the body later.
export default function ImpactTab() {
  const [simulateFailure, setSimulateFailure] = useState(false);
  const { data, loading, error, reload } = useApi<Impact>(() =>
    simulateFailure ? Promise.reject(new Error("Simulated failure (demo)")) : get<Impact>("/api/impact"),
  );

  return (
    <>
      <Band tone="olive" className="md:py-32">
        <Intro as="h1" size="xl" eyebrow="Impact" title="Fresh water left in the ground.">
          <p>Every cubic metre of treated water used on a field is a cubic metre not pumped from a well.</p>
        </Intro>
      </Band>

      <Band tone="cream">
        {loading && <Loading />}
        {error && <ErrorBox error={error} onRetry={reload} />}
        {data && (
          <div className="fade-up flex flex-col items-center gap-5 text-center">
            <p className="eyebrow">{data.period}</p>
            <p className="font-serif text-7xl leading-none tabular-nums">
              {data.fresh_water_saved_m3.toLocaleString("en-US")}
              <span className="ml-2 text-3xl">m³</span>
            </p>
            <p>of fresh water saved</p>
          </div>
        )}
        <label className="mt-12 flex items-center justify-center gap-3 font-mono text-[15px]">
          <input
            type="checkbox"
            className="h-4 w-4 accent-ink"
            checked={simulateFailure}
            onChange={(e) => {
              setSimulateFailure(e.target.checked);
              setTimeout(reload, 0);
            }}
          />
          Simulate a failing call
        </label>
      </Band>
    </>
  );
}
