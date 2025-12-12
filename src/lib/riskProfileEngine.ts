// ============================================
// Risk Profile Engine
// Calcula perfil de risco quando não há dor registrada
// Baseado em: histórico de compensações + anamnese
// ============================================

import { createLogger } from './logger';
import type { GlobalTestType } from './miloRegionFilter';

const logger = createLogger('RiskProfileEngine');

// ============================================
// Types
// ============================================

export type BodyZone = 'lower' | 'upper' | 'core';

export interface RiskProfile {
  scores: Record<BodyZone, number>;
  priorityZones: BodyZone[];
  suggestedTests: GlobalTestType[];
  reason: string;
}

export interface RiskDataInput {
  // Anamnese atual
  sedentaryHoursPerDay?: number | null;
  workType?: string | null;
  activityModalities?: string[] | null;
  sports?: Array<{ name: string; level?: string }> | null;
  
  // Histórico de compensações
  historicalCompensations?: string[];
}

// ============================================
// Mappings
// ============================================

// Mapeia compensações para zonas corporais
export const COMPENSATION_ZONE_MAP: Record<string, BodyZone> = {
  // Lower body
  knee_valgus: 'lower',
  knee_varus: 'lower',
  foot_pronation: 'lower',
  feet_abduction: 'lower',
  feet_eversion: 'lower',
  feet_eversion_posterior: 'lower',
  heels_rise: 'lower',
  heels_rise_posterior: 'lower',
  hip_drop: 'lower',
  hip_hike: 'lower',
  foot_collapse: 'lower',
  instability: 'lower',
  tremor: 'lower',
  balance_loss: 'lower',
  knee_flexion_insufficient: 'lower',
  
  // Upper body
  arms_fall: 'upper',
  arms_fall_forward: 'upper',
  scapular_winging: 'upper',
  elbow_flare: 'upper',
  shoulder_protraction: 'upper',
  shoulder_retraction_insufficient: 'upper',
  
  // Core
  trunk_lean: 'core',
  butt_wink: 'core',
  spine_flexion: 'core',
  lumbar_hyperextension: 'core',
  trunk_rotation: 'core',
  asymmetry: 'core',
  trunk_rotation_medial: 'core',
  trunk_rotation_lateral: 'core',
  trunk_forward_lean_sls: 'core',
  hips_drop: 'core',
  hip_elevation: 'core',
  head_forward: 'core',
};

// Mapeia zonas para testes globais relevantes
export const ZONE_TO_TESTS: Record<BodyZone, GlobalTestType[]> = {
  lower: ['ohs', 'sls'],
  upper: ['ohs', 'pushup'],
  core: ['ohs', 'sls'],
};

// Esportes que demandam mais de cada zona
const SPORTS_ZONE_DEMAND: Record<string, BodyZone[]> = {
  // Overhead sports → upper
  'Vôlei': ['upper'],
  'Tênis': ['upper'],
  'Natação': ['upper'],
  'Basquete': ['upper', 'lower'],
  'Crossfit': ['upper', 'lower', 'core'],
  'Handebol': ['upper', 'lower'],
  
  // Running/lower body sports
  'Corrida': ['lower'],
  'Futebol': ['lower'],
  'Futsal': ['lower'],
  'Ciclismo': ['lower'],
  'Triathlon': ['lower', 'upper'],
  'Caminhada': ['lower'],
  
  // Mixed/core
  'Jiu-Jitsu': ['core', 'upper'],
  'Boxe': ['upper', 'core'],
  'Pilates': ['core'],
  'Yoga': ['core'],
  'Funcional': ['core', 'lower'],
};

// Modalidades de treino → zonas
const MODALITY_ZONE_DEMAND: Record<string, BodyZone[]> = {
  'Musculação': ['upper', 'lower', 'core'],
  'Cardio': ['lower'],
  'Funcional': ['core', 'lower'],
  'HIIT': ['lower', 'core'],
  'Pilates': ['core'],
  'Yoga': ['core'],
  'Alongamento': ['core'],
  'Dança': ['lower', 'core'],
  'Artes Marciais': ['upper', 'core'],
  'Natação': ['upper'],
};

// ============================================
// Risk Profile Calculator
// ============================================

export function calculateRiskProfile(input: RiskDataInput): RiskProfile {
  const scores: Record<BodyZone, number> = {
    lower: 0,
    upper: 0,
    core: 0,
  };

  const reasons: string[] = [];

  // 1. Sedentarismo (peso 2)
  if (input.sedentaryHoursPerDay) {
    if (input.sedentaryHoursPerDay >= 8) {
      scores.lower += 2;
      scores.core += 2;
      reasons.push('Sedentarismo alto (≥8h)');
    } else if (input.sedentaryHoursPerDay >= 6) {
      scores.lower += 1;
      scores.core += 1;
    }
  }

  // 2. Tipo de trabalho (peso 2)
  if (input.workType) {
    const workLower = input.workType.toLowerCase();
    if (workLower.includes('sentado') || workLower.includes('escritório') || workLower.includes('home')) {
      scores.core += 2;
      reasons.push('Trabalho sentado');
    } else if (workLower.includes('pé') || workLower.includes('físico')) {
      scores.lower += 2;
    }
  }

  // 3. Esportes praticados (peso 2)
  if (input.sports && input.sports.length > 0) {
    input.sports.forEach(sport => {
      const zones = SPORTS_ZONE_DEMAND[sport.name];
      if (zones) {
        zones.forEach(zone => {
          scores[zone] += 2;
        });
        reasons.push(`Pratica ${sport.name}`);
      }
    });
  }

  // 4. Modalidades de treino (peso 1)
  if (input.activityModalities && input.activityModalities.length > 0) {
    input.activityModalities.forEach(modality => {
      const zones = MODALITY_ZONE_DEMAND[modality];
      if (zones) {
        zones.forEach(zone => {
          scores[zone] += 1;
        });
      }
    });
  }

  // 5. Histórico de compensações (peso 3 - mais importante!)
  if (input.historicalCompensations && input.historicalCompensations.length > 0) {
    const zoneCounts: Record<BodyZone, number> = { lower: 0, upper: 0, core: 0 };
    
    input.historicalCompensations.forEach(comp => {
      const zone = COMPENSATION_ZONE_MAP[comp];
      if (zone) {
        zoneCounts[zone]++;
        scores[zone] += 3; // Peso triplo
      }
    });

    // Adicionar reason se houver histórico significativo
    Object.entries(zoneCounts).forEach(([zone, count]) => {
      if (count >= 2) {
        const zoneLabel = zone === 'lower' ? 'membros inferiores' : 
                          zone === 'upper' ? 'membros superiores' : 'core';
        reasons.push(`Histórico: ${count} compensações em ${zoneLabel}`);
      }
    });
  }

  // Ordenar zonas por score
  const sortedZones = (Object.entries(scores) as [BodyZone, number][])
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 0)
    .map(([zone]) => zone);

  // Pegar top 1-3 zonas prioritárias
  const priorityZones = sortedZones.slice(0, 3);

  // Determinar testes baseado nas zonas
  const testsSet = new Set<GlobalTestType>();
  testsSet.add('ohs'); // OHS sempre incluso

  priorityZones.forEach(zone => {
    ZONE_TO_TESTS[zone].forEach(test => testsSet.add(test));
  });

  const suggestedTests = Array.from(testsSet);

  // Garantir mínimo 2 testes
  if (suggestedTests.length < 2) {
    if (!suggestedTests.includes('sls')) {
      suggestedTests.push('sls');
    } else if (!suggestedTests.includes('pushup')) {
      suggestedTests.push('pushup');
    }
  }

  const reason = reasons.length > 0 
    ? `Baseado em: ${reasons.slice(0, 3).join(', ')}`
    : 'Perfil geral - avaliação padrão';

  logger.group('Risk Profile Calculated');
  logger.debug('Scores:', scores);
  logger.debug('Priority zones:', priorityZones);
  logger.debug('Suggested tests:', suggestedTests);
  logger.debug('Reason:', reason);
  logger.groupEnd();

  return {
    scores,
    priorityZones,
    suggestedTests,
    reason,
  };
}

// ============================================
// Extract Compensations from Global Test Results
// ============================================

interface GlobalTestResultRow {
  test_name: string;
  anterior_view?: { compensations?: string[] } | null;
  lateral_view?: { compensations?: string[] } | null;
  posterior_view?: { compensations?: string[] } | null;
  left_side?: { compensations?: string[]; anterior?: string[]; posterior?: string[] } | null;
  right_side?: { compensations?: string[]; anterior?: string[]; posterior?: string[] } | null;
}

export function extractCompensationsFromResults(results: GlobalTestResultRow[]): string[] {
  const compensations: string[] = [];

  results.forEach(result => {
    // OHS views
    if (result.anterior_view?.compensations) {
      compensations.push(...result.anterior_view.compensations);
    }
    if (result.lateral_view?.compensations) {
      compensations.push(...result.lateral_view.compensations);
    }
    if (result.posterior_view?.compensations) {
      compensations.push(...result.posterior_view.compensations);
    }

    // SLS sides
    if (result.left_side) {
      if (result.left_side.compensations) {
        compensations.push(...result.left_side.compensations);
      }
      if (result.left_side.anterior) {
        compensations.push(...result.left_side.anterior);
      }
      if (result.left_side.posterior) {
        compensations.push(...result.left_side.posterior);
      }
    }
    if (result.right_side) {
      if (result.right_side.compensations) {
        compensations.push(...result.right_side.compensations);
      }
      if (result.right_side.anterior) {
        compensations.push(...result.right_side.anterior);
      }
      if (result.right_side.posterior) {
        compensations.push(...result.right_side.posterior);
      }
    }
  });

  // Remove duplicates
  return [...new Set(compensations)];
}
