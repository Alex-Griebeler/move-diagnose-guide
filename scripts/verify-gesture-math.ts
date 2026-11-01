// Verification for src/lib/clinical/gestureMath.ts — the REAL production module
// (imported below, not reimplemented). Runs on plain Node via type-stripping:
//   node scripts/verify-gesture-math.ts     (Node >= 23.6; 22.6+ needs the flag)
// Zero dependencies. Guards the specific bugs found in audit (pixel geometry,
// timestamp-based rep spacing, order-independent angles, robust peaks).

import {
  percentile,
  median,
  interpolateNaN,
  movingAverage,
  smoothedMax,
  amplitude,
  findPeaksTimed,
  countCyclesTimed,
  mergeEventTimes,
  angleAt,
  deviationFromVertical,
  lineAngleFromHorizontal,
  type Vec2,
} from '../src/lib/clinical/gestureMath.ts';

let pass = 0;
let fail = 0;
function check(name: string, got: number | null, want: number, tol = 0): void {
  const ok = got !== null && Number.isFinite(got) && Math.abs(got - want) <= tol;
  console.log(`${ok ? '✓' : '✗'} ${name}: got ${got}, want ${want}${tol ? `±${tol}` : ''}`);
  if (ok) pass++; else fail++;
}
function checkTrue(name: string, cond: boolean): void {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (cond) pass++; else fail++;
}

// Build a sine cycle signal + its (optionally uneven) timestamps.
function sineSeries(cycles: number, durationSec: number, fps: number): { s: number[]; t: number[] } {
  const n = Math.round(durationSec * fps);
  const s: number[] = [], t: number[] = [];
  for (let i = 0; i < n; i++) {
    t.push(i / fps);
    s.push(Math.sin((i / n) * cycles * 2 * Math.PI));
  }
  return { s, t };
}

// ── Statistics ────────────────────────────────────────────────
{
  const base = Array.from({ length: 100 }, () => 50);
  base[42] = 999;
  check('percentile95 ignores 1 spike', percentile(base, 95), 50);
  check('percentile100 catches spike', percentile(base, 100), 999);
  check('median odd', median([3, 1, 2]), 2);
  check('median even', median([1, 2, 3, 4]), 2.5);
}

// ── Series shaping ────────────────────────────────────────────
{
  const withGap = [0, NaN, 2, NaN, NaN, 5];
  const filled = interpolateNaN(withGap);
  check('interpolateNaN midpoint', filled[1], 1);
  check('interpolateNaN linear across 2-gap', filled[3], 3);
  const lead = interpolateNaN([NaN, NaN, 7]);
  check('interpolateNaN leading clamp', lead[0], 7);
  check('movingAverage smooths spike', Math.round(movingAverage([0, 0, 30, 0, 0], 3)[2]), 10);
  // smoothedMax preserves a brief real peak that a high percentile would drop.
  const briefPeak = Array.from({ length: 100 }, () => 10);
  briefPeak[50] = 60; briefPeak[51] = 58; // ~2% of frames
  checkTrue('smoothedMax keeps brief peak (>40) while p95 drops it (<20)',
    (smoothedMax(briefPeak, 3) ?? 0) > 40 && percentile(briefPeak, 95) < 20);
  check('amplitude 95-5 span', amplitude([...Array(90).fill(0), ...Array(10).fill(100)]), 100, 5);
}

// ── Timestamp-based rep/cadence counting (guards clip-length dependence) ──
{
  const short = sineSeries(10, 10, 30); // 10 reps in 10 s
  const long = sineSeries(10, 40, 30);  // 10 reps in 40 s (4x longer clip)
  check('countCyclesTimed 10 reps / 10s', countCyclesTimed(short.s, short.t, 0.3), 10);
  check('countCyclesTimed 10 reps / 40s (same count, longer clip)', countCyclesTimed(long.s, long.t, 0.3), 10);
  const nineteen = sineSeries(19, 15.5, 24);
  check('countCyclesTimed 19 reps', countCyclesTimed(nineteen.s, nineteen.t, 0.3), 19, 1);

  // Uneven timestamps (dropped frames): drop every 7th sample, count is stable.
  const full = sineSeries(10, 15.5, 30);
  const s2: number[] = [], t2: number[] = [];
  for (let i = 0; i < full.s.length; i++) if (i % 7 !== 0) { s2.push(full.s[i]); t2.push(full.t[i]); }
  check('countCyclesTimed robust to dropped frames', countCyclesTimed(s2, t2, 0.3), 10, 1);

  // Cadence peaks: 24 contacts with noise, min 0.22s apart.
  const contacts = sineSeries(24, 15, 30);
  const noisy = contacts.s.map((v, i) => v + Math.sin(i * 7.3) * 0.05);
  check('findPeaksTimed 24 noisy contacts', findPeaksTimed(noisy, contacts.t, 0.22, 0.2 * 2).length, 24, 2);
}

// ── Event merge (cross-foot dedup) ────────────────────────────
{
  const merged = mergeEventTimes([0.0, 0.05, 0.4, 0.42, 0.9], 0.22);
  check('mergeEventTimes collapses near-simultaneous', merged.length, 3);
}

// ── 2D geometry in PIXEL space ────────────────────────────────
{
  // angleAt: right angle.
  const a: Vec2 = { x: 0, y: 100 }, b: Vec2 = { x: 0, y: 0 }, c: Vec2 = { x: 100, y: 0 };
  check('angleAt right angle', angleAt(a, b, c), 90, 0.001);
  // Straight line = 180°.
  check('angleAt straight', angleAt({ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }), 180, 0.001);

  // Guards #1: vertical thigh (hip above knee, y-down) → adduction ≈ 0.
  check('deviationFromVertical vertical thigh = 0',
    deviationFromVertical({ x: 30, y: 10 } /*hip*/, { x: 30, y: 90 } /*knee*/), 0, 0.001);
  check('deviationFromVertical horizontal = 90',
    deviationFromVertical({ x: 10, y: 50 }, { x: 90, y: 50 }), 90, 0.001);
  // Order independence.
  check('deviationFromVertical order-independent',
    deviationFromVertical({ x: 90, y: 50 }, { x: 10, y: 50 }), 90, 0.001);

  // Guards #2: level pelvis with REVERSED x-order (anatomical right left of left) → ~0.
  check('lineAngleFromHorizontal level pelvis reversed x-order = 0',
    lineAngleFromHorizontal({ x: 80, y: 40 } /*right appears left*/, { x: 20, y: 40 } /*left*/), 0, 0.001);
  check('lineAngleFromHorizontal 45deg', lineAngleFromHorizontal({ x: 0, y: 0 }, { x: 10, y: 10 }), 45, 0.001);

  // Guards #3: pixel scaling matters — the SAME normalized delta yields different
  // angles on a non-square frame, so callers MUST scale by W/H (angleAt honors it).
  const W = 1032, H = 688;
  const norm = { p1: { x: 0.4, y: 0.4 }, p2: { x: 0.5, y: 0.5 }, p3: { x: 0.6, y: 0.4 } };
  const angNorm = angleAt(norm.p1, norm.p2, norm.p3);
  const angPx = angleAt(
    { x: norm.p1.x * W, y: norm.p1.y * H },
    { x: norm.p2.x * W, y: norm.p2.y * H },
    { x: norm.p3.x * W, y: norm.p3.y * H },
  );
  checkTrue('pixel scaling changes angle on non-square frame (scaling required)',
    Math.abs(angNorm - angPx) > 5);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
