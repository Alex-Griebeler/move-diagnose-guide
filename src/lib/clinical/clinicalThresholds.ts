// ============================================
// Clinical Thresholds — Versioned & Calibrable
// Centraliza todos os limiares clínicos
// v2 — Thresholds calibráveis com overrides localStorage
// ============================================

import type { MetricThreshold } from './types';

// ============================================
// Threshold Types
// ============================================

export interface MediaQualityThresholds {
  minResolution: { width: number; height: number };
  minBrightness: number;
  maxBrightness: number;
  minContrast: number;
  minSharpness: number;
}

export interface ConfidenceThresholds {
  minPoseConfidence: number;
  minLandmarkVisibility: number;
  minAiConfidence: number;
  minAgreementScore: number;
  autoApplyThreshold: number;
}

export interface PoseObjectiveThresholds {
  ohs: Record<string, MetricThreshold[]>;
  sls: Record<string, MetricThreshold[]>;
  pushup: Record<string, MetricThreshold[]>;
}

export interface ClinicalThresholdsConfig {
  evidenceVersion: string;
  mediaQuality: MediaQualityThresholds;
  confidence: ConfidenceThresholds;
  poseObjective: PoseObjectiveThresholds;
}

// ============================================
// Default Thresholds
// ============================================

const DEFAULT_THRESHOLDS: ClinicalThresholdsConfig = {
  evidenceVersion: '2026.03.v2',

  mediaQuality: {
    minResolution: { width: 640, height: 480 },
    minBrightness: 40,
    maxBrightness: 230,
    minContrast: 25,
    minSharpness: 15,
  },

  confidence: {
    minPoseConfidence: 0.5,
    minLandmarkVisibility: 0.4,
    minAiConfidence: 0.6,
    minAgreementScore: 0.3,
    autoApplyThreshold: 0.7,
  },

  poseObjective: {
    ohs: {
      anterior: [
        { metric: 'valgusAngle', label: 'Ângulo de Valgo', threshold: 10, direction: 'above', compensationId: 'knee_valgus' },
        { metric: 'footOrientation', label: 'Orientação do Pé', threshold: 15, direction: 'above', compensationId: 'feet_abduction' },
      ],
      lateral: [
        { metric: 'trunkLeanAngle', label: 'Inclinação do Tronco', threshold: 15, direction: 'above', compensationId: 'trunk_forward_lean' },
        { metric: 'kneeFlexionAngle', label: 'Flexão do Joelho', threshold: 60, direction: 'below', compensationId: 'knee_flexion_insufficient' },
      ],
      posterior: [
        { metric: 'heelRise', label: 'Elevação do Calcanhar', threshold: 5, direction: 'above', compensationId: 'heels_rise_posterior' },
        { metric: 'feetEversion', label: 'Eversão dos Pés', threshold: 10, direction: 'above', compensationId: 'feet_eversion_posterior' },
      ],
    },
    sls: {
      anterior: [
        { metric: 'valgusProxy', label: 'Proxy de Valgo', threshold: 10, direction: 'above', compensationId: 'knee_valgus' },
        { metric: 'trunkLean', label: 'Inclinação do Tronco', threshold: 12, direction: 'above', compensationId: 'trunk_forward_lean_sls' },
      ],
      lateral: [
        { metric: 'trunkLeanAngle', label: 'Inclinação do Tronco', threshold: 12, direction: 'above', compensationId: 'trunk_forward_lean_sls' },
        { metric: 'kneeFlexionProxy', label: 'Flexão do Joelho', threshold: 45, direction: 'below', compensationId: 'knee_flexion_insufficient' },
      ],
      posterior: [
        { metric: 'pelvicDrop', label: 'Queda Pélvica', threshold: 5, direction: 'above', compensationId: 'hip_drop' },
      ],
    },
    pushup: {
      lateral: [
        { metric: 'hipSagRatio', label: 'Alinhamento Quadril', threshold: 0.15, direction: 'above', compensationId: 'hips_drop' },
      ],
      posterior: [
        { metric: 'elbowFlareAngle', label: 'Abertura do Cotovelo', threshold: 45, direction: 'above', compensationId: 'elbow_flare' },
      ],
    },
  },
};

// ============================================
// localStorage Override Management
// ============================================

const OVERRIDES_KEY = 'fabrik_clinical_threshold_overrides';

export function getDefaultClinicalThresholds(): ClinicalThresholdsConfig {
  return structuredClone(DEFAULT_THRESHOLDS);
}

export function loadClinicalThresholdOverrides(): Partial<ClinicalThresholdsConfig> | null {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<ClinicalThresholdsConfig>;
  } catch {
    return null;
  }
}

export function saveClinicalThresholdOverrides(overrides: Partial<ClinicalThresholdsConfig>): void {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
}

export function resetClinicalThresholdOverrides(): void {
  localStorage.removeItem(OVERRIDES_KEY);
}

/**
 * Get the effective clinical thresholds (defaults merged with any overrides).
 */
export function getClinicalThresholds(): ClinicalThresholdsConfig {
  const defaults = getDefaultClinicalThresholds();
  const overrides = loadClinicalThresholdOverrides();
  if (!overrides) return defaults;

  return {
    evidenceVersion: defaults.evidenceVersion,
    mediaQuality: { ...defaults.mediaQuality, ...overrides.mediaQuality },
    confidence: { ...defaults.confidence, ...overrides.confidence },
    poseObjective: overrides.poseObjective
      ? deepMergePoseObjective(defaults.poseObjective, overrides.poseObjective)
      : defaults.poseObjective,
  };
}

function deepMergePoseObjective(
  base: PoseObjectiveThresholds,
  overrides: Partial<PoseObjectiveThresholds>
): PoseObjectiveThresholds {
  const result = structuredClone(base);
  for (const testKey of ['ohs', 'sls', 'pushup'] as const) {
    if (overrides[testKey]) {
      for (const viewKey of Object.keys(overrides[testKey]!)) {
        result[testKey][viewKey] = overrides[testKey]![viewKey];
      }
    }
  }
  return result;
}

/**
 * Snapshot of current thresholds for audit persistence.
 */
export function getThresholdSnapshot(): Record<string, unknown> {
  const t = getClinicalThresholds();
  return {
    evidenceVersion: t.evidenceVersion,
    mediaQuality: t.mediaQuality,
    confidence: t.confidence,
  };
}

// ============================================
// Backward Compatibility Exports
// ============================================

/** @deprecated Use getClinicalThresholds().mediaQuality */
export const MEDIA_QUALITY_THRESHOLDS = DEFAULT_THRESHOLDS.mediaQuality;

/** @deprecated Use getClinicalThresholds() */
export const CLINICAL_THRESHOLDS = {
  version: DEFAULT_THRESHOLDS.evidenceVersion,
  mediaQuality: DEFAULT_THRESHOLDS.mediaQuality,
  pose: {
    minPoseConfidence: DEFAULT_THRESHOLDS.confidence.minPoseConfidence,
    minLandmarkVisibility: DEFAULT_THRESHOLDS.confidence.minLandmarkVisibility,
  },
  fusion: {
    minAgreementScore: DEFAULT_THRESHOLDS.confidence.minAgreementScore,
    minAiConfidence: DEFAULT_THRESHOLDS.confidence.minAiConfidence,
    autoApplyThreshold: DEFAULT_THRESHOLDS.confidence.autoApplyThreshold,
  },
  biomechanicalMetrics: DEFAULT_THRESHOLDS.poseObjective,
} as const;

// Quality issue labels in PT-BR
export const QUALITY_ISSUE_LABELS: Record<string, string> = {
  low_brightness: 'Iluminação insuficiente',
  high_brightness: 'Imagem superexposta',
  low_contrast: 'Baixo contraste',
  low_sharpness: 'Imagem borrada',
  low_resolution: 'Resolução insuficiente',
};
