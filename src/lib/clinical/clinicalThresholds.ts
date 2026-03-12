// ============================================
// Clinical Thresholds — Versioned Configuration
// Centraliza todos os limiares clínicos
// v1.0.0 — Thresholds conservadores iniciais
// ============================================

import type { MetricThreshold } from './types';

export const CLINICAL_THRESHOLDS = {
  version: '1.0.0',

  // Quality Gate thresholds
  mediaQuality: {
    minResolution: { width: 640, height: 480 },
    minBrightness: 40,      // 0-255 avg luminance
    maxBrightness: 230,     // avoid washed out
    minContrast: 25,        // RMS contrast
    minSharpness: 15,       // Laplacian variance proxy
  },

  // Pose detection thresholds
  pose: {
    minPoseConfidence: 0.5,
    minLandmarkVisibility: 0.4,
  },

  // Evidence fusion thresholds
  fusion: {
    minAgreementScore: 0.3,    // Jaccard below this = indeterminate
    minAiConfidence: 0.6,      // AI confidence below this = indeterminate
    autoApplyThreshold: 0.7,   // agreement score to auto-apply compensations
  },

  // Biomechanical metric thresholds per test/view
  // These map pose metrics to compensation IDs
  biomechanicalMetrics: {
    ohs: {
      anterior: [
        { metric: 'valgusAngle', label: 'Ângulo de Valgo', threshold: 10, direction: 'above', compensationId: 'knee_valgus' },
        { metric: 'footOrientation', label: 'Orientação do Pé', threshold: 15, direction: 'above', compensationId: 'feet_abduction' },
      ] as MetricThreshold[],
      lateral: [
        { metric: 'trunkLeanAngle', label: 'Inclinação do Tronco', threshold: 15, direction: 'above', compensationId: 'trunk_forward_lean' },
        { metric: 'kneeFlexionAngle', label: 'Flexão do Joelho', threshold: 60, direction: 'below', compensationId: 'knee_flexion_insufficient' },
      ] as MetricThreshold[],
      posterior: [
        { metric: 'heelRise', label: 'Elevação do Calcanhar', threshold: 5, direction: 'above', compensationId: 'heels_rise_posterior' },
        { metric: 'feetEversion', label: 'Eversão dos Pés', threshold: 10, direction: 'above', compensationId: 'feet_eversion_posterior' },
      ] as MetricThreshold[],
    },
    sls: {
      anterior: [
        { metric: 'valgusProxy', label: 'Proxy de Valgo', threshold: 10, direction: 'above', compensationId: 'knee_valgus' },
        { metric: 'trunkLean', label: 'Inclinação do Tronco', threshold: 12, direction: 'above', compensationId: 'trunk_forward_lean_sls' },
      ] as MetricThreshold[],
      lateral: [
        { metric: 'trunkLeanAngle', label: 'Inclinação do Tronco', threshold: 12, direction: 'above', compensationId: 'trunk_forward_lean_sls' },
        { metric: 'kneeFlexionProxy', label: 'Flexão do Joelho', threshold: 45, direction: 'below', compensationId: 'knee_flexion_insufficient' },
      ] as MetricThreshold[],
      posterior: [
        { metric: 'pelvicDrop', label: 'Queda Pélvica', threshold: 5, direction: 'above', compensationId: 'hip_drop' },
      ] as MetricThreshold[],
    },
    pushup: {
      lateral: [
        { metric: 'hipSagRatio', label: 'Alinhamento Quadril', threshold: 0.15, direction: 'above', compensationId: 'hips_drop' },
      ] as MetricThreshold[],
      posterior: [
        { metric: 'elbowFlareAngle', label: 'Abertura do Cotovelo', threshold: 45, direction: 'above', compensationId: 'elbow_flare' },
      ] as MetricThreshold[],
    },
  },
} as const;

// Quality issue labels in PT-BR
export const QUALITY_ISSUE_LABELS: Record<string, string> = {
  low_brightness: 'Iluminação insuficiente',
  high_brightness: 'Imagem superexposta',
  low_contrast: 'Baixo contraste',
  low_sharpness: 'Imagem borrada',
  low_resolution: 'Resolução insuficiente',
};
