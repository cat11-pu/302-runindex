// runapply.js：按处理预算处理并留账（基线：一律给空表）
import { cover, tidy } from "./runs.js";

function codedError(spec, kind, fallback, message) {
  const code = (spec && spec[kind]) || fallback;
  const error = new Error(message);
  error.code = code;
  return error;
}

function integer(value) {
  return Number.isInteger(value);
}

// 规范化 state，绝不改写调用方给进来的对象。
function cloneState(state) {
  const src = state || {};
  const runs = (src.runs || []).map(function (run) { return [run[0], run[1], run[2]]; });
  return {
    runs: tidy(runs),
    ledger: (src.ledger || []).map(function (op) { return [op[0], op[1], op[2], op[3]]; }),
    applied: (src.applied || []).slice()
  };
}

function signature(op) {
  return op[0] + "|" + op[1] + "|" + op[2] + "|" + String(op[3]);
}

function validate(events, spec) {
  return (events || []).map(function (event) {
    const ok = event && event.kind === "set"
      && integer(event.from) && integer(event.to)
      && event.value !== undefined && event.value !== null;
    if (!ok) throw codedError(spec, "event_error_code", "E_BAD_EVENT", "bad event: " + JSON.stringify(event));
    if (event.from > event.to) {
      throw codedError(spec, "range_error_code", "E_BAD_RANGE",
        "bad range: " + event.from + " > " + event.to);
    }
    return [event.kind, event.from, event.to, event.value];
  });
}

function offer(state, ops, budget, spec, capacity) {
  let served = 0;
  const queued = [];
  for (const op of ops) {
    const sig = signature(op);
    if (state.applied.indexOf(sig) !== -1) continue;
    if (served < budget) {
      state.runs = tidy(cover(state.runs, op[1], op[2], op[3]));
      if (Number.isFinite(capacity) && state.runs.length > capacity) {
        throw codedError(spec, "runs_error_code", "E_TOO_MANY_RUNS",
          "too many runs: " + state.runs.length + " > " + capacity);
      }
      state.applied.push(sig);
      served += 1;
    } else {
      state.ledger.push(op);
      queued.push(op);
    }
  }
  return served;
}

// 按整批共用的处理预算消费事件：先整批校验（与预算无关），再逐条处理，
// 预算用尽后剩余请求整批载压在 ledger 上，等收尾补齐。
export function step(spec) {
  const events = spec.events || [];
  const ops = validate(events, spec);
  const state = cloneState(spec.state);
  const capacity = Number.isFinite(spec.capacity) ? spec.capacity : Infinity;
  const budget = Number.isFinite(spec.budget) ? spec.budget : 0;
  const served = offer(state, ops, budget, spec, capacity);
  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(function (op) { return [op[0], op[1], op[2], op[3]]; }),
    judged: served + state.ledger.length,
    judged_bound: state.ledger.length + (events.length - state.ledger.length)
  };
}

// 收尾：不限预算把账上的请求逐条处理完，返回本轮补齐条数。
export function close(spec) {
  const state = cloneState(spec.state);
  const capacity = Number.isFinite(spec.capacity) ? spec.capacity : Infinity;
  const pending = state.ledger;
  state.ledger = [];
  const catchup = offer(state, pending, Infinity, spec, capacity);
  return { state: state, catchup: catchup };
}
