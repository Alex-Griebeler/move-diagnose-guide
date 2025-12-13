// ============================================
// Attention Points Engine
// Identifies top 1-2 "accentuated" compensations using:
// Frequency × Clinical Weight × Pain Context
// ============================================

import { compensacaoCausas, contextosAjuste } from '@/data/weightEngine';
import { createLogger } from './logger';

const logger = createLogger('AttentionPointsEngine');

// ============================================
// Types
// ============================================

export interface DetectedCompensation {
  id: string;
  testType: 'ohs' | 'sls' | 'pushup';
  view: string;
  side?: 'left' | 'right';
}

export interface AttentionPoint {
  compensationId: string;
  label: string;
  frequencyScore: number;      // How many times it appears across tests/views
  clinicalWeight: number;      // Sum of base weights from causes
  painContextBonus: number;    // Bonus if related to pain history
  totalScore: number;          // frequencyScore × clinicalWeight × (1 + painContextBonus)
  occurrences: DetectedCompensation[];
  relatedCauseIds: string[];
}

export interface AttentionPointsResult {
  topAttentionPoints: AttentionPoint[];
  allAttentionPoints: AttentionPoint[];
  maxPointsUsed: number;
}

// ============================================
// Compensation Labels (for display)
// ============================================

const COMPENSATION_LABELS: Record<string, string> = {
  // OHS Anterior
  feet_abduction: 'Pés abduzidos',
  feet_eversion: 'Eversão dos pés',
  knee_valgus: 'Valgo de joelho',
  knee_varus: 'Varo de joelho',
  
  // OHS Lateral
  trunk_forward_lean: 'Inclinação do tronco',
  lumbar_hyperextension: 'Hiperextensão lombar',
  spine_flexion: 'Flexão da coluna (butt wink)',
  butt_wink: 'Flexão da coluna (butt wink)',
  heels_rise: 'Calcanhares sobem',
  arms_fall_forward: 'Braços caem',
  arms_fall: 'Braços caem',
  
  // OHS Posterior
  asymmetric_shift: 'Shift assimétrico',
  trunk_rotation: 'Rotação do tronco',
  feet_eversion_posterior: 'Eversão (posterior)',
  heels_rise_posterior: 'Calcanhares sobem (posterior)',
  
  // SLS
  hip_drop: 'Queda do quadril (Trendelenburg)',
  hip_hike: 'Elevação do quadril',
  trunk_rotation_medial: 'Rotação medial do tronco',
  trunk_rotation_lateral: 'Rotação lateral do tronco',
  trunk_forward_lean_sls: 'Inclinação anterior (SLS)',
  knee_flexion_insufficient: 'Flexão insuficiente de joelho',
  instability: 'Instabilidade',
  tremor: 'Tremor',
  foot_collapse: 'Colapso do pé',
  balance_loss: 'Perda de equilíbrio',
  
  // Push-up
  scapular_winging: 'Escápula alada',
  elbow_flare: 'Flare de cotovelos',
  shoulder_protraction: 'Protração de ombros',
  shoulder_retraction_insufficient: 'Retração insuficiente',
};

// ============================================
// Pain context mapping (compensation → pain regions)
// ============================================

const COMPENSATION_PAIN_REGIONS: Record<string, string[]> = {
  // Ankle-related
  heels_rise: ['tornozelo', 'pé', 'panturrilha'],
  heels_rise_posterior: ['tornozelo', 'pé', 'panturrilha'],
  feet_eversion: ['tornozelo', 'pé'],
  feet_eversion_posterior: ['tornozelo', 'pé'],
  foot_collapse: ['tornozelo', 'pé'],
  feet_abduction: ['tornozelo', 'pé', 'quadril'],
  
  // Knee-related
  knee_valgus: ['joelho', 'patela', 'quadril'],
  knee_varus: ['joelho', 'patela'],
  knee_flexion_insufficient: ['joelho', 'patela'],
  
  // Hip-related
  hip_drop: ['quadril', 'glúteo', 'lateral'],
  hip_hike: ['quadril', 'lombar'],
  trunk_forward_lean: ['quadril', 'lombar'],
  trunk_forward_lean_sls: ['quadril', 'lombar'],
  
  // Lumbar-related
  lumbar_hyperextension: ['lombar', 'coluna'],
  spine_flexion: ['lombar', 'coluna'],
  butt_wink: ['lombar', 'coluna'],
  asymmetric_shift: ['lombar', 'sacroilíaca'],
  trunk_rotation: ['lombar', 'sacroilíaca'],
  trunk_rotation_medial: ['lombar', 'quadril'],
  trunk_rotation_lateral: ['lombar', 'quadril'],
  
  // Shoulder-related
  arms_fall_forward: ['ombro', 'torácica', 'cervical'],
  arms_fall: ['ombro', 'torácica', 'cervical'],
  scapular_winging: ['ombro', 'escápula'],
  elbow_flare: ['ombro', 'cotovelo'],
  shoulder_protraction: ['ombro', 'cervical'],
  shoulder_retraction_insufficient: ['ombro', 'escápula'],
  
  // Stability-related (general)
  instability: ['tornozelo', 'joelho', 'quadril'],
  tremor: ['quadril', 'joelho'],
  balance_loss: ['tornozelo', 'quadril'],
};

// ============================================
// Core Function: Calculate Attention Points
// ============================================

export interface PainHistoryEntry {
  location?: string;
  region?: string;
  intensity?: number;
}

export function calculateAttentionPoints(
  detectedCompensations: DetectedCompensation[],
  painHistory?: PainHistoryEntry[],
  maxPoints: number = 2
): AttentionPointsResult {
  if (!detectedCompensations || detectedCompensations.length === 0) {
    return {
      topAttentionPoints: [],
      allAttentionPoints: [],
      maxPointsUsed: maxPoints,
    };
  }

  // 1. Group compensations by ID to calculate frequency
  const compensationGroups: Map<string, DetectedCompensation[]> = new Map();
  
  detectedCompensations.forEach(comp => {
    const existing = compensationGroups.get(comp.id) || [];
    existing.push(comp);
    compensationGroups.set(comp.id, existing);
  });

  // 2. Extract pain regions from history for context bonus
  const painRegions = new Set<string>();
  if (painHistory && painHistory.length > 0) {
    painHistory.forEach(entry => {
      const location = entry.location?.toLowerCase() || entry.region?.toLowerCase() || '';
      if (location) {
        painRegions.add(location);
        // Add common synonyms
        if (location.includes('joelho')) painRegions.add('patela');
        if (location.includes('quadril')) painRegions.add('glúteo');
        if (location.includes('lombar')) painRegions.add('coluna');
        if (location.includes('ombro')) painRegions.add('escápula');
      }
    });
  }

  // 3. Calculate scores for each compensation
  const attentionPoints: AttentionPoint[] = [];

  compensationGroups.forEach((occurrences, compensationId) => {
    // Frequency score (1 = single occurrence, 2+ = appears in multiple views/tests)
    const frequencyScore = Math.min(occurrences.length, 3); // Cap at 3

    // Clinical weight (sum of base weights from all causes)
    const causes = compensacaoCausas[compensationId] || [];
    const clinicalWeight = causes.reduce((sum, c) => sum + c.baseWeight, 0);

    // Pain context bonus (0-2 based on overlap with pain regions)
    let painContextBonus = 0;
    const compensationPainRegions = COMPENSATION_PAIN_REGIONS[compensationId] || [];
    compensationPainRegions.forEach(region => {
      painRegions.forEach(painRegion => {
        if (painRegion.includes(region) || region.includes(painRegion)) {
          painContextBonus = Math.min(painContextBonus + 1, 2);
        }
      });
    });

    // Total score formula: frequency × clinicalWeight × (1 + painBonus)
    const totalScore = frequencyScore * clinicalWeight * (1 + painContextBonus);

    attentionPoints.push({
      compensationId,
      label: COMPENSATION_LABELS[compensationId] || compensationId,
      frequencyScore,
      clinicalWeight,
      painContextBonus,
      totalScore,
      occurrences,
      relatedCauseIds: causes.map(c => c.id),
    });
  });

  // 4. Sort by total score (descending)
  attentionPoints.sort((a, b) => b.totalScore - a.totalScore);

  // 5. Select top attention points
  const topAttentionPoints = attentionPoints.slice(0, maxPoints);

  // Logging
  logger.group('Attention Points Engine');
  logger.debug(`Total compensations detected: ${detectedCompensations.length}`);
  logger.debug(`Unique compensations: ${compensationGroups.size}`);
  logger.debug(`Pain regions: ${Array.from(painRegions).join(', ') || 'none'}`);
  logger.debug('Top Attention Points:', topAttentionPoints.map(ap => 
    `${ap.label} (freq=${ap.frequencyScore}, weight=${ap.clinicalWeight}, pain=${ap.painContextBonus}, total=${ap.totalScore.toFixed(1)})`
  ));
  logger.groupEnd();

  return {
    topAttentionPoints,
    allAttentionPoints: attentionPoints,
    maxPointsUsed: maxPoints,
  };
}

// ============================================
// Helper: Get cause IDs from attention points
// ============================================

export function getCauseIdsFromAttentionPoints(attentionPoints: AttentionPoint[]): string[] {
  const causeIds = new Set<string>();
  attentionPoints.forEach(ap => {
    ap.relatedCauseIds.forEach(id => causeIds.add(id));
  });
  return Array.from(causeIds);
}

// ============================================
// Helper: Convert global test results to DetectedCompensation[]
// ============================================

export function extractCompensationsFromTestResults(
  testResults: Record<string, {
    testType: 'ohs' | 'sls' | 'pushup';
    compensations: string[];
    view?: string;
    side?: 'left' | 'right';
  }>
): DetectedCompensation[] {
  const detected: DetectedCompensation[] = [];
  
  Object.entries(testResults).forEach(([key, result]) => {
    result.compensations.forEach(compensationId => {
      detected.push({
        id: compensationId,
        testType: result.testType,
        view: result.view || key,
        side: result.side,
      });
    });
  });
  
  return detected;
}
