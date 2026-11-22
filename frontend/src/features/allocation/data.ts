import { get, post } from "../../api/client";
import type { AllFarmsCompatibility, Allocation, Farm, SavingsReport } from "../../api/types";
import { useApi, type ApiState } from "../../hooks/useApi";

export type Scenario = "normal" | "outage";

/** What the judge can change. Omitted date / batch = the backend default (first forecast day, latest usable batch). */
export interface PlanParams {
  scenario: Scenario;
  date?: string;
  batch_id?: string;
}

/** The hottest day of summer 2026 and the batch of that day (demo preset). */
export const HEATWAVE: Required<Pick<PlanParams, "date" | "batch_id">> = { date: "2026-08-26", batch_id: "SSUD-20260826" };

/** The power cut of summer 2026 (data/simulated/sim_outage_windows): 13:00-17:00, i.e. the hours 13 to 16. */
export const OUTAGE_HOURS: [number, number] = [13, 16];

export interface PlanData {
  farms: Farm[];
  allocation: Allocation;
  savings: SavingsReport | null; // the money is optional: the water plan still shows without it
  compat: AllFarmsCompatibility | null; // only for the plain wording of a "not allowed" reason
  params: PlanParams; // what this answer was asked for (the controls may already show something newer)
}

/**
 * The plan for one scenario / day. Savings use the same body so both answers describe the same plan.
 * The previous result stays in `data` while a new one loads (see useApi), so the screen does not flicker.
 * NOTE: like the Compatibility screen, this loads every farm's figures and keeps only the farmer's own on screen;
 * real privacy needs logins and a per-farm endpoint on the server (next version).
 */
export function usePlan(p: PlanParams = { scenario: "normal" }): ApiState<PlanData> {
  return useApi<PlanData>(
    async () => {
      const body = { scenario: p.scenario, ...(p.date ? { date: p.date } : {}), ...(p.batch_id ? { batch_id: p.batch_id } : {}) };
      const [farms, allocation, savings, compat] = await Promise.all([
        get<Farm[]>("/api/farms"),
        post<Allocation>("/api/allocate", body),
        post<SavingsReport>("/api/savings", body).catch(() => null),
        get<AllFarmsCompatibility>(p.batch_id ? `/api/compatibility?batch_id=${encodeURIComponent(p.batch_id)}` : "/api/compatibility").catch(() => null),
      ]);
      return { farms, allocation, savings, compat, params: p };
    },
    [p.scenario, p.date, p.batch_id],
  );
}
