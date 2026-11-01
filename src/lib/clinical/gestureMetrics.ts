// ============================================
// Gesture Metrics — Time-Series Movement Analysis
// v1 — Running gait · Heel raise · Single-leg horizontal hop
// ============================================
//
// WHY THIS EXISTS
// ---------------
// The pose pipeline in `poseBiomechanics.ts` (analyzeVideoTemporal) samples a
// handful of frames and takes the MEDIAN of each metric. That is correct for a
// held posture (overhead/single-leg squat peak) but structurally cannot produce
// the variables that DEFINE these three gestures — cadence, heel-raise rep
// counts, support time, hop distance, and peak joint angles — because those
// require the full temporal signal, not a median of a few frames.
//
// This module collects a DENSE per-frame landmark time series (same MediaPipe
// `pose_landmarker_lite` model the app already uses, via detectPoseLandmarks)
// and computes those gesture metrics with event detection (foot contacts, rep
// cycles, take-off/landing) and robust peak estimation. Pure math and geometry
// live in `gestureMath.ts` (unit-tested independently).
//
// GEOMETRY: all angles are computed in PIXEL space (normalized landmarks scaled
// by video width/height) in the camera's image plane — never using BlazePose's
// unreliable z. For a single camera the image plane IS the sagittal plane
// (sagittal video) or the frontal plane (frontal video).
//
// HONESTY BY VARIABLE
// -------------------
// Each metric is tagged with the plane it lives in and a confidence tier.
// Metrics whose plane is not observable from the supplied camera view return
// value = null with an explicit note. Transverse (axial rotation) is never
// recoverable from one 2D view. This mirrors the markerless-validity finding
// (vault: poc-markerless-vs-vicon-passo-zero, visao-computacional-de-movimento).
//
// USAGE (browser)
// ---------------
//   const video = document.createElement('video');
//   video.src = url; await video.play(); video.pause();
//   const result = await analyzeGestureVideo(video, 'running', { plane: 'sagittal' });
//   // result.metrics -> [{ key:'cadenceSpm', value:158.2, plane, confidence, flagged, ... }]

import { detectPoseLandmarks, LANDMARKS, type RawLandmark } from './poseBiomechanics';
import { getClinicalThresholds } from './clinicalThresholds';
import type { MetricThreshold } from './types';
import {
  type Vec2,
  percentile,
  median,
  amplitude,
  smoothedMax,
  findPeaksTimed,
  countCyclesTimed,
  mergeEventTimes,
  angleAt,
  deviationFromVertical,
  lineAngleFromHorizontal,
} from './gestureMath';

// ============================================
// Types
// ============================================

export type GestureType = 'running' | 'heel_raise' | 'single_leg_hop';

/** The plane a metric physically lives in. */
export type MetricPlane = 'sagittal' | 'frontal' | 'transverse' | 'spatiotemporal';

/** Recoverability tier for a metric from a single 2D camera view. */
export type ConfidenceTier = 'high' | 'moderate' | 'low' | 'not_recoverable';

/** Which camera plane the supplied video was filmed in. */
export interface GestureView {
  plane: 'sagittal' | 'frontal';
  /** Stance/observed side. Auto-detected from landmark visibility if omitted. */
  side?: 'left' | 'right';
}

export interface GestureAnalysisOptions extends GestureView {
  /** Frames-per-second to sample the video at (default: 30). */
  sampleFps?: number;
  /** Subject stature in cm — enables cm outputs for distance/height metrics. */
  subjectHeightCm?: number;
  /** Hard cap on total processing time; analysis stops early and reports partial. */
  timeoutMs?: number;
}

export interface GestureMetric {
  key: string;
  label: string;
  /** Numeric value, or null when not recoverable from this view. */
  value: number | null;
  unit: string;
  plane: MetricPlane;
  confidence: ConfidenceTier;
  /** True when value crosses its clinical/normative threshold (if defined). */
  flagged: boolean;
  /** Human-readable caveat — always populated when value is null. */
  note?: string;
}

/** How the analyzed side was chosen when `side` was not supplied. */
export interface SideInference {
  side: 'left' | 'right';
  /** Visibility margin between sides, 0–1. Low margin = ambiguous. */
  margin: number;
  confidence: 'ok' | 'low';
}

export interface GestureAnalysisResult {
  gesture: GestureType;
  view: GestureView;
  metrics: GestureMetric[];
  /** Present only when `side` was auto-inferred (not supplied by caller). */
  sideInference?: SideInference;
  // Provenance / quality
  frameCountRequested: number;
  frameCountUsed: number;
  poseDetectionRate: number; // fraction of sampled frames with a valid pose
  durationSec: number;
  processingMs: number;
  /** True when pose detection was too sparse to trust any temporal metric. */
  insufficientPose: boolean;
}

interface FrameSample {
  t: number;
  lm: RawLandmark[];
}

// ============================================
// Public spec — what each gesture reports, and where each metric lives
// ============================================

interface MetricSpec {
  key: string;
  label: string;
  unit: string;
  plane: MetricPlane;
  confidence: ConfidenceTier;
}

/**
 * The catalogue of metrics per gesture, with plane + confidence tier. Useful
 * for building a "confidence per variable" report UI without running analysis.
 */
export const GESTURE_SPECS: Record<GestureType, { label: string; supportedViews: Array<'sagittal' | 'frontal'>; metrics: MetricSpec[] }> = {
  running: {
    label: 'Corrida',
    supportedViews: ['sagittal', 'frontal'],
    metrics: [
      { key: 'cadenceSpm', label: 'Cadência', unit: 'passos/min', plane: 'spatiotemporal', confidence: 'high' },
      { key: 'stepLengthPctHeight', label: 'Comprimento de passo', unit: '% estatura', plane: 'spatiotemporal', confidence: 'moderate' },
      { key: 'supportTimePct', label: 'Tempo de apoio', unit: '% do ciclo', plane: 'spatiotemporal', confidence: 'moderate' },
      { key: 'trunkFlexionPeakDeg', label: 'Flexão de tronco (pico)', unit: '°', plane: 'sagittal', confidence: 'high' },
      { key: 'kneeFlexionPeakDeg', label: 'Flexão de joelho (pico)', unit: '°', plane: 'sagittal', confidence: 'high' },
      { key: 'hipFlexionPeakDeg', label: 'Flexão de quadril (pico)', unit: '°', plane: 'sagittal', confidence: 'high' },
      { key: 'ankleDorsiflexionProxyDeg', label: 'Dorsiflexão (proxy)', unit: '°', plane: 'sagittal', confidence: 'moderate' },
      { key: 'pelvicDropPeakDeg', label: 'Queda pélvica (pico)', unit: '°', plane: 'frontal', confidence: 'low' },
      { key: 'hipAdductionPeakDeg', label: 'Adução de quadril (pico)', unit: '°', plane: 'frontal', confidence: 'low' },
      { key: 'ankleInversionProxyDeg', label: 'Inversão de tornozelo (proxy)', unit: '°', plane: 'frontal', confidence: 'low' },
      { key: 'hipInternalRotationDeg', label: 'Rotação interna de quadril', unit: '°', plane: 'transverse', confidence: 'not_recoverable' },
    ],
  },
  heel_raise: {
    label: 'Heel Raise',
    supportedViews: ['sagittal', 'frontal'],
    metrics: [
      { key: 'reps', label: 'Repetições', unit: 'reps', plane: 'spatiotemporal', confidence: 'high' },
      { key: 'heelHeightPctLeg', label: 'Altura do calcanhar', unit: '% comprimento perna', plane: 'sagittal', confidence: 'moderate' },
      { key: 'heelHeightCm', label: 'Altura do calcanhar', unit: 'cm', plane: 'sagittal', confidence: 'moderate' },
      { key: 'anklePlantarflexionPeakDeg', label: 'Flexão plantar (pico)', unit: '°', plane: 'sagittal', confidence: 'moderate' },
      { key: 'peakInversionProxyDeg', label: 'Inversão (pico, proxy)', unit: '°', plane: 'frontal', confidence: 'low' },
    ],
  },
  single_leg_hop: {
    label: 'Salto Horizontal Unipodal',
    supportedViews: ['sagittal', 'frontal'],
    metrics: [
      { key: 'distancePctHeight', label: 'Distância', unit: '% estatura', plane: 'spatiotemporal', confidence: 'moderate' },
      { key: 'distanceCm', label: 'Distância', unit: 'cm', plane: 'spatiotemporal', confidence: 'moderate' },
      { key: 'trunkFlexionPeakDeg', label: 'Flexão de tronco (pico)', unit: '°', plane: 'sagittal', confidence: 'high' },
      { key: 'hipFlexionPeakDeg', label: 'Flexão de quadril (pico)', unit: '°', plane: 'sagittal', confidence: 'high' },
      { key: 'kneeFlexionPeakDeg', label: 'Flexão de joelho (pico)', unit: '°', plane: 'sagittal', confidence: 'high' },
      { key: 'pelvicDropContraPeakDeg', label: 'Queda pélvica contralateral (pico)', unit: '°', plane: 'frontal', confidence: 'low' },
      { key: 'hipAdductionPeakDeg', label: 'Adução de quadril (pico)', unit: '°', plane: 'frontal', confidence: 'moderate' },
      { key: 'hipInternalRotationDeg', label: 'Rotação interna de quadril', unit: '°', plane: 'transverse', confidence: 'not_recoverable' },
    ],
  },
};

const THRESHOLD_KEY: Record<GestureType, 'running' | 'heelRaise' | 'singleLegHop'> = {
  running: 'running',
  heel_raise: 'heelRaise',
  single_leg_hop: 'singleLegHop',
};

// Minimum time between counted foot contacts / heel-raise reps (seconds).
const MIN_CONTACT_SEC = 0.22;
const MIN_REP_SEC = 0.30;
// Minimum normalized vertical foot travel to treat as real stepping (not jitter).
const MIN_STEP_OSCILLATION = 0.02;
// Nose→heel span underestimates true stature by ~12%; correct cm scale for it.
const NOSE_TO_HEEL_AS_FRACTION_OF_STATURE = 0.88;

// ============================================
// Public entry point
// ============================================

/**
 * Analyze a single-plane gesture video and return per-metric values, each with
 * its plane and confidence tier. Metrics whose plane is not observable from the
 * supplied camera view are returned with value = null and an explanatory note.
 */
export async function analyzeGestureVideo(
  video: HTMLVideoElement,
  gesture: GestureType,
  options: GestureAnalysisOptions
): Promise<GestureAnalysisResult> {
  const started = nowMs();
  const duration = video.duration;
  const W = video.videoWidth || 1;
  const H = video.videoHeight || 1;
  const spec = GESTURE_SPECS[gesture];

  const emptyResult = (frames: FrameSample[], requested: number, side: 'left' | 'right'): GestureAnalysisResult => ({
    gesture,
    view: { plane: options.plane, side },
    metrics: spec.metrics.map(m => notRecoverable(m, 'Pose insuficiente no vídeo (detecção esparsa) — não recuperável.')),
    frameCountRequested: requested,
    frameCountUsed: frames.length,
    poseDetectionRate: requested > 0 ? frames.length / requested : 0,
    durationSec: duration || 0,
    processingMs: Math.round(nowMs() - started),
    insufficientPose: true,
  });

  if (!duration || duration <= 0) return emptyResult([], 0, options.side ?? 'left');

  const sampleFps = options.sampleFps ?? 30;
  const step = 1 / sampleFps;
  const requested = Math.max(1, Math.floor(duration / step));

  // ── Collect dense landmark time series ───────────────────────────────
  const frames: FrameSample[] = [];
  const timeout = options.timeoutMs ?? 60000;
  for (let i = 0; i < requested; i++) {
    if (nowMs() - started > timeout) break;
    const t = i * step;
    try {
      const canvas = await seekAndCapture(video, t, step);
      const lm = await detectPoseLandmarks(canvas);
      if (lm && keyJointsVisible(lm)) frames.push({ t, lm });
    } catch {
      /* skip unreadable frame */
    }
  }

  const detectionRate = frames.length / requested;
  const inferred = inferSide(frames);
  const side = options.side ?? inferred.side;

  // Need a minimum density for any temporal metric to be trustworthy.
  if (frames.length < 8 || detectionRate < 0.3) {
    return emptyResult(frames, requested, side);
  }

  const ctx: ComputeCtx = {
    frames,
    times: frames.map(f => f.t),
    W,
    H,
    side,
    subjectHeightCm: options.subjectHeightCm,
    view: { plane: options.plane, side },
    sideAmbiguous: !options.side && inferred.confidence === 'low',
  };

  const raw =
    gesture === 'running' ? computeRunning(ctx)
    : gesture === 'heel_raise' ? computeHeelRaise(ctx)
    : computeSingleLegHop(ctx);

  // Attach thresholds/flags across ALL gesture buckets (metric keys are unique
  // per gesture, so a spatiotemporal metric like cadence is flagged in any view).
  const buckets = getClinicalThresholds().poseObjective[THRESHOLD_KEY[gesture]] ?? {};
  const metrics = spec.metrics.map(m => {
    const computed = raw[m.key];
    if (!computed || computed.value === null || Number.isNaN(computed.value)) {
      return notRecoverable(m, computed?.note ?? planeNote(m, ctx.view));
    }
    const th = findThresholdForMetric(buckets, m.key);
    const flagged = th ? (th.direction === 'above' ? computed.value > th.threshold : computed.value < th.threshold) : false;
    let note = computed.note;
    // Surface side ambiguity on side-dependent metrics.
    if (ctx.sideAmbiguous && m.plane !== 'spatiotemporal') {
      note = joinNote(note, `Lado inferido com baixa margem (${side}) — informe "side" para desambiguar.`);
    }
    return { key: m.key, label: m.label, unit: m.unit, plane: m.plane, confidence: m.confidence, value: round1(computed.value), flagged, note };
  });

  return {
    gesture,
    view: { plane: options.plane, side },
    metrics,
    sideInference: options.side ? undefined : inferred,
    frameCountRequested: requested,
    frameCountUsed: frames.length,
    poseDetectionRate: round2(detectionRate),
    durationSec: round2(duration),
    processingMs: Math.round(nowMs() - started),
    insufficientPose: false,
  };
}

// ============================================
// Per-gesture computation
// ============================================

interface ComputeCtx {
  frames: FrameSample[];
  times: number[];
  W: number;
  H: number;
  side: 'left' | 'right';
  subjectHeightCm?: number;
  view: GestureView;
  sideAmbiguous: boolean;
}

interface RawMetric { value: number | null; note?: string }
type RawMetrics = Record<string, RawMetric | undefined>;

function computeRunning(ctx: ComputeCtx): RawMetrics {
  const out: RawMetrics = {};
  const sagittal = ctx.view.plane === 'sagittal';
  const frontal = ctx.view.plane === 'frontal';

  // Cadence works in either plane (vertical foot oscillation is visible in both).
  out.cadenceSpm = { value: computeCadence(ctx) };

  if (sagittal) {
    out.stepLengthPctHeight = computeStepLengthPctHeight(ctx);
    out.supportTimePct = { value: computeSupportTimePct(ctx) };
    out.trunkFlexionPeakDeg = { value: peak(trunkFlexionSeries(ctx)) };
    out.kneeFlexionPeakDeg = { value: peak(kneeFlexionSeries(ctx)) };
    out.hipFlexionPeakDeg = { value: peak(hipFlexionSeries(ctx)) };
    out.ankleDorsiflexionProxyDeg = { value: peak(ankleDorsiflexionSeries(ctx)), note: 'Proxy do ângulo perna-pé; segmento curto, ruidoso.' };
  }
  if (frontal) {
    out.pelvicDropPeakDeg = { value: peak(pelvicObliquitySeries(ctx)), note: 'Plano frontal, pequena amplitude — baixa confiança.' };
    out.hipAdductionPeakDeg = { value: peak(hipAdductionSeries(ctx)), note: 'Plano frontal — confiança limitada.' };
    out.ankleInversionProxyDeg = { value: peak(ankleInversionProxySeries(ctx)), note: 'Proxy 2D de inversão; amplitude ~ piso de ruído.' };
  }
  return out;
}

function computeHeelRaise(ctx: ComputeCtx): RawMetrics {
  const out: RawMetrics = {};
  const heelElev = heelElevationSeriesPx(ctx); // px, up = positive

  // Reps: count elevation cycles. Visible from both sagittal and frontal.
  out.reps = { value: countCyclesTimed(heelElev, ctx.times, MIN_REP_SEC) };

  if (ctx.view.plane === 'sagittal') {
    const legPx = medianLegLengthPx(ctx);
    const heightPx = amplitude(heelElev);
    out.heelHeightPctLeg = { value: legPx > 0 ? (heightPx / legPx) * 100 : null, note: legPx > 0 ? undefined : 'Comprimento de perna não estimável (visibilidade).' };
    out.heelHeightCm = cmFromPx(heightPx, ctx, 'Requer estatura do sujeito (subjectHeightCm) para escala em cm.');
    out.anklePlantarflexionPeakDeg = { value: peak(anklePlantarflexionSeries(ctx)), note: 'Segmento do pé é curto — confiança moderada.' };
  }
  if (ctx.view.plane === 'frontal') {
    out.peakInversionProxyDeg = { value: peak(ankleInversionProxySeries(ctx)), note: 'Proxy 2D; a amplitude real (≈1–3°) fica abaixo do piso de ruído.' };
  }
  return out;
}

function computeSingleLegHop(ctx: ComputeCtx): RawMetrics {
  const out: RawMetrics = {};

  if (ctx.view.plane === 'sagittal') {
    const dist = computeHopDistancePx(ctx);
    const statPx = medianStaturePx(ctx);
    out.distancePctHeight = dist.value !== null && statPx > 0
      ? { value: (dist.value / statPx) * 100 }
      : { value: null, note: dist.note ?? 'Estatura em pixels não estimável (visibilidade).' };
    out.distanceCm = dist.value !== null
      ? cmFromPx(dist.value, ctx, 'Requer estatura do sujeito (subjectHeightCm) para escala em cm.')
      : { value: null, note: dist.note };
    out.trunkFlexionPeakDeg = { value: peak(trunkFlexionSeries(ctx)) };
    out.hipFlexionPeakDeg = { value: peak(hipFlexionSeries(ctx)) };
    out.kneeFlexionPeakDeg = { value: peak(kneeFlexionSeries(ctx)) };
  }
  if (ctx.view.plane === 'frontal') {
    out.pelvicDropContraPeakDeg = { value: peak(pelvicObliquitySeries(ctx)), note: 'Plano frontal, pequena amplitude — baixa confiança; lado do sinal não resolvido em 2D.' };
    out.hipAdductionPeakDeg = { value: peak(hipAdductionSeries(ctx)) };
    // hip internal rotation is transverse → left null by planeNote()
  }
  return out;
}

// ============================================
// Signal builders (per-frame scalar series, pixel geometry)
// ============================================

function pt(f: FrameSample, idx: number, ctx: ComputeCtx): Vec2 {
  return { x: f.lm[idx].x * ctx.W, y: f.lm[idx].y * ctx.H };
}

function trunkFlexionSeries(ctx: ComputeCtx): number[] {
  const s = sideIdx(ctx.side);
  return ctx.frames.map(f => deviationFromVertical(pt(f, s.shoulder, ctx), pt(f, s.hip, ctx)));
}

function kneeFlexionSeries(ctx: ComputeCtx): number[] {
  const s = sideIdx(ctx.side);
  return ctx.frames.map(f => 180 - angleAt(pt(f, s.hip, ctx), pt(f, s.knee, ctx), pt(f, s.ankle, ctx)));
}

function hipFlexionSeries(ctx: ComputeCtx): number[] {
  const s = sideIdx(ctx.side);
  return ctx.frames.map(f => 180 - angleAt(pt(f, s.shoulder, ctx), pt(f, s.hip, ctx), pt(f, s.knee, ctx)));
}

function ankleDorsiflexionSeries(ctx: ComputeCtx): number[] {
  const s = sideIdx(ctx.side);
  return ctx.frames.map(f => Math.max(0, 90 - angleAt(pt(f, s.knee, ctx), pt(f, s.ankle, ctx), pt(f, s.footIndex, ctx))));
}

function anklePlantarflexionSeries(ctx: ComputeCtx): number[] {
  const s = sideIdx(ctx.side);
  return ctx.frames.map(f => Math.max(0, angleAt(pt(f, s.knee, ctx), pt(f, s.ankle, ctx), pt(f, s.footIndex, ctx)) - 90));
}

function pelvicObliquitySeries(ctx: ComputeCtx): number[] {
  return ctx.frames.map(f => lineAngleFromHorizontal(pt(f, LANDMARKS.LEFT_HIP, ctx), pt(f, LANDMARKS.RIGHT_HIP, ctx)));
}

function hipAdductionSeries(ctx: ComputeCtx): number[] {
  const s = sideIdx(ctx.side);
  // Deviation of the thigh (upper = hip, lower = knee) from vertical.
  return ctx.frames.map(f => deviationFromVertical(pt(f, s.hip, ctx), pt(f, s.knee, ctx)));
}

function ankleInversionProxySeries(ctx: ComputeCtx): number[] {
  const s = sideIdx(ctx.side);
  // Rough 2D proxy: tilt of the heel→foot segment from vertical.
  return ctx.frames.map(f => deviationFromVertical(pt(f, s.footIndex, ctx), pt(f, s.heel, ctx)));
}

function heelElevationSeriesPx(ctx: ComputeCtx): number[] {
  const s = sideIdx(ctx.side);
  // Up = positive. y grows downward, so elevation = baseline(max y) − y.
  const yPx = ctx.frames.map(f => f.lm[s.heel].y * ctx.H);
  const baseline = Math.max(...yPx);
  return yPx.map(y => baseline - y);
}

// ============================================
// Spatiotemporal computations
// ============================================

function computeCadence(ctx: ComputeCtx): number | null {
  const dur = ctx.times[ctx.times.length - 1] - ctx.times[0];
  if (dur <= 0) return null;
  // Foot contact ≈ ankle at its lowest (max y). Count prominent contacts per
  // foot, then merge cross-foot events so near-simultaneous ones aren't doubled.
  const contactTimes = (idx: number): number[] => {
    const y = ctx.frames.map(f => f.lm[idx].y); // normalized y is fine for temporal peaks
    const range = Math.max(...y) - Math.min(...y);
    // Absolute floor: below this the foot barely moves — near-static jitter, not
    // stepping. Prevents counting landmark noise as contacts on a still subject.
    if (range < MIN_STEP_OSCILLATION) return [];
    return findPeaksTimed(y, ctx.times, MIN_CONTACT_SEC, 0.2 * range).map(i => ctx.times[i]);
  };
  const events = mergeEventTimes([...contactTimes(LANDMARKS.LEFT_ANKLE), ...contactTimes(LANDMARKS.RIGHT_ANKLE)], MIN_CONTACT_SEC);
  if (events.length < 2) return null;
  return (events.length / dur) * 60;
}

function computeSupportTimePct(ctx: ComputeCtx): number | null {
  const s = sideIdx(ctx.side);
  const y = ctx.frames.map(f => f.lm[s.ankle].y);
  const lo = Math.min(...y), hi = Math.max(...y);
  const range = hi - lo;
  if (range <= 0) return null;
  // Stance ≈ ankle within the lowest 30% of its vertical travel.
  const contactFrames = y.filter(v => v >= hi - 0.3 * range).length;
  return (contactFrames / y.length) * 100;
}

function computeStepLengthPctHeight(ctx: ComputeCtx): RawMetric {
  const statPx = medianStaturePx(ctx);
  if (statPx <= 0) return { value: null, note: 'Estatura em pixels não estimável (visibilidade).' };
  let maxSep = 0;
  for (const f of ctx.frames) {
    const sep = Math.abs(f.lm[LANDMARKS.LEFT_ANKLE].x - f.lm[LANDMARKS.RIGHT_ANKLE].x) * ctx.W;
    if (sep > maxSep) maxSep = sep;
  }
  return { value: (maxSep / statPx) * 100 };
}

/**
 * Hop distance from take-off to landing (px). Detects the flight phase as the
 * longest contiguous window where the higher foot rises clearly above its
 * standing baseline, then measures pelvis horizontal travel between the last
 * stance frame before flight and the first stance frame after landing.
 */
function computeHopDistancePx(ctx: ComputeCtx): RawMetric {
  const legPx = medianLegLengthPx(ctx);
  if (legPx <= 0) return { value: null, note: 'Comprimento de perna não estimável (visibilidade).' };

  const higherFootYpx = ctx.frames.map(f => Math.min(f.lm[LANDMARKS.LEFT_ANKLE].y, f.lm[LANDMARKS.RIGHT_ANKLE].y) * ctx.H);
  const baseline = percentile(higherFootYpx, 90); // stance low position (large y)
  const elevation = higherFootYpx.map(y => baseline - y); // positive when foot up
  const thr = 0.15 * legPx;

  // Longest contiguous run above threshold = flight phase.
  let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
  for (let i = 0; i < elevation.length; i++) {
    if (elevation[i] > thr) {
      if (curStart < 0) { curStart = i; curLen = 0; }
      curLen++;
      if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
    } else {
      curStart = -1; curLen = 0;
    }
  }
  if (bestStart < 0 || bestLen < 2) return { value: null, note: 'Fase de voo não detectada — distância não recuperável neste vídeo.' };

  // The flight must be bracketed by real stance frames: one before take-off and
  // one after landing. If it touches the clip's first/last frame we never saw the
  // ground contact, so the horizontal endpoints are unknown → not recoverable.
  if (bestStart < 1 || bestStart + bestLen > ctx.frames.length - 1) {
    return { value: null, note: 'Voo toca o início/fim do vídeo — decolagem/aterrissagem fora do enquadramento temporal.' };
  }
  const takeoff = bestStart - 1;
  const landing = bestStart + bestLen;
  const pelvisX = (f: FrameSample) => ((f.lm[LANDMARKS.LEFT_HIP].x + f.lm[LANDMARKS.RIGHT_HIP].x) / 2) * ctx.W;
  return { value: Math.abs(pelvisX(ctx.frames[landing]) - pelvisX(ctx.frames[takeoff])) };
}

// ============================================
// Scale helpers (with visibility guards)
// ============================================

function medianStaturePx(ctx: ComputeCtx): number {
  // Standing stature ≈ nose→lower-heel vertical span, using only frames where
  // nose and at least one heel are confidently visible.
  const spans: number[] = [];
  for (const f of ctx.frames) {
    if ((f.lm[LANDMARKS.NOSE].visibility ?? 0) < 0.5) continue;
    const lh = f.lm[LANDMARKS.LEFT_HEEL], rh = f.lm[LANDMARKS.RIGHT_HEEL];
    const lhOk = (lh.visibility ?? 0) >= 0.5, rhOk = (rh.visibility ?? 0) >= 0.5;
    if (!lhOk && !rhOk) continue;
    // Use only VISIBLE heels — an occluded heel can carry junk coordinates that
    // would corrupt the stature scale via Math.max.
    const bottom = lhOk && rhOk ? Math.max(lh.y, rh.y) : lhOk ? lh.y : rh.y;
    spans.push(Math.abs(bottom - f.lm[LANDMARKS.NOSE].y) * ctx.H);
  }
  return spans.length ? median(spans) : 0;
}

function medianLegLengthPx(ctx: ComputeCtx): number {
  const s = sideIdx(ctx.side);
  const lens: number[] = [];
  for (const f of ctx.frames) {
    if ((f.lm[s.hip].visibility ?? 0) < 0.5 || (f.lm[s.ankle].visibility ?? 0) < 0.5) continue;
    const dx = (f.lm[s.hip].x - f.lm[s.ankle].x) * ctx.W;
    const dy = (f.lm[s.hip].y - f.lm[s.ankle].y) * ctx.H;
    lens.push(Math.hypot(dx, dy));
  }
  return lens.length ? median(lens) : 0;
}

function cmFromPx(px: number, ctx: ComputeCtx, missingNote: string): RawMetric {
  if (!ctx.subjectHeightCm) return { value: null, note: missingNote };
  const statPx = medianStaturePx(ctx);
  if (statPx <= 0) return { value: null, note: 'Estatura em pixels não estimável (visibilidade).' };
  const cmPerPx = ctx.subjectHeightCm / (statPx / NOSE_TO_HEEL_AS_FRACTION_OF_STATURE);
  return { value: px * cmPerPx };
}

// ============================================
// Robust peak
// ============================================

function peak(series: number[]): number | null {
  // Smoothed max: kills single-frame landmark spikes, preserves brief real peaks.
  return smoothedMax(series, 3);
}

// ============================================
// Landmark side selection & visibility
// ============================================

interface SideIndices { shoulder: number; hip: number; knee: number; ankle: number; heel: number; footIndex: number }

function sideIdx(side: 'left' | 'right'): SideIndices {
  return side === 'left'
    ? { shoulder: LANDMARKS.LEFT_SHOULDER, hip: LANDMARKS.LEFT_HIP, knee: LANDMARKS.LEFT_KNEE, ankle: LANDMARKS.LEFT_ANKLE, heel: LANDMARKS.LEFT_HEEL, footIndex: LANDMARKS.LEFT_FOOT_INDEX }
    : { shoulder: LANDMARKS.RIGHT_SHOULDER, hip: LANDMARKS.RIGHT_HIP, knee: LANDMARKS.RIGHT_KNEE, ankle: LANDMARKS.RIGHT_ANKLE, heel: LANDMARKS.RIGHT_HEEL, footIndex: LANDMARKS.RIGHT_FOOT_INDEX };
}

function inferSide(frames: FrameSample[]): SideInference {
  const vis = (idxs: number[]) =>
    frames.reduce((sum, f) => sum + idxs.reduce((s, i) => s + (f.lm[i]?.visibility ?? 0), 0), 0);
  const left = vis([LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE]);
  const right = vis([LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE]);
  const total = left + right;
  const margin = total > 0 ? Math.abs(left - right) / total : 0;
  return { side: right > left ? 'right' : 'left', margin: round2(margin), confidence: margin < 0.1 ? 'low' : 'ok' };
}

function keyJointsVisible(lm: RawLandmark[]): boolean {
  const key = [LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.RIGHT_KNEE, LANDMARKS.LEFT_ANKLE, LANDMARKS.RIGHT_ANKLE];
  return key.filter(i => (lm[i]?.visibility ?? 0) >= 0.4).length >= 4;
}

// ============================================
// Threshold lookup
// ============================================

/**
 * Find the threshold for a metric across ALL of a gesture's view buckets.
 * Metric keys are unique within a gesture, so a spatiotemporal metric (cadence,
 * reps) is flagged regardless of which view is analyzed. Warns on a genuine
 * conflict (same metric, different threshold/direction) and picks the first
 * deterministically.
 */
function findThresholdForMetric(buckets: Record<string, MetricThreshold[]>, metric: string): MetricThreshold | undefined {
  const matches: MetricThreshold[] = [];
  for (const arr of Object.values(buckets)) for (const t of arr) if (t.metric === metric) matches.push(t);
  if (matches.length === 0) return undefined;
  const first = matches[0];
  if (matches.some(m => m.threshold !== first.threshold || m.direction !== first.direction)) {
    console.warn(`[gestureMetrics] Conflicting thresholds for metric "${metric}"; using the first.`);
  }
  return first;
}

// ============================================
// Result helpers
// ============================================

function notRecoverable(m: MetricSpec, note: string): GestureMetric {
  return { key: m.key, label: m.label, unit: m.unit, plane: m.plane, confidence: m.confidence, value: null, flagged: false, note };
}

function planeNote(m: MetricSpec, view: GestureView): string {
  if (m.plane === 'transverse') return 'Não recuperável em 2D: rotação axial fora do plano da câmera.';
  if (m.plane !== 'spatiotemporal' && m.plane !== view.plane) return `Não recuperável neste enquadramento — requer plano ${m.plane === 'sagittal' ? 'sagital' : 'frontal'}.`;
  return 'Não recuperável neste enquadramento.';
}

function joinNote(existing: string | undefined, extra: string): string {
  return existing ? `${existing} ${extra}` : extra;
}

// ============================================
// Frame capture (browser) — robust seek
// ============================================

function seekAndCapture(video: HTMLVideoElement, time: number, step: number): Promise<HTMLCanvasElement> {
  const target = Math.max(0, Math.min(time, video.duration));

  const grab = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const c2d = canvas.getContext('2d');
    if (!c2d) throw new Error('No canvas 2d context');
    c2d.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  };

  return new Promise((resolve, reject) => {
    // Already at (or effectively at) the target frame — 'seeked' may never fire.
    if (Math.abs(video.currentTime - target) < step / 2) {
      try { resolve(grab()); } catch (e) { reject(e); }
      return;
    }
    let settled = false;
    const cleanup = () => { video.removeEventListener('seeked', onSeeked); clearTimeout(timer); };
    const onSeeked = () => {
      if (settled) return;
      settled = true;
      cleanup();
      try { resolve(grab()); } catch (e) { reject(e); }
    };
    // Per-seek watchdog so a missing 'seeked' event cannot hang the whole run.
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      try { resolve(grab()); } catch (e) { reject(e); }
    }, 2000);
    video.addEventListener('seeked', onSeeked);
    video.currentTime = target;
  });
}

// performance.now() is available in the browser; guard for non-DOM contexts.
function nowMs(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : 0;
}

function round1(v: number): number { return Math.round(v * 10) / 10; }
function round2(v: number): number { return Math.round(v * 100) / 100; }
