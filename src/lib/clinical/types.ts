// ============================================
// Clinical Analysis Types
// Tipos compartilhados para quality gate, pose e scoring
// v3 — Temporal, CaptureContext, ModelInfo, predicted/adjudicated
// ============================================

export type ViewReliabilityStatus = 'ready' | 'blocked_quality' | 'indeterminate';

export type ReliabilityLevel = 'high' | 'moderate' | 'low';

export interface QualityResult {
  passed: boolean;
  score: number; // 0-1
  issues: QualityIssue[];
  metrics: QualityMetrics;
}

export interface QualityIssue {
  code: 'low_brightness' | 'high_brightness' | 'low_contrast' | 'low_sharpness' | 'low_resolution';
  label: string;
  value: number;
  threshold: number;
}

export interface QualityMetrics {
  brightness: number;   // 0-255 avg luminance
  contrast: number;     // RMS contrast
  sharpness: number;    // Laplacian variance proxy
  width: number;
  height: number;
}

export interface PoseResult {
  poseConfidence: number;
  objectiveMetrics: Record<string, number>;
  objectiveFindings: string[];
  landmarkCount: number;
  // Temporal analysis fields (optional — populated by analyzeVideoTemporal)
  frameCountRequested?: number;
  frameCountUsed?: number;
  processingMs?: number;
  frameQualityPassRate?: number;
  temporalStabilityScore?: number;
  temporalTimeoutFallback?: boolean;
}

export interface CaptureContext {
  sourceType: 'photo' | 'video' | 'frame_extraction';
  sourceWidth?: number;
  sourceHeight?: number;
  sourceDurationMs?: number;
  frameSampling?: {
    frameCountRequested: number;
    frameCountUsed: number;
    stabilityScore: number;
    timeoutOccurred: boolean;
  };
}

export interface ModelInfo {
  aiModel: string;
  aiVersion: string;
  poseModel: string;
  poseVersion: string;
}

export interface EvidenceMetadata {
  status: ViewReliabilityStatus;
  evidenceVersion: string;
  thresholdSnapshot: Record<string, unknown>;
  qualityScore: number;
  qualityPassed: boolean;
  qualityIssues: string[];
  aiConfidence: number;
  poseConfidence: number;
  biomechanicalScore: number;
  /** @deprecated Use predictedCompensations instead */
  detectedCompensations: string[];
  autoAppliedCompensations: string[];
  objectiveAgreementScore: number;
  objectiveFindings: string[];
  objectiveMetrics: Record<string, number>;
  indeterminateReasons: string[];
  computedAt: string;
  // v3 fields (all optional for backward compat)
  predictedCompensations?: string[];
  adjudicatedCompensations?: string[];
  thresholdProfileId?: string;
  modelInfo?: ModelInfo;
  captureContext?: CaptureContext;
}

export interface BiomechanicalScoreResult {
  status: ViewReliabilityStatus;
  reliability: ReliabilityLevel;
  qualityScore: number;
  biomechanicalScore: number;
  objectiveAgreementScore: number;
  autoApplyCompensations: string[];
  indeterminateReasons: string[];
  evidenceMetadata: EvidenceMetadata;
}

// Metric thresholds per test/view for pose analysis
export interface MetricThreshold {
  metric: string;
  label: string;
  threshold: number;
  direction: 'above' | 'below'; // 'above' = flagged when value > threshold
  compensationId: string;
}
