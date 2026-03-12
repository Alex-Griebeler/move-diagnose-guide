// ============================================
// Clinical Thresholds — Versioned & Calibrable
// v3 — Safety bounds, scoreWeights, temporal config, backend refresh
// ============================================

import type { MetricThreshold } from './types';
import { supabase } from '@/integrations/supabase/client';

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

export interface ScoreWeights {
  brightness: number;
  contrast: number;
  sharpness: number;
  resolution: number;
}

export interface TemporalAnalysisConfig {
  defaultFrameCount: number;
  maxFrameCount: number;
  analysisTimeoutMs: number;
  minFrameQualityPassRate: number;
  downscaleMaxWidth: number;
}

export interface ClinicalThresholdsConfig {
  evidenceVersion: string;
  mediaQuality: MediaQualityThresholds;
  confidence: ConfidenceThresholds;
  poseObjective: PoseObjectiveThresholds;
  scoreWeights: ScoreWeights;
  temporalAnalysis: TemporalAnalysisConfig;
}

// ============================================
// Safety Bounds — absolute min/max per parameter
// ============================================

export const SAFETY_BOUNDS: Record<string, [number, number]> = {
  // mediaQuality
  minBrightness: [10, 100],
  maxBrightness: [150, 255],
  minContrast: [5, 80],
  minSharpness: [3, 60],
  // confidence
  minPoseConfidence: [0.1, 0.95],
  minLandmarkVisibility: [0.1, 0.9],
  minAiConfidence: [0.1, 0.95],
  minAgreementScore: [0.05, 0.9],
  autoApplyThreshold: [0.3, 0.95],
  // scoreWeights
  brightness: [0.05, 0.5],
  contrast: [0.05, 0.5],
  sharpness: [0.05, 0.5],
  resolution: [0.05, 0.5],
  // temporal
  defaultFrameCount: [3, 15],
  maxFrameCount: [5, 20],
  analysisTimeoutMs: [3000, 30000],
  minFrameQualityPassRate: [0.2, 0.9],
  downscaleMaxWidth: [240, 960],
};

function clampToSafety(key: string, value: number): number {
  const bounds = SAFETY_BOUNDS[key];
  if (!bounds) return value;
  return Math.max(bounds[0], Math.min(bounds[1], value));
}

// ============================================
// Default Thresholds
// ============================================

const DEFAULT_THRESHOLDS: ClinicalThresholdsConfig = {
  evidenceVersion: '2026.03.v3',

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

  scoreWeights: {
    brightness: 0.25,
    contrast: 0.25,
    sharpness: 0.3,
    resolution: 0.2,
  },

  temporalAnalysis: {
    defaultFrameCount: 7,
    maxFrameCount: 10,
    analysisTimeoutMs: 8000,
    minFrameQualityPassRate: 0.5,
    downscaleMaxWidth: 480,
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
// In-Memory Cache + Source Tracking
// ============================================

type ThresholdSource = 'defaults' | 'localStorage' | 'backend';

let cachedConfig: ClinicalThresholdsConfig | null = null;
let currentSource: ThresholdSource = 'defaults';
let cachedProfileId: string | null = null;

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
  // Clamp all values within safety bounds before saving
  const clamped = structuredClone(overrides);

  if (clamped.mediaQuality) {
    for (const [key, val] of Object.entries(clamped.mediaQuality)) {
      if (typeof val === 'number') {
        (clamped.mediaQuality as any)[key] = clampToSafety(key, val);
      }
    }
  }
  if (clamped.confidence) {
    for (const [key, val] of Object.entries(clamped.confidence)) {
      if (typeof val === 'number') {
        (clamped.confidence as any)[key] = clampToSafety(key, val);
      }
    }
  }
  if (clamped.scoreWeights) {
    for (const [key, val] of Object.entries(clamped.scoreWeights)) {
      if (typeof val === 'number') {
        (clamped.scoreWeights as any)[key] = clampToSafety(key, val);
      }
    }
  }
  if (clamped.temporalAnalysis) {
    for (const [key, val] of Object.entries(clamped.temporalAnalysis)) {
      if (typeof val === 'number') {
        (clamped.temporalAnalysis as any)[key] = clampToSafety(key, val);
      }
    }
  }

  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(clamped));
  cachedConfig = null; // invalidate cache
  currentSource = 'localStorage';
}

export function resetClinicalThresholdOverrides(): void {
  localStorage.removeItem(OVERRIDES_KEY);
  cachedConfig = null;
  currentSource = 'defaults';
}

/**
 * Get the effective clinical thresholds (defaults merged with any overrides).
 * SYNCHRONOUS — reads from in-memory cache or localStorage.
 */
export function getClinicalThresholds(): ClinicalThresholdsConfig {
  if (cachedConfig) return cachedConfig;

  const defaults = getDefaultClinicalThresholds();
  const overrides = loadClinicalThresholdOverrides();

  if (!overrides) {
    cachedConfig = defaults;
    currentSource = 'defaults';
    return cachedConfig;
  }

  currentSource = 'localStorage';
  cachedConfig = {
    evidenceVersion: defaults.evidenceVersion,
    mediaQuality: { ...defaults.mediaQuality, ...overrides.mediaQuality },
    confidence: { ...defaults.confidence, ...overrides.confidence },
    scoreWeights: { ...defaults.scoreWeights, ...overrides.scoreWeights },
    temporalAnalysis: { ...defaults.temporalAnalysis, ...overrides.temporalAnalysis },
    poseObjective: overrides.poseObjective
      ? deepMergePoseObjective(defaults.poseObjective, overrides.poseObjective)
      : defaults.poseObjective,
  };

  return cachedConfig;
}

/**
 * Async refresh from backend (clinical_threshold_profiles).
 * Updates in-memory cache. Failure is non-blocking.
 */
export async function refreshClinicalThresholdsFromBackend(): Promise<void> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;

    // Find user's org membership
    const { data: membership } = await supabase
      .from('organization_members' as any)
      .select('organization_id')
      .eq('user_id', user.user.id)
      .limit(1)
      .single();

    if (!membership) return;

    const orgId = (membership as any).organization_id;

    // Fetch active profile for this org
    const { data: profile } = await supabase
      .from('clinical_threshold_profiles' as any)
      .select('id, config, evidence_version')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!profile || !(profile as any).config) return;

    const backendConfig = (profile as any).config as Partial<ClinicalThresholdsConfig>;
    const defaults = getDefaultClinicalThresholds();

    cachedConfig = {
      evidenceVersion: (profile as any).evidence_version || defaults.evidenceVersion,
      mediaQuality: { ...defaults.mediaQuality, ...backendConfig.mediaQuality },
      confidence: { ...defaults.confidence, ...backendConfig.confidence },
      scoreWeights: { ...defaults.scoreWeights, ...backendConfig.scoreWeights },
      temporalAnalysis: { ...defaults.temporalAnalysis, ...backendConfig.temporalAnalysis },
      poseObjective: backendConfig.poseObjective
        ? deepMergePoseObjective(defaults.poseObjective, backendConfig.poseObjective)
        : defaults.poseObjective,
    };
    currentSource = 'backend';
    console.info('[ClinicalThresholds] Loaded from backend profile:', (profile as any).id);
  } catch (error) {
    console.warn('[ClinicalThresholds] Backend refresh failed, using local config:', error);
  }
}

/**
 * Get the current source of thresholds.
 */
export function getThresholdSource(): ThresholdSource {
  if (!cachedConfig) getClinicalThresholds(); // ensure cache populated
  return currentSource;
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
    scoreWeights: t.scoreWeights,
    temporalAnalysis: t.temporalAnalysis,
    source: currentSource,
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
