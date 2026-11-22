import { useRef, useState } from "react";
import { get, post } from "../../api/client";
import type { AllFarmsCompatibility, Farm, SavingsOverrides, SavingsReport } from "../../api/types";
import { useApi, type ApiState } from "../../hooks/useApi";

export interface SavingsData {
  farms: Farm[];
  report: SavingsReport;
  compat: AllFarmsCompatibility | null; // only for the plain wording of a "not allowed" reason
}

export interface SavingsPlan extends ApiState<SavingsData> {
  overrides: SavingsOverrides;
  setOverrides: (o: SavingsOverrides) => void;
  /** The server's own defaults (the answer to a request without overrides), kept so "Reset" and the inputs know them. */
  defaults: Record<string, number>;
}

/**
 * Savings of the default plan (first forecast day, latest usable batch), with the prices the user may edit.
 * The previous answer stays in `data` while a new one loads, so the screen does not flicker.
 * NOTE: like the other farmer screens, this loads every farm's figures and shows only the farmer's own;
 * real privacy needs logins and a per-farm endpoint on the server (next version).
 */
export function useSavings(): SavingsPlan {
  const [overrides, setOverrides] = useState<SavingsOverrides>({});
  const defaults = useRef<Record<string, number>>({});
  const key = JSON.stringify(overrides);

  const api = useApi<SavingsData>(
    async () => {
      const [farms, report, compat] = await Promise.all([
        get<Farm[]>("/api/farms"),
        post<SavingsReport>("/api/savings", Object.keys(overrides).length ? { overrides } : {}),
        get<AllFarmsCompatibility>("/api/compatibility").catch(() => null),
      ]);
      if (!Object.keys(overrides).length) defaults.current = Object.fromEntries(report.assumptions.map((a) => [a.name, a.value]));
      return { farms, report, compat };
    },
    [key],
  );
  return { ...api, overrides, setOverrides, defaults: defaults.current };
}

/** Season figure of a daily one: the day repeated for the irrigation days (a PROJECTION, always labelled as such). */
export const seasonOf = (perDay: number, days: number) => perDay * days;

export const daysOf = (r: SavingsReport) => r.assumptions.find((a) => a.name === "irrigation_days")?.value ?? 150;
export const assumed = (r: SavingsReport, name: string) => r.assumptions.find((a) => a.name === name)?.value;
