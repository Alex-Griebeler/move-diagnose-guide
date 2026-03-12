// ============================================
// Clinical Analysis Types
// Tipos compartilhados para quality gate, pose e scoring
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
}

export interface EvidenceMetadata {
  status: ViewReliabilityStatus;
  evidenceVersion: string;
  qualityScore: number;
  qualityPassed: boolean;
  qualityIssues: string[];
  aiConfidence: number;
  poseConfidence: number;
  biomechanicalScore: number;
  detectedCompensations: string[];
  autoAppliedCompensations: string[];
  objectiveAgreementScore: number;
  objectiveFindings: string[];
  objectiveMetrics: Record<string, number>;
  indeterminateReasons: string[];
  computedAt: string;
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
