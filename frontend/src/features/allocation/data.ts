import { get, post } from "../../api/client";
import type { AllFarmsCompatibility, Allocation, Farm, SavingsReport } from "../../api/types";
import { useApi, type ApiState } from "../../hooks/useApi";

export interface PlanData {
  farms: Farm[];
  allocation: Allocation;
  savings: SavingsReport | null; // the money is optional: the water plan still shows without it
  compat: AllFarmsCompatibility | null; // only for the plain wording of a "not allowed" reason
}

/**
 * Today's plan: default batch, default date. Savings use the same (empty) body so both answers describe the same plan.
 * NOTE: like the Compatibility screen, this loads every farm's figures and keeps only the farmer's own on screen;
 * real privacy needs logins and a per-farm endpoint on the server (next version).
 */
export function usePlan(): ApiState<PlanData> {
  return useApi<PlanData>(async () => {
    const body = {};
    const [farms, allocation, savings, compat] = await Promise.all([
      get<Farm[]>("/api/farms"),
      post<Allocation>("/api/allocate", body),
      post<SavingsReport>("/api/savings", body).catch(() => null),
      get<AllFarmsCompatibility>("/api/compatibility").catch(() => null),
    ]);
    return { farms, allocation, savings, compat };
  });
}
