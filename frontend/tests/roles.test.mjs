// Run: cd frontend && node --experimental-strip-types --test tests/roles.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { OPERATOR_ROLES, ROLES, ROLE_IDS, requestPowers } from "../src/roles.ts";

const KNOWN_TABS = ["map", "batches", "compatibility", "allocation", "savings", "soil", "heatwave", "messages", "requests", "impact", "territory", "public"];

test("every role opens one of its own tabs, and every tab exists", () => {
  for (const r of ROLES) {
    assert.ok(r.tabs.length > 0, r.id);
    assert.ok(r.tabs.includes(r.home), `${r.id} home ${r.home} is not in its tabs`);
    for (const t of r.tabs) assert.ok(KNOWN_TABS.includes(t), `${r.id}: unknown tab ${t}`);
  }
});

test("each role has a name and a sentence in EN, FR and AR", () => {
  for (const r of ROLES) for (const l of ["en", "fr", "ar"]) {
    assert.ok(r.label[l] && r.about[l], `${r.id} ${l}`);
  }
});

test("only the plant operator and the regional office see all farms", () => {
  assert.deepEqual([...OPERATOR_ROLES].sort(), ["crda", "onas"]);
  assert.equal(ROLE_IDS.length, 5);
});

test("requests: GDA sends, ONAS and CRDA decide, nobody does both, Lab and Public do neither; no role = demo (both)", () => {
  assert.deepEqual(requestPowers("gda"), { send: true, decide: false });
  assert.deepEqual(requestPowers("onas"), { send: false, decide: true });
  assert.deepEqual(requestPowers("crda"), { send: false, decide: true });
  assert.deepEqual(requestPowers("lab"), { send: false, decide: false });
  assert.deepEqual(requestPowers("public"), { send: false, decide: false });
  assert.deepEqual(requestPowers(null), { send: true, decide: true });
});
