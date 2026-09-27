// runs.js：区间覆盖与游程整理
export function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function sortByStart(runs) {
  return runs.slice().sort(function (a, b) {
    return a[0] - b[0] || a[1] - b[1];
  });
}

// 把闭区间 [from, to] 涂成 value：与已有游程重叠的部分被新值盖掉，
// 没盖到的残段原样保留，涂色区间整体作为一条新游程加入。
export function cover(runs, from, to, value) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) {
    throw fail("E_BAD_RANGE", "bad range: " + from + " > " + to);
  }
  const next = [];
  for (const run of runs) {
    const start = run[0];
    const end = run[1];
    const old = run[2];
    if (end < from || start > to) {
      next.push([start, end, old]);
    } else {
      if (start <= from - 1) next.push([start, from - 1, old]);
      if (end >= to + 1) next.push([to + 1, end, old]);
    }
  }
  next.push([from, to, value]);
  return sortByStart(next);
}

// 按起点升序排列，并把相邻（含端点相接）且同值的游程并成一条。
export function tidy(runs) {
  const merged = [];
  for (const run of sortByStart(runs)) {
    const last = merged[merged.length - 1];
    if (last && last[2] === run[2] && run[0] <= last[1] + 1) {
      if (run[1] > last[1]) last[1] = run[1];
    } else {
      merged.push([run[0], run[1], run[2]]);
    }
  }
  return merged;
}
