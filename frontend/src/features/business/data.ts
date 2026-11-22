import { get, post } from "../../api/client";
import type { BusinessReport, PilotMetrics, SavingsReport } from "../../api/types";
import { useApi, type ApiState } from "../../hooks/useApi";
import { pilotFigures, type PilotFigures } from "../../pilot";

/** The pilot, the territory figures and the preset scenarios. Fetched once: the adoption rate and a custom number of hectares are applied here (see project). */
export const useBusiness = (): ApiState<BusinessReport> => useApi<BusinessReport>(() => get<BusinessReport>("/api/business"));

export interface Projection {
  farmers: number; // TND per year, what farmers keep
  qatra: number; // TND per year, QATRA's share (10% of the saving)
  water: number; // m3 per year of well water not pumped
  kwh: number; // kWh per year of pumping electricity saved
}

/**
 * Same arithmetic as the backend (engine/business.py): per-hectare season figure of the pilot
 * x seasons per year x hectares x adoption rate ("same saving per hectare as the pilot"). A PROJECTION.
 * `adoption` is 0..1. Linear, so the slider answers instantly and the mock file works too.
 */
export function project(p: PilotMetrics, ha: number, adoption: number): Projection {
  const k = p.seasons_per_year * ha * adoption;
  return {
    farmers: p.farmers_net_tnd_per_ha_season * k,
    qatra: p.qatra_fee_tnd_per_ha_season * k,
    water: p.well_water_replaced_m3_per_ha_season * k,
    kwh: p.electricity_saved_kwh_per_ha_season * k,
  };
}

export const MAX_CUSTOM_HA = 1_000_000;

/** The pilot's own totals (the savings report of the default plan): the one source of truth shared with Savings, Allocation and Impact. */
export const usePilotTotals = (): ApiState<PilotFigures | null> =>
  useApi<PilotFigures | null>(async () => {
    try {
      return pilotFigures(await post<SavingsReport>("/api/savings", {}));
    } catch {
      return null; // without the savings the pilot case falls back to the per-hectare figures
    }
  });

/**
 * Figures of one case, per year. The pilot case is the pilot's OWN totals (x the adoption rate), not per-hectare arithmetic,
 * so it agrees with Savings and Impact to the dinar. Every other case keeps the per-hectare projection. Rounding: only at display.
 */
export function figuresFor(id: string, ha: number, adoption: number, p: PilotMetrics, totals: PilotFigures | null | undefined): Projection {
  if (id === "pilot" && totals) {
    return { farmers: totals.farmers.year * adoption, qatra: totals.qatra.year * adoption, water: totals.m3.year * adoption, kwh: totals.kwh.year * adoption };
  }
  return project(p, ha, adoption);
}
