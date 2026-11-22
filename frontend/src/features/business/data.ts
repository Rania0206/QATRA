import { get } from "../../api/client";
import type { BusinessReport, PilotMetrics } from "../../api/types";
import { useApi, type ApiState } from "../../hooks/useApi";

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
