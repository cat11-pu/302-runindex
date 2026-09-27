// runapply.js：按处理预算处理并留账
import { cover } from "./runs.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function codes(spec) {
  return {
    range: spec.range_error_code || "E_BAD_RANGE",
    runs: spec.runs_error_code || "E_TOO_MANY_RUNS",
    event: spec.event_error_code || "E_BAD_EVENT"
  };
}

function capacityOf(spec) {
  return spec.capacity === undefined ? Infinity : spec.capacity;
}

function cloneState(state) {
  const source = state || {};
  return {
    runs: (source.runs || []).map(function (run) { return [run[0], run[1], run[2]]; }),
    ledger: (source.ledger || []).map(function (entry) { return Object.assign({}, entry); }),
    applied: (source.applied || []).slice()
  };
}

function validateEvent(event, code) {
  const ok = event !== null && typeof event === "object"
    && event.kind === "set"
    && Number.isInteger(event.from)
    && Number.isInteger(event.to)
    && event.value !== undefined;
  if (!ok) {
    fail(code.event, "事件结构不合法");
  }
}

function entryId(event, index) {
  return event.id !== undefined ? event.id : index;
}

export function step(spec) {
  const code = codes(spec || {});
  const events = spec.events || [];
  const capacity = capacityOf(spec || {});
  let remaining = Math.max(0, spec.budget || 0);
  events.forEach(function (event) {
    validateEvent(event, code);
    if (event.from > event.to) {
      fail(code.range, "区间写反");
    }
  });
  const state = cloneState(spec.state);
  const appliedSet = new Set(state.applied);
  const ledgerIds = new Set(state.ledger.map(function (entry) { return entry.id; }));
  let served = 0;
  let judged = 0;
  events.forEach(function (event, index) {
    const id = entryId(event, index);
    if (appliedSet.has(id) || ledgerIds.has(id)) {
      return;
    }
    judged += 1;
    if (remaining > 0) {
      remaining -= 1;
      state.runs = cover(state.runs, event.from, event.to, event.value);
      if (state.runs.length > capacity) {
        fail(code.runs, "游程数超过上限");
      }
      state.applied.push(id);
      appliedSet.add(id);
      served += 1;
    } else {
      state.ledger.push({
        id: id, kind: event.kind, from: event.from, to: event.to, value: event.value
      });
      ledgerIds.add(id);
    }
  });
  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(function (entry) {
      return [entry.kind, entry.from, entry.to, entry.value];
    }),
    judged: judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  const code = codes(spec || {});
  const capacity = capacityOf(spec || {});
  const state = cloneState(spec.state);
  const appliedSet = new Set(state.applied);
  const pending = state.ledger;
  state.ledger = [];
  let catchup = 0;
  pending.forEach(function (entry) {
    if (entry.id !== undefined && appliedSet.has(entry.id)) {
      return;
    }
    state.runs = cover(state.runs, entry.from, entry.to, entry.value);
    if (state.runs.length > capacity) {
      fail(code.runs, "游程数超过上限");
    }
    if (entry.id !== undefined) {
      state.applied.push(entry.id);
      appliedSet.add(entry.id);
    }
    catchup += 1;
  });
  return { state: state, catchup: catchup };
}
