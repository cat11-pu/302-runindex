import assert from "node:assert";
import { cover, tidy } from "../runs.js";
import { step, close } from "../runapply.js";
import { render } from "../app.js";

const base = {
  budget: 1, capacity: 4,
  state: { runs: [], ledger: [], applied: [] },
  events: [],
  range_error_code: "E_BAD_RANGE", runs_error_code: "E_TOO_MANY_RUNS",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("cover returns a list", () => {
  assert.ok(Array.isArray(cover([], 0, 1, "z")));
});

check("tidy returns a list", () => {
  assert.ok(Array.isArray(tidy([])));
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
