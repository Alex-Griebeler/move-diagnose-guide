// ============================================
// Pose Biomechanics — BlazePose/MediaPipe Wrapper
// v3 — Added analyzeVideoTemporal with timeout fallback
// ============================================

import { getClinicalThresholds } from './clinicalThresholds';
import type { PoseResult, MetricThreshold } from './types';

// Type for the MediaPipe PoseLandmarker (lazy loaded)
let poseLandmarkerInstance: any = null;
let loadingPromise: Promise<any> | null = null;

// MediaPipe landmark indices (BlazePose 33-point model)
const LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
} as const;

/**
 * Lazy-load the MediaPipe PoseLandmarker model.
 */
async function loadPoseModel(): Promise<any> {
  if (poseLandmarkerInstance) return poseLandmarkerInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        numPoses: 1,
      });
      return poseLandmarkerInstance;
    } catch (error) {
      console.warn('Failed to load pose model, falling back to CPU:', error);
      try {
        const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'CPU',
          },
          runningMode: 'IMAGE',
          numPoses: 1,
        });
        return poseLandmarkerInstance;
      } catch (fallbackError) {
        loadingPromise = null;
        throw fallbackError;
      }
    }
  })();

  return loadingPromise;
}

/**
 * Analyze pose from an image/video frame and extract biomechanical metrics.
 */
export async function analyzePose(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  testType: 'overhead_squat' | 'single_leg_squat' | 'pushup',
  viewType: string
): Promise<PoseResult> {
  const thresholds = getClinicalThresholds();

  try {
    const landmarker = await loadPoseModel();
    const result = landmarker.detect(source);

    if (!result.landmarks || result.landmarks.length === 0) {
      return { poseConfidence: 0, objectiveMetrics: {}, objectiveFindings: [], landmarkCount: 0 };
    }

    const landmarks = result.landmarks[0];
    const poseConfidence = computePoseConfidence(landmarks, thresholds.confidence.minLandmarkVisibility);

    if (poseConfidence < thresholds.confidence.minPoseConfidence) {
      return { poseConfidence, objectiveMetrics: {}, objectiveFindings: [], landmarkCount: landmarks.length };
    }

    const objectiveMetrics = extractMetrics(landmarks, testType, viewType);
    const normalizedView = normalizeViewType(viewType);
    const testKey = testType === 'overhead_squat' ? 'ohs' : testType === 'single_leg_squat' ? 'sls' : 'pushup';
    const metricThresholds = thresholds.poseObjective[testKey]?.[normalizedView] as MetricThreshold[] | undefined;

    const objectiveFindings: string[] = [];
    if (metricThresholds) {
      metricThresholds.forEach(threshold => {
        const value = objectiveMetrics[threshold.metric];
        if (value === undefined) return;
        const flagged = threshold.direction === 'above' ? value > threshold.threshold : value < threshold.threshold;
        if (flagged) objectiveFindings.push(threshold.compensationId);
      });
    }

    return { poseConfidence, objectiveMetrics, objectiveFindings, landmarkCount: landmarks.length };
  } catch (error) {
    console.warn('Pose analysis failed:', error);
    return { poseConfidence: 0, objectiveMetrics: {}, objectiveFindings: [], landmarkCount: 0 };
  }
}

/**
 * Temporal video analysis: samples multiple frames from a video, aggregates results.
 * If timeout occurs, falls back to single mid-frame with temporalTimeoutFallback = true
 * which forces indeterminate status (never ready).
 */
export async function analyzeVideoTemporal(
  video: HTMLVideoElement,
  testType: 'overhead_squat' | 'single_leg_squat' | 'pushup',
  viewType: string
): Promise<PoseResult> {
  const config = getClinicalThresholds().temporalAnalysis;
  const startTime = performance.now();
  const frameCount = Math.min(config.defaultFrameCount, config.maxFrameCount);
  const duration = video.duration;

  if (!duration || duration <= 0) {
    return { poseConfidence: 0, objectiveMetrics: {}, objectiveFindings: [], landmarkCount: 0 };
  }

  const frameResults: PoseResult[] = [];
  let timedOut = false;
  let qualityPassCount = 0;

  // Sample frames uniformly across video duration (skip first/last 10%)
  const startOffset = duration * 0.1;
  const endOffset = duration * 0.9;
  const interval = (endOffset - startOffset) / (frameCount - 1 || 1);

  for (let i = 0; i < frameCount; i++) {
    // Check timeout
    if (performance.now() - startTime > config.analysisTimeoutMs) {
      timedOut = true;
      break;
    }

    const seekTime = startOffset + i * interval;

    try {
      const canvas = await extractVideoFrame(video, seekTime, config.downscaleMaxWidth);
      const frameResult = await analyzePose(canvas as any, testType, viewType);
      frameResults.push(frameResult);

      if (frameResult.poseConfidence > 0) {
        qualityPassCount++;
      }
    } catch {
      // Skip failed frames
    }
  }

  const processingMs = Math.round(performance.now() - startTime);

  // Timeout fallback: single mid-frame → forced indeterminate
  if (timedOut && frameResults.length === 0) {
    try {
      const canvas = await extractVideoFrame(video, duration / 2, config.downscaleMaxWidth);
      const singleResult = await analyzePose(canvas as any, testType, viewType);
      return {
        ...singleResult,
        frameCountRequested: frameCount,
        frameCountUsed: 1,
        processingMs,
        frameQualityPassRate: singleResult.poseConfidence > 0 ? 1 : 0,
        temporalStabilityScore: 0,
        temporalTimeoutFallback: true,
      };
    } catch {
      return {
        poseConfidence: 0, objectiveMetrics: {}, objectiveFindings: [], landmarkCount: 0,
        frameCountRequested: frameCount, frameCountUsed: 0, processingMs,
        frameQualityPassRate: 0, temporalStabilityScore: 0, temporalTimeoutFallback: true,
      };
    }
  }

  if (frameResults.length === 0) {
    return {
      poseConfidence: 0, objectiveMetrics: {}, objectiveFindings: [], landmarkCount: 0,
      frameCountRequested: frameCount, frameCountUsed: 0, processingMs,
      frameQualityPassRate: 0, temporalStabilityScore: 0, temporalTimeoutFallback: timedOut,
    };
  }

  // Aggregate: median for numeric metrics, union for findings
  const aggregatedMetrics = aggregateMetricsMedian(frameResults);
  const allFindings = [...new Set(frameResults.flatMap(r => r.objectiveFindings))];
  const avgConfidence = frameResults.reduce((s, r) => s + r.poseConfidence, 0) / frameResults.length;
  const maxLandmarks = Math.max(...frameResults.map(r => r.landmarkCount));
  const stabilityScore = computeTemporalStability(frameResults);

  return {
    poseConfidence: avgConfidence,
    objectiveMetrics: aggregatedMetrics,
    objectiveFindings: allFindings,
    landmarkCount: maxLandmarks,
    frameCountRequested: frameCount,
    frameCountUsed: frameResults.length,
    processingMs,
    frameQualityPassRate: frameResults.length > 0 ? qualityPassCount / frameResults.length : 0,
    temporalStabilityScore: stabilityScore,
    temporalTimeoutFallback: timedOut,
  };
}

export function isPoseAvailable(): boolean {
  return poseLandmarkerInstance !== null;
}

export async function preloadPoseModel(): Promise<boolean> {
  try { await loadPoseModel(); return true; } catch { return false; }
}

// ============================================
// Temporal Helpers
// ============================================

async function extractVideoFrame(video: HTMLVideoElement, time: number, maxWidth: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      try {
        const scale = Math.min(1, maxWidth / video.videoWidth);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('No canvas context')); return; }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
      } catch (e) { reject(e); }
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = Math.max(0, Math.min(time, video.duration));
  });
}

function aggregateMetricsMedian(results: PoseResult[]): Record<string, number> {
  if (results.length === 0) return {};

  // Collect all metric keys
  const allKeys = new Set<string>();
  results.forEach(r => Object.keys(r.objectiveMetrics).forEach(k => allKeys.add(k)));

  const aggregated: Record<string, number> = {};
  for (const key of allKeys) {
    const values = results.map(r => r.objectiveMetrics[key]).filter((v): v is number => v !== undefined);
    if (values.length > 0) {
      values.sort((a, b) => a - b);
      const mid = Math.floor(values.length / 2);
      aggregated[key] = values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
    }
  }

  return aggregated;
}

function computeTemporalStability(results: PoseResult[]): number {
  if (results.length < 2) return 1;

  // Compute coefficient of variation for all numeric metrics
  const allKeys = new Set<string>();
  results.forEach(r => Object.keys(r.objectiveMetrics).forEach(k => allKeys.add(k)));

  const cvValues: number[] = [];
  for (const key of allKeys) {
    const values = results.map(r => r.objectiveMetrics[key]).filter((v): v is number => v !== undefined);
    if (values.length < 2) continue;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    if (mean === 0) continue;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    cvValues.push(Math.sqrt(variance) / Math.abs(mean));
  }

  if (cvValues.length === 0) return 1;
  const avgCV = cvValues.reduce((s, v) => s + v, 0) / cvValues.length;
  return Math.max(0, Math.min(1, 1 - avgCV));
}

// ============================================
// Metric Extraction per Test/View
// ============================================

function extractMetrics(landmarks: any[], testType: string, viewType: string): Record<string, number> {
  const metrics: Record<string, number> = {};
  const normalizedView = normalizeViewType(viewType);

  switch (testType) {
    case 'overhead_squat': extractOHSMetrics(landmarks, normalizedView, metrics); break;
    case 'single_leg_squat': extractSLSMetrics(landmarks, normalizedView, metrics); break;
    case 'pushup': extractPushupMetrics(landmarks, normalizedView, metrics); break;
  }

  return metrics;
}

function extractOHSMetrics(landmarks: any[], view: string, metrics: Record<string, number>): void {
  switch (view) {
    case 'anterior': {
      const valgusL = computeAngle2D(landmarks[LANDMARKS.LEFT_HIP], landmarks[LANDMARKS.LEFT_KNEE], landmarks[LANDMARKS.LEFT_ANKLE], 'xz');
      const valgusR = computeAngle2D(landmarks[LANDMARKS.RIGHT_HIP], landmarks[LANDMARKS.RIGHT_KNEE], landmarks[LANDMARKS.RIGHT_ANKLE], 'xz');
      metrics.valgusAngle = Math.max(Math.abs(180 - valgusL), Math.abs(180 - valgusR));
      const footL = Math.abs(landmarks[LANDMARKS.LEFT_FOOT_INDEX].x - landmarks[LANDMARKS.LEFT_HEEL].x);
      const footR = Math.abs(landmarks[LANDMARKS.RIGHT_FOOT_INDEX].x - landmarks[LANDMARKS.RIGHT_HEEL].x);
      metrics.footOrientation = Math.max(footL, footR) * 100;
      break;
    }
    case 'lateral': {
      metrics.trunkLeanAngle = computeDeviationFromVertical(landmarks[LANDMARKS.LEFT_SHOULDER], landmarks[LANDMARKS.LEFT_HIP]);
      metrics.kneeFlexionAngle = computeAngle2D(landmarks[LANDMARKS.LEFT_HIP], landmarks[LANDMARKS.LEFT_KNEE], landmarks[LANDMARKS.LEFT_ANKLE], 'yz');
      break;
    }
    case 'posterior': {
      const heelL = Math.abs(landmarks[LANDMARKS.LEFT_HEEL].y - landmarks[LANDMARKS.LEFT_ANKLE].y);
      const heelR = Math.abs(landmarks[LANDMARKS.RIGHT_HEEL].y - landmarks[LANDMARKS.RIGHT_ANKLE].y);
      metrics.heelRise = Math.max(heelL, heelR) * 100;
      const eversionL = Math.abs(landmarks[LANDMARKS.LEFT_FOOT_INDEX].x - landmarks[LANDMARKS.LEFT_HEEL].x);
      const eversionR = Math.abs(landmarks[LANDMARKS.RIGHT_FOOT_INDEX].x - landmarks[LANDMARKS.RIGHT_HEEL].x);
      metrics.feetEversion = Math.max(eversionL, eversionR) * 100;
      break;
    }
  }
}

function extractSLSMetrics(landmarks: any[], view: string, metrics: Record<string, number>): void {
  switch (view) {
    case 'anterior': {
      metrics.valgusProxy = computeAngle2D(landmarks[LANDMARKS.LEFT_HIP], landmarks[LANDMARKS.LEFT_KNEE], landmarks[LANDMARKS.LEFT_ANKLE], 'xz');
      metrics.valgusProxy = Math.abs(180 - metrics.valgusProxy);
      metrics.trunkLean = computeDeviationFromVertical(landmarks[LANDMARKS.LEFT_SHOULDER], landmarks[LANDMARKS.LEFT_HIP]);
      break;
    }
    case 'lateral': {
      metrics.trunkLeanAngle = computeDeviationFromVertical(landmarks[LANDMARKS.LEFT_SHOULDER], landmarks[LANDMARKS.LEFT_HIP]);
      metrics.kneeFlexionProxy = computeAngle2D(landmarks[LANDMARKS.LEFT_HIP], landmarks[LANDMARKS.LEFT_KNEE], landmarks[LANDMARKS.LEFT_ANKLE], 'yz');
      break;
    }
    case 'posterior': {
      const hipDiff = Math.abs(landmarks[LANDMARKS.LEFT_HIP].y - landmarks[LANDMARKS.RIGHT_HIP].y);
      const hipDist = Math.abs(landmarks[LANDMARKS.LEFT_HIP].x - landmarks[LANDMARKS.RIGHT_HIP].x);
      metrics.pelvicDrop = hipDist > 0 ? Math.atan2(hipDiff, hipDist) * (180 / Math.PI) : 0;
      break;
    }
  }
}

function extractPushupMetrics(landmarks: any[], view: string, metrics: Record<string, number>): void {
  switch (view) {
    case 'lateral': {
      const shoulderY = landmarks[LANDMARKS.LEFT_SHOULDER].y;
      const hipY = landmarks[LANDMARKS.LEFT_HIP].y;
      const ankleY = landmarks[LANDMARKS.LEFT_ANKLE].y;
      const expectedHipY = (shoulderY + ankleY) / 2;
      metrics.hipSagRatio = Math.abs(hipY - expectedHipY);
      break;
    }
    case 'posterior': {
      metrics.elbowFlareAngle = computeAngle2D(landmarks[LANDMARKS.LEFT_SHOULDER], landmarks[LANDMARKS.LEFT_ELBOW], landmarks[LANDMARKS.LEFT_WRIST], 'xz');
      break;
    }
  }
}

// ============================================
// Geometry Helpers
// ============================================

function computeAngle2D(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  c: { x: number; y: number; z: number },
  plane: 'xy' | 'xz' | 'yz'
): number {
  let ax: number, ay: number, bx: number, by: number, cx: number, cy: number;
  switch (plane) {
    case 'xy': ax = a.x; ay = a.y; bx = b.x; by = b.y; cx = c.x; cy = c.y; break;
    case 'xz': ax = a.x; ay = a.z; bx = b.x; by = b.z; cx = c.x; cy = c.z; break;
    case 'yz': ax = a.y; ay = a.z; bx = b.y; by = b.z; cx = c.y; cy = c.z; break;
  }
  const ba = { x: ax - bx, y: ay - by };
  const bc = { x: cx - bx, y: cy - by };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
  const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
  if (magBA === 0 || magBC === 0) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

function computeDeviationFromVertical(top: { x: number; y: number }, bottom: { x: number; y: number }): number {
  const dx = top.x - bottom.x;
  const dy = top.y - bottom.y;
  if (dy === 0) return 90;
  return Math.abs(Math.atan2(dx, -dy) * (180 / Math.PI));
}

function computePoseConfidence(landmarks: any[], visibilityThreshold: number): number {
  if (!landmarks || landmarks.length === 0) return 0;
  let visibleCount = 0;
  const keyIndices = [
    LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER,
    LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP,
    LANDMARKS.LEFT_KNEE, LANDMARKS.RIGHT_KNEE,
    LANDMARKS.LEFT_ANKLE, LANDMARKS.RIGHT_ANKLE,
  ];
  keyIndices.forEach(idx => {
    if (landmarks[idx]?.visibility >= visibilityThreshold) visibleCount++;
  });
  return visibleCount / keyIndices.length;
}

function normalizeViewType(viewType: string): string {
  return viewType.replace('left_', '').replace('right_', '');
}
