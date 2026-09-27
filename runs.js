// runs.js：区间覆盖与游程整理
function badRange() {
  const error = new Error("from 大于 to，区间写反了");
  error.code = "E_BAD_RANGE";
  return error;
}

export function tidy(runs) {
  const sorted = runs
    .map(function (run) { return [run[0], run[1], run[2]]; })
    .sort(function (a, b) { return a[0] - b[0]; });
  const merged = [];
  sorted.forEach(function (run) {
    const last = merged[merged.length - 1];
    if (last && last[2] === run[2] && run[0] <= last[1] + 1) {
      last[1] = Math.max(last[1], run[1]);
    } else {
      merged.push(run);
    }
  });
  return merged;
}

export function cover(runs, from, to, value) {
  if (from > to) {
    throw badRange();
  }
  const kept = [];
  runs.forEach(function (run) {
    const start = run[0];
    const end = run[1];
    const current = run[2];
    if (end < from || start > to) {
      kept.push([start, end, current]);
      return;
    }
    if (start < from) {
      kept.push([start, from - 1, current]);
    }
    if (to < end) {
      kept.push([to + 1, end, current]);
    }
  });
  kept.push([from, to, value]);
  return tidy(kept);
}
