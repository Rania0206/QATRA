import type { SavingsReport } from "./api/types";

/*
 * ONE source of truth for the pilot (the 10 demo farms, default plan): the savings response.
 * Impact, Business (its "Our pilot" case) and the totals on Savings and Allocation all read these figures, so they agree.
 *
 * - m3: the treated water used. The allocator counts every m3 of treated water as a m3 of fresh water not taken
 *   (plan.fresh_replaced_m3), so "well water replaced" is the same number (799.3 m3 a day), the farm on the network included.
 * - kwh: pumping electricity saved on the farms' own wells = sum of the farms' well_kwh_saved.
 * - money: the day, season and year totals of the savings report (the season is the day repeated for the irrigation days).
 * Nothing here is rounded: round only when a number is displayed.
 */
export interface Span {
  day: number;
  season: number; // PROJECTION: the day x the irrigation days
  year: number; // PROJECTION: the season x the seasons per year
}

export interface PilotFigures {
  farms: number;
  days: number; // irrigation days per season
  m3: Span; // treated water used = fresh (well) water replaced
  kwh: Span;
  farmers: Span; // what the farmers keep, TND
  qatra: Span; // QATRA's share, TND
}

export function pilotFigures(s: SavingsReport): PilotFigures {
  const days = s.assumptions.find((a) => a.name === "irrigation_days")?.value ?? 150;
  const seasons = s.assumptions.find((a) => a.name === "seasons_per_year")?.value ?? 1;
  const kwhDay = s.items.reduce((sum, i) => sum + i.well_kwh_saved, 0);
  return {
    farms: s.items.length,
    days,
    m3: { day: s.day.m3, season: s.season.m3, year: s.year.m3 },
    kwh: { day: kwhDay, season: kwhDay * days, year: kwhDay * days * seasons },
    farmers: { day: s.day.farmer_net_tnd, season: s.season.farmer_net_tnd, year: s.year.farmer_net_tnd },
    qatra: { day: s.day.qatra_fee_tnd, season: s.season.qatra_fee_tnd, year: s.year.qatra_fee_tnd },
  };
}
