// ============================================
// Gesture Math — pure, dependency-free helpers
// ============================================
//
// Statistics, time-series event detection and 2D pixel geometry used by
// gestureMetrics.ts. This module has NO imports on purpose: it holds only pure
// functions so it can be unit-tested directly under Node type-stripping
// (see scripts/verify-gesture-math.ts) without a browser or bundler.
//
// Geometry convention: inputs are PIXEL coordinates (x right, y DOWN). Callers
// must scale MediaPipe's normalized landmarks by video width/height BEFORE
// calling — otherwise a non-square frame distorts every diagonal angle.

export interface Vec2 {
  x: number;
  y: number;
}

// ============================================
// Statistics
// ============================================

export function percentile(arr: number[], p: number): number {
  const clean = arr.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  if (clean.length === 0) return NaN;
  if (clean.length === 1) return clean[0];
  const idx = (p / 100) * (clean.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return clean[lo];
  return clean[lo] + (clean[hi] - clean[lo]) * (idx - lo);
}

export function median(arr: number[]): number {
  const clean = arr.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  if (clean.length === 0) return 0;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}

// ============================================
// Series shaping
// ============================================

/** Linearly fill NaN gaps; clamp-fill leading/trailing NaNs. */
export function interpolateNaN(series: number[]): number[] {
  const out = series.slice();
  for (let i = 0; i < out.length; i++) {
    if (Number.isFinite(out[i])) continue;
    let a = i - 1;
    while (a >= 0 && !Number.isFinite(out[a])) a--;
    let b = i + 1;
    while (b < out.length && !Number.isFinite(out[b])) b++;
    if (a >= 0 && b < out.length) out[i] = out[a] + ((out[b] - out[a]) * (i - a)) / (b - a);
    else if (a >= 0) out[i] = out[a];
    else if (b < out.length) out[i] = out[b];
    else out[i] = 0;
  }
  return out;
}

/** Centered moving average over `window` samples (odd window recommended). */
export function movingAverage(series: number[], window: number): number[] {
  const s = interpolateNaN(series);
  const half = Math.max(0, Math.floor(window / 2));
  return s.map((_, i) => {
    const lo = Math.max(0, i - half);
    const hi = Math.min(s.length - 1, i + half);
    let sum = 0;
    for (let j = lo; j <= hi; j++) sum += s[j];
    return sum / (hi - lo + 1);
  });
}

/**
 * Robust maximum for a brief-but-real peak: smooth first (kills single-frame
 * landmark spikes), then take the true max. Preferred over a high percentile,
 * which can drop a genuine peak that occupies <5% of frames (e.g. the deep
 * flexion instant of a landing).
 */
export function smoothedMax(series: number[], window = 3): number | null {
  const clean = series.filter(v => Number.isFinite(v));
  if (clean.length === 0) return null;
  const sm = movingAverage(series, window);
  return Math.max(...sm);
}

/** Amplitude (95th − 5th percentile) after NaN handling. */
export function amplitude(series: number[]): number {
  const clean = series.filter(v => Number.isFinite(v));
  if (clean.length === 0) return 0;
  return percentile(clean, 95) - percentile(clean, 5);
}

// ============================================
// Time-series event detection (timestamp-aware)
// ============================================
//
// Spacing is enforced in SECONDS via the per-frame `times` array, not in frame
// counts — pose detection can drop frames, so `times` is not evenly spaced and
// a frame-count spacing would drift with clip length / detection quality.

/**
 * Indices of local maxima that are ≥ minDistanceSec apart and rise at least
 * `minProminence` above their surroundings. Prominence is TOPOGRAPHIC (search
 * outward to the nearest higher sample on each side, take the higher of the two
 * intervening minima) — scale-free, so it works for fast steps and slow reps
 * alike. Do NOT tie the prominence window to minDistanceSec: a slow oscillation
 * barely dips within a short window and its real peaks would be discarded.
 */
export function findPeaksTimed(
  series: number[],
  times: number[],
  minDistanceSec: number,
  minProminence = 0
): number[] {
  const s = interpolateNaN(series);
  const n = s.length;

  const topographicProminence = (i: number): number => {
    // Scan outward across equal-valued samples (<=) so a tie with an equal
    // neighbour or twin peak does not collapse the base onto the peak itself
    // (which would report a spurious prominence of 0 for a genuine peak).
    let leftBase = s[i];
    for (let l = i - 1; l >= 0 && s[l] <= s[i]; l--) leftBase = Math.min(leftBase, s[l]);
    let rightBase = s[i];
    for (let r = i + 1; r < n && s[r] <= s[i]; r++) rightBase = Math.min(rightBase, s[r]);
    return s[i] - Math.max(leftBase, rightBase);
  };

  // Candidate local maxima that clear the prominence bar.
  const candidates: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    if (!(s[i] > s[i - 1] && s[i] >= s[i + 1])) continue;
    if (minProminence > 0 && topographicProminence(i) < minProminence) continue;
    candidates.push(i);
  }

  // Enforce minimum spacing (by time), keeping the taller of two close peaks.
  const peaks: number[] = [];
  for (const i of candidates) {
    const last = peaks[peaks.length - 1];
    if (last !== undefined && times[i] - times[last] < minDistanceSec) {
      if (s[i] > s[last]) peaks[peaks.length - 1] = i;
    } else {
      peaks.push(i);
    }
  }
  return peaks;
}

/** Count oscillation cycles (e.g. heel-raise reps) as prominent maxima. */
export function countCyclesTimed(
  series: number[],
  times: number[],
  minDistanceSec: number,
  prominenceFrac = 0.35
): number | null {
  const clean = series.filter(v => Number.isFinite(v));
  if (clean.length < 4) return null;
  const range = Math.max(...clean) - Math.min(...clean);
  if (range <= 0) return 0;
  return findPeaksTimed(series, times, minDistanceSec, prominenceFrac * range).length;
}

/**
 * Merge event timestamps from multiple sources (e.g. left+right foot contacts)
 * into a single ordered list, collapsing events closer than minDistanceSec so
 * near-simultaneous detections are not double-counted.
 */
export function mergeEventTimes(eventTimes: number[], minDistanceSec: number): number[] {
  const sorted = eventTimes.slice().sort((a, b) => a - b);
  const merged: number[] = [];
  for (const t of sorted) {
    if (merged.length === 0 || t - merged[merged.length - 1] >= minDistanceSec) merged.push(t);
  }
  return merged;
}

// ============================================
// 2D geometry — pixel coordinates, y DOWN
// ============================================

/** Interior angle at vertex `b` (degrees, 0–180). */
export function angleAt(a: Vec2, b: Vec2, c: Vec2): number {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const magBA = Math.hypot(ba.x, ba.y);
  const magBC = Math.hypot(bc.x, bc.y);
  if (magBA === 0 || magBC === 0) return 0;
  const cos = Math.max(-1, Math.min(1, (ba.x * bc.x + ba.y * bc.y) / (magBA * magBC)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * Deviation of the `lower→upper` segment from true vertical (degrees).
 * 0° = perfectly upright, 90° = horizontal. Magnitude only (order-independent),
 * which is what "peak lean/adduction" reports.
 */
export function deviationFromVertical(upper: Vec2, lower: Vec2): number {
  const dx = Math.abs(upper.x - lower.x);
  const dy = Math.abs(upper.y - lower.y);
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

/**
 * Angle of the segment `p→q` from horizontal (degrees). 0° = level, 90° =
 * vertical. Order-independent — correct regardless of which endpoint is left.
 */
export function lineAngleFromHorizontal(p: Vec2, q: Vec2): number {
  const dx = Math.abs(q.x - p.x);
  const dy = Math.abs(q.y - p.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}
