// Run: cd frontend && node --experimental-strip-types --test tests/pilot.test.mjs
// The pilot figures must agree between Impact, Savings, Allocation and Business. Impact and Business's "Our pilot" case read
// pilotFigures() (src/pilot.ts), i.e. the savings report of the default plan; this test feeds it the savings and business mocks
// (generated from the engines) and checks the numbers the four screens print.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { pilotFigures } from "../src/pilot.ts";

const read = (f) => JSON.parse(readFileSync(new URL(`../src/mocks/${f}`, import.meta.url), "utf8"));
const savings = read("post_savings.json");
const business = read("business.json");
const alloc = read("post_allocate.json");
const p = pilotFigures(savings);

test("the pilot totals are the Savings figures: 799.3 m3, 97.23 TND a day, 14,585 TND a season", () => {
  assert.equal(p.farms, 10);
  assert.equal(p.days, 150);
  assert.equal(p.m3.day, 799.3);
  assert.equal(Math.round(p.m3.season), 119895);
  assert.equal(p.farmers.day, 97.23);
  assert.equal(Math.round(p.farmers.season), 14585);
  assert.equal(p.qatra.day, 10.8);
  assert.equal(Math.round(p.qatra.season), 1620);
});

test("Allocation shows the same water (every m3 of treated water replaces fresh water)", () => {
  const sent = alloc.items.reduce((s, i) => s + i.m3, 0);
  assert.ok(Math.abs(sent - p.m3.day) < 0.05, `allocation ${sent} vs savings ${p.m3.day}`);
  assert.ok(Math.abs(alloc.fresh_replaced_m3 - p.m3.day) < 0.05);
});

test("season = day x irrigation days, year = season x seasons per year (nothing is rounded before display)", () => {
  assert.ok(Math.abs(p.farmers.season - p.farmers.day * p.days) < 0.01);
  assert.ok(Math.abs(p.m3.season - p.m3.day * p.days) < 0.1);
  assert.equal(p.kwh.season, p.kwh.day * p.days);
  assert.equal(p.farmers.year, p.farmers.season); // one season a year
});

test("Business per-hectare figures agree with the pilot totals to within their own rounding", () => {
  const ha = business.pilot.pilot_ha;
  const perHaFarmers = business.pilot.farmers_net_tnd_per_ha_season * ha;
  assert.ok(Math.abs(perHaFarmers - p.farmers.season) < 1, `${perHaFarmers} vs ${p.farmers.season}`); // 14,584.4 vs 14,584.5
  assert.ok(Math.abs(business.pilot.qatra_fee_tnd_per_ha_season * ha - p.qatra.season) < 1);
  const perHaKwh = business.pilot.electricity_saved_kwh_per_ha_season * ha;
  assert.ok(Math.abs(perHaKwh - p.kwh.season) < 1, `${perHaKwh} vs ${p.kwh.season}`);
});

test("per-hectare well water counts only farms with their own well; the pilot total counts all treated water", () => {
  // Business: 118,200 m3/season (well farms). Savings/Allocation: 119,895 (all farms). The gap is the network farm (H, 11.3 m3 a day).
  const perHa = business.pilot.well_water_replaced_m3_per_ha_season * business.pilot.pilot_ha;
  const network = savings.items.filter((i) => i.farm_id === "H").reduce((s, i) => s + i.m3, 0) * p.days;
  assert.ok(Math.abs(p.m3.season - perHa - network) < 5, `${p.m3.season} - ${perHa} vs ${network}`);
});
