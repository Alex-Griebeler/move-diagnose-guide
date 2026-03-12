// ============================================
// Pose Biomechanics — BlazePose/MediaPipe Wrapper
// Lazy loading + metric extraction per test/view
// ============================================

import { getClinicalThresholds } from './clinicalThresholds';
import type { PoseResult, MetricThreshold } from './types';

// Type for the MediaPipe PoseLandmarker (lazy loaded)
let poseLandmarkerInstance: any = null;
let loadingPromise: Promise<any> | null = null;

// MediaPipe landmark indices (BlazePose 33-point model)
const LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
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

    // Extract metrics based on test type and view
    const objectiveMetrics = extractMetrics(landmarks, testType, viewType);

    // Map normalized view type for threshold lookup
    const normalizedView = normalizeViewType(viewType);
    const testKey = testType === 'overhead_squat' ? 'ohs' : testType === 'single_leg_squat' ? 'sls' : 'pushup';
    const metricThresholds = thresholds.poseObjective[testKey]?.[normalizedView] as MetricThreshold[] | undefined;

    // Determine findings based on thresholds
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

export function isPoseAvailable(): boolean {
  return poseLandmarkerInstance !== null;
}

export async function preloadPoseModel(): Promise<boolean> {
  try { await loadPoseModel(); return true; } catch { return false; }
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
