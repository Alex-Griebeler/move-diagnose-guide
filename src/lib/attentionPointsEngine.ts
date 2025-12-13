// ============================================
// Attention Points Engine - Rewritten
// Identifies top 1-2 "accentuated" compensations
// Zero duplication - imports from single sources
// ============================================

import { compensacaoCausas } from '@/data/weightEngine';
import { getCompensationLabel } from '@/data/compensationLabels';
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
  frequencyScore: number;
  clinicalWeight: number;
  painContextBonus: number;
  totalScore: number;
  occurrences: DetectedCompensation[];
  relatedCauseIds: string[];
}

export interface AttentionPointsResult {
  topAttentionPoints: AttentionPoint[];
  allAttentionPoints: AttentionPoint[];
  maxPointsUsed: number;
}

export interface PainHistoryEntry {
  location?: string;
  region?: string;
  intensity?: number;
}

// ============================================
// Pain Region Keywords (derived from cause patterns)
// Maps pain locations to cause ID keywords
// ============================================

const PAIN_REGION_KEYWORDS: Record<string, string[]> = {
  tornozelo: ['ankle', 'tib_post', 'dorsiflexion', 'tc_joint', 'foot', 'peroneal', 'gastroc', 'soleus'],
  pé: ['foot', 'plantar', 'tib_post', 'peroneal'],
  panturrilha: ['gastroc', 'soleus', 'calf'],
  joelho: ['knee', 'vmo', 'frontal_instability', 'quad', 'patela', 'popliteus'],
  patela: ['patela', 'vmo', 'quad'],
  quadril: ['glute', 'hip', 'tfl', 'piriformis', 'adductor', 'lateral_pelvic', 'iliopsoas'],
  glúteo: ['glute', 'piriformis'],
  lombar: ['lumbar', 'core', 'paravertebr', 'ql', 'erector', 'multifid'],
  coluna: ['spine', 'lumbar', 'thoracic', 'erector'],
  sacroilíaca: ['si_joint', 'sacroiliac', 'piriformis'],
  ombro: ['shoulder', 'serratus', 'trap', 'pec', 'rhomboid', 'scapular', 'lat', 'rotator'],
  escápula: ['scapular', 'serratus', 'rhomboid', 'trap'],
  cervical: ['neck', 'scm', 'cervical', 'trap_sup'],
  torácica: ['thoracic', 't_spine', 'trap'],
  lateral: ['lateral_pelvic', 'glute_med', 'tfl', 'it_band'],
  cotovelo: ['elbow', 'triceps', 'biceps'],
};

// ============================================
// Calculate Pain Context Bonus
// Derived from cause IDs - no hardcoded mapping
// ============================================

function getPainBonusForCompensation(
  compensationId: string,
  painRegions: Set<string>
): number {
  if (painRegions.size === 0) return 0;

  const causes = compensacaoCausas[compensationId] || [];
  let bonus = 0;

  for (const causa of causes) {
    const causeIdLower = causa.id.toLowerCase();

    for (const [painRegion, keywords] of Object.entries(PAIN_REGION_KEYWORDS)) {
      if (painRegions.has(painRegion)) {
        if (keywords.some(kw => causeIdLower.includes(kw))) {
          bonus = Math.min(bonus + 1, 2);
          break;
        }
      }
    }
  }

  return bonus;
}

// ============================================
// Extract Pain Regions from History
// ============================================

function extractPainRegions(painHistory?: PainHistoryEntry[]): Set<string> {
  const painRegions = new Set<string>();

  if (!painHistory || painHistory.length === 0) {
    return painRegions;
  }

  painHistory.forEach(entry => {
    const location = (entry.location?.toLowerCase() || entry.region?.toLowerCase() || '');
    if (location) {
      painRegions.add(location);
      // Add common synonyms
      if (location.includes('joelho')) painRegions.add('patela');
      if (location.includes('quadril')) painRegions.add('glúteo');
      if (location.includes('lombar')) painRegions.add('coluna');
      if (location.includes('ombro')) painRegions.add('escápula');
    }
  });

  return painRegions;
}

// ============================================
// Main Function: Calculate Attention Points
// ============================================

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

  // 1. Group compensations by ID for frequency calculation
  const groups = new Map<string, DetectedCompensation[]>();
  detectedCompensations.forEach(comp => {
    const existing = groups.get(comp.id) || [];
    existing.push(comp);
    groups.set(comp.id, existing);
  });

  // 2. Extract pain regions
  const painRegions = extractPainRegions(painHistory);

  // 3. Calculate scores for each compensation
  const attentionPoints: AttentionPoint[] = [];

  groups.forEach((occurrences, compensationId) => {
    const frequencyScore = Math.min(occurrences.length, 3);
    const causes = compensacaoCausas[compensationId] || [];
    const clinicalWeight = causes.reduce((sum, c) => sum + c.baseWeight, 0);
    const painContextBonus = getPainBonusForCompensation(compensationId, painRegions);
    const totalScore = frequencyScore * clinicalWeight * (1 + painContextBonus);

    attentionPoints.push({
      compensationId,
      label: getCompensationLabel(compensationId),
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
  logger.debug(`Unique compensations: ${groups.size}`);
  logger.debug(`Pain regions: ${[...painRegions].join(', ') || 'none'}`);
  logger.debug('Top:', topAttentionPoints.map(ap =>
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
  return [...new Set(attentionPoints.flatMap(ap => ap.relatedCauseIds))];
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
  return Object.entries(testResults).flatMap(([key, result]) =>
    result.compensations.map(id => ({
      id,
      testType: result.testType,
      view: result.view || key,
      side: result.side,
    }))
  );
}
