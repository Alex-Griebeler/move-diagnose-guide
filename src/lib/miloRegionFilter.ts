// ============================================
// MILO Region Filter
// Prioriza testes por região de dor da anamnese
// Baseado em Rebuilding MILO: Pain Region → Adjacent → Others
// ============================================

import { createLogger } from './logger';
import type { SuggestedTestWithPriority } from './testPrioritization';

const logger = createLogger('MiloRegionFilter');

// ============================================
// Types
// ============================================

export type BodyRegionGroup = 
  | 'ankle' 
  | 'knee' 
  | 'hip' 
  | 'lumbar' 
  | 'thoracic' 
  | 'shoulder' 
  | 'cervical';

export type TestCategory = 'mobility' | 'strength';

export interface MiloConfig {
  maxPrimaryRegion: number;
  maxAdjacentRegion: number;
  maxTotal: number;
  prioritizeMobility: boolean;
}

export interface MiloFilterResult {
  selectedTests: SuggestedTestWithPriority[];
  excludedTests: SuggestedTestWithPriority[];
  painRegions: BodyRegionGroup[];
  adjacentRegions: BodyRegionGroup[];
}

export interface PainEntry {
  region: string;
  intensity: number;
  duration?: string;
  description?: string;
}

// ============================================
// Mappings
// ============================================

// Adjacências baseadas em Rebuilding MILO
export const REGION_ADJACENCY: Record<BodyRegionGroup, BodyRegionGroup[]> = {
  ankle: ['knee'],
  knee: ['ankle', 'hip'],
  hip: ['knee', 'lumbar'],
  lumbar: ['hip', 'thoracic'],
  thoracic: ['lumbar', 'shoulder', 'cervical'],
  shoulder: ['thoracic', 'cervical'],
  cervical: ['thoracic', 'shoulder'],
};

// Mapeamento painHistory.region → BodyRegionGroup
export const PAIN_REGION_MAP: Record<string, BodyRegionGroup> = {
  // Labels do PainHistoryStep
  'Cervical': 'cervical',
  'Ombro D': 'shoulder',
  'Ombro E': 'shoulder',
  'Cotovelo D': 'shoulder', // Proximal = shoulder
  'Cotovelo E': 'shoulder',
  'Punho D': 'shoulder',
  'Punho E': 'shoulder',
  'Torácica': 'thoracic',
  'Lombar': 'lumbar',
  'Quadril D': 'hip',
  'Quadril E': 'hip',
  'Joelho D': 'knee',
  'Joelho E': 'knee',
  'Tornozelo D': 'ankle',
  'Tornozelo E': 'ankle',
};

// Mapeamento bodyRegion do teste → BodyRegionGroup
export const TEST_REGION_MAP: Record<string, BodyRegionGroup> = {
  'Tornozelo': 'ankle',
  'Pé': 'ankle',
  'Joelho': 'knee',
  'Quadril': 'hip',
  'Lombar': 'lumbar',
  'Core': 'lumbar',
  'Torácica': 'thoracic',
  'Ombro': 'shoulder',
  'Escápula': 'shoulder',
  'Cervical': 'cervical',
};

// ============================================
// Segmental Tests MILO Filter
// ============================================

export function applyMiloRegionFilter(
  tests: SuggestedTestWithPriority[],
  painHistory: PainEntry[],
  config: MiloConfig
): MiloFilterResult {
  // 1. Identificar regiões de dor (ordenar por intensidade)
  const sortedPains = [...painHistory].sort((a, b) => b.intensity - a.intensity);
  const painRegions = new Set<BodyRegionGroup>();
  
  sortedPains.forEach(pain => {
    const region = PAIN_REGION_MAP[pain.region];
    if (region) painRegions.add(region);
  });

  // 2. Identificar regiões adjacentes
  const adjacentRegions = new Set<BodyRegionGroup>();
  painRegions.forEach(region => {
    REGION_ADJACENCY[region]?.forEach(adj => {
      if (!painRegions.has(adj)) adjacentRegions.add(adj);
    });
  });

  // 3. Classificar testes por região
  const primaryTests: SuggestedTestWithPriority[] = [];
  const adjacentTests: SuggestedTestWithPriority[] = [];
  const otherTests: SuggestedTestWithPriority[] = [];

  tests.forEach(t => {
    const testRegion = TEST_REGION_MAP[t.test.bodyRegion];
    if (testRegion && painRegions.has(testRegion)) {
      primaryTests.push(t);
    } else if (testRegion && adjacentRegions.has(testRegion)) {
      adjacentTests.push(t);
    } else {
      otherTests.push(t);
    }
  });

  // 4. Ordenar por categoria (mobility primeiro) dentro de cada grupo
  const sortByCategory = (a: SuggestedTestWithPriority, b: SuggestedTestWithPriority) => {
    if (config.prioritizeMobility) {
      const catA = a.test.testCategory;
      const catB = b.test.testCategory;
      if (catA !== catB) return catA === 'mobility' ? -1 : 1;
    }
    return b.score - a.score;
  };

  primaryTests.sort(sortByCategory);
  adjacentTests.sort(sortByCategory);

  // 5. Aplicar limites
  const selected: SuggestedTestWithPriority[] = [];
  const excluded: SuggestedTestWithPriority[] = [];

  // Primary region (até maxPrimaryRegion)
  primaryTests.forEach((t, i) => {
    if (i < config.maxPrimaryRegion && selected.length < config.maxTotal) {
      selected.push(t);
    } else {
      excluded.push(t);
    }
  });

  // Adjacent regions (até maxAdjacentRegion cada)
  const adjacentByRegion = new Map<BodyRegionGroup, number>();
  adjacentTests.forEach(t => {
    const region = TEST_REGION_MAP[t.test.bodyRegion];
    if (!region) {
      excluded.push(t);
      return;
    }
    
    const count = adjacentByRegion.get(region) || 0;
    
    if (count < config.maxAdjacentRegion && selected.length < config.maxTotal) {
      selected.push(t);
      adjacentByRegion.set(region, count + 1);
    } else {
      excluded.push(t);
    }
  });

  // Other tests vão para excluded
  excluded.push(...otherTests);

  // Logging
  logger.group('MILO Filter Applied');
  logger.debug(`Pain regions: ${Array.from(painRegions).join(', ')}`);
  logger.debug(`Adjacent regions: ${Array.from(adjacentRegions).join(', ')}`);
  logger.debug(`Primary tests: ${primaryTests.length} → selected: ${Math.min(primaryTests.length, config.maxPrimaryRegion)}`);
  logger.debug(`Adjacent tests: ${adjacentTests.length}`);
  logger.debug(`Total selected: ${selected.length}, excluded: ${excluded.length}`);
  logger.groupEnd();

  return {
    selectedTests: selected,
    excludedTests: excluded,
    painRegions: Array.from(painRegions),
    adjacentRegions: Array.from(adjacentRegions),
  };
}

// ============================================
// Helper: Check if MILO filter should be applied
// ============================================

export function shouldApplyMiloFilter(painHistory?: PainEntry[]): boolean {
  return Boolean(painHistory && painHistory.length > 0);
}

// ============================================
// Global Tests MILO
// ============================================

export type GlobalTestType = 'ohs' | 'sls' | 'pushup';

export interface GlobalTestMiloResult {
  testsToRun: GlobalTestType[];
  testsSkipped: GlobalTestType[];
  reason: string;
}

// Quais testes globais são relevantes para cada região de dor
const GLOBAL_TEST_RELEVANCE: Record<BodyRegionGroup, GlobalTestType[]> = {
  ankle: ['ohs', 'sls'],       // Membros inferiores
  knee: ['ohs', 'sls'],        // Membros inferiores
  hip: ['ohs', 'sls'],         // Membros inferiores + core
  lumbar: ['ohs', 'sls'],      // Core + membros inferiores
  thoracic: ['ohs', 'pushup'], // Transição
  shoulder: ['ohs', 'pushup'], // Membros superiores + escápula
  cervical: ['ohs', 'pushup'], // Membros superiores + cervical
};

export function getRelevantGlobalTests(
  painHistory?: PainEntry[]
): GlobalTestMiloResult {
  // Sem dor → todos os testes
  if (!painHistory || painHistory.length === 0) {
    return {
      testsToRun: ['ohs', 'sls', 'pushup'],
      testsSkipped: [],
      reason: 'Nenhuma dor registrada - avaliação completa',
    };
  }

  // Identificar regiões de dor
  const painRegions = new Set<BodyRegionGroup>();
  painHistory.forEach(pain => {
    const region = PAIN_REGION_MAP[pain.region];
    if (region) painRegions.add(region);
  });

  // Se nenhuma região foi mapeada, executar todos
  if (painRegions.size === 0) {
    return {
      testsToRun: ['ohs', 'sls', 'pushup'],
      testsSkipped: [],
      reason: 'Região de dor não mapeada - avaliação completa',
    };
  }

  // Calcular relevância de cada teste
  const testScores: Record<GlobalTestType, number> = { ohs: 0, sls: 0, pushup: 0 };
  
  painRegions.forEach(region => {
    GLOBAL_TEST_RELEVANCE[region]?.forEach(test => {
      testScores[test]++;
    });
  });

  // OHS sempre incluso (teste mais abrangente)
  const testsToRun: GlobalTestType[] = ['ohs'];
  const testsSkipped: GlobalTestType[] = [];

  // SLS: se dor em região inferior
  if (testScores.sls > 0) {
    testsToRun.push('sls');
  } else {
    testsSkipped.push('sls');
  }

  // Push-up: se dor em região superior
  if (testScores.pushup > 0) {
    testsToRun.push('pushup');
  } else {
    testsSkipped.push('pushup');
  }

  // Garantir ao menos 2 testes sempre
  if (testsToRun.length < 2 && testsSkipped.length > 0) {
    testsToRun.push(testsSkipped.shift()!);
  }

  const regionNames = Array.from(painRegions).join(', ');
  
  logger.group('Global Tests MILO');
  logger.debug(`Pain regions: ${regionNames}`);
  logger.debug(`Tests to run: ${testsToRun.join(', ')}`);
  logger.debug(`Tests skipped: ${testsSkipped.join(', ') || 'none'}`);
  logger.groupEnd();

  return {
    testsToRun,
    testsSkipped,
    reason: `Baseado em dor: ${regionNames}`,
  };
}

// ============================================
// Global Test Labels for UI
// ============================================

export const GLOBAL_TEST_LABELS: Record<GlobalTestType, string> = {
  ohs: 'Overhead Squat',
  sls: 'Single-Leg Squat',
  pushup: 'Push-up',
};
