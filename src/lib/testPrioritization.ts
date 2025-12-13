// ============================================
// Test Prioritization Engine
// Integra Priority Engine + MILO Region Filter + Attention Points
// ============================================

import { calcularPrioridades, CausaPriorizada, Anamnese, CompensacaoDetectada } from './priorityEngine';
import { causaToTests } from '@/data/causaTestMappings';
import { segmentalTests, SegmentalTest } from '@/data/segmentalTestMappings';
import { contextosAjuste } from '@/data/weightEngine';
import { removeRedundantTests } from './testRedundancy';
import { applyMiloRegionFilter, shouldApplyMiloFilter, BodyRegionGroup, PainEntry } from './miloRegionFilter';
import { 
  calculateAttentionPoints, 
  AttentionPoint, 
  DetectedCompensation,
  PainHistoryEntry,
  getCauseIdsFromAttentionPoints 
} from './attentionPointsEngine';
import { createLogger } from './logger';

const logger = createLogger('TestPrioritization');

// ============================================
// Types
// ============================================

export type TestPriority = 'high' | 'medium' | 'low';

export interface SuggestedTestWithPriority {
  test: SegmentalTest;
  priority: TestPriority;
  score: number;
  relatedCauses: CausaPriorizada[];
  coveredCausesCount: number;
}

export interface TestPrioritizationResult {
  prioritizedTests: SuggestedTestWithPriority[];
  additionalTests: SuggestedTestWithPriority[];
  contextosAplicados: string[];
  totalCausasAnalisadas: number;
  paretoApplied: boolean;
  miloApplied: boolean;
  miloDetails?: {
    painRegions: BodyRegionGroup[];
    adjacentRegions: BodyRegionGroup[];
  };
  // NEW: Attention points information
  attentionPoints?: AttentionPoint[];
  attentionPointsApplied?: boolean;
}

// ============================================
// NEW: Enhanced function with Attention Points
// ============================================

export function getSuggestedTestsWithPriority(
  compensationIds: string[],
  anamnese: Anamnese,
  maxTests: number = 5,
  options?: {
    useAttentionPoints?: boolean;
    maxAttentionPoints?: number;
    detectedCompensationsWithDetails?: DetectedCompensation[];
  }
): TestPrioritizationResult {
  const { 
    useAttentionPoints = true, 
    maxAttentionPoints = 2,
    detectedCompensationsWithDetails 
  } = options || {};

  if (!compensationIds || compensationIds.length === 0) {
    return {
      prioritizedTests: [],
      additionalTests: [],
      contextosAplicados: [],
      totalCausasAnalisadas: 0,
      paretoApplied: false,
      miloApplied: false,
    };
  }

  // Extract pain history for attention points
  const painHistory = anamnese.painHistory as PainHistoryEntry[] | undefined;

  // ============================================
  // NEW: Apply Attention Points filtering
  // ============================================
  let filteredCompensationIds = compensationIds;
  let attentionPoints: AttentionPoint[] | undefined;
  let attentionPointsApplied = false;

  if (useAttentionPoints && compensationIds.length > 2) {
    // Build DetectedCompensation array from IDs if not provided
    const detectedComps: DetectedCompensation[] = detectedCompensationsWithDetails || 
      compensationIds.map(id => ({
        id,
        testType: 'ohs' as const,
        view: 'unknown',
      }));

    const attentionResult = calculateAttentionPoints(
      detectedComps,
      painHistory,
      maxAttentionPoints
    );

    if (attentionResult.topAttentionPoints.length > 0) {
      attentionPoints = attentionResult.topAttentionPoints;
      attentionPointsApplied = true;

      // Filter to only use causes from top attention points
      const topCauseIds = getCauseIdsFromAttentionPoints(attentionPoints);
      
      logger.debug('Attention Points applied:', {
        topPoints: attentionPoints.map(ap => ap.label),
        causeCount: topCauseIds.length,
      });

      // We'll use these cause IDs directly instead of running full priority engine
    }
  }

  // 1. Build CompensacaoDetectada array from IDs
  const compensacoesDetectadas: CompensacaoDetectada[] = filteredCompensationIds.map(id => ({
    id,
    testName: 'Global Test',
  }));

  // 2. Call Priority Engine to get prioritized causes
  const priorityResult = calcularPrioridades(compensacoesDetectadas, anamnese);
  
  // 3. Apply Pareto on causes OR use attention points causes
  let topCausas: CausaPriorizada[];

  if (attentionPointsApplied && attentionPoints) {
    // Use causes from attention points only
    const attentionCauseIds = new Set(getCauseIdsFromAttentionPoints(attentionPoints));
    topCausas = priorityResult.causasPriorizadas.filter(c => attentionCauseIds.has(c.id));
    
    // Fallback: if no overlap, use top causes from attention points
    if (topCausas.length === 0) {
      topCausas = priorityResult.causasPriorizadas.slice(0, 6);
    }
  } else {
    // Original Pareto logic
    const causasPriorizadas = priorityResult.causasPriorizadas;
    const totalScore = causasPriorizadas.reduce((sum, c) => sum + c.priorityScore, 0);
    const paretoThreshold = totalScore * 0.8;
    
    let accumulatedScore = 0;
    topCausas = [];
    
    for (const causa of causasPriorizadas) {
      topCausas.push(causa);
      accumulatedScore += causa.priorityScore;
      if (accumulatedScore >= paretoThreshold && topCausas.length >= 3) break;
      if (topCausas.length >= 8) break;
    }
  }

  // 4. Map causes to tests and calculate test scores
  const testScoreMap: Map<string, {
    testId: string;
    score: number;
    relatedCauses: CausaPriorizada[];
  }> = new Map();

  topCausas.forEach(causa => {
    const tests = causaToTests[causa.id] || [];
    tests.forEach(testId => {
      const existing = testScoreMap.get(testId);
      if (existing) {
        existing.score += causa.priorityScore;
        existing.relatedCauses.push(causa);
      } else {
        testScoreMap.set(testId, {
          testId,
          score: causa.priorityScore,
          relatedCauses: [causa],
        });
      }
    });
  });

  // 5. Sort tests by score
  const sortedTests = Array.from(testScoreMap.values())
    .sort((a, b) => b.score - a.score);

  // 6. Remove redundant tests
  const nonRedundantTestIds = removeRedundantTests(sortedTests.map(t => t.testId));
  const filteredTests = sortedTests.filter(t => nonRedundantTestIds.includes(t.testId));

  // 7. Get test details and create SuggestedTestWithPriority array
  let allPrioritizedTests: SuggestedTestWithPriority[] = filteredTests
    .map((t, index) => {
      const test = segmentalTests.find(st => st.id === t.testId);
      if (!test) return null;

      let priority: TestPriority;
      if (index < 2) priority = 'high';
      else if (index < 4) priority = 'medium';
      else priority = 'low';

      return {
        test,
        priority,
        score: Math.round(t.score * 100) / 100,
        relatedCauses: t.relatedCauses,
        coveredCausesCount: t.relatedCauses.length,
      };
    })
    .filter((t): t is SuggestedTestWithPriority => t !== null);

  // 8. Apply MILO filter if painHistory exists
  let miloApplied = false;
  let miloDetails: { painRegions: BodyRegionGroup[]; adjacentRegions: BodyRegionGroup[] } | undefined;
  let additionalFromMilo: SuggestedTestWithPriority[] = [];

  if (shouldApplyMiloFilter(painHistory as PainEntry[] | undefined)) {
    const miloResult = applyMiloRegionFilter(
      allPrioritizedTests,
      painHistory as PainEntry[],
      {
        maxPrimaryRegion: 3,
        maxAdjacentRegion: 2,
        maxTotal: attentionPointsApplied ? 4 : 5, // Reduce if attention points applied
        prioritizeMobility: true,
      }
    );
    
    allPrioritizedTests = miloResult.selectedTests;
    additionalFromMilo = miloResult.excludedTests;
    miloApplied = true;
    miloDetails = {
      painRegions: miloResult.painRegions,
      adjacentRegions: miloResult.adjacentRegions,
    };
  }

  // 9. Sort by category (mobility first) then by score
  allPrioritizedTests.sort((a, b) => {
    const catA = a.test.testCategory;
    const catB = b.test.testCategory;
    if (catA !== catB) return catA === 'mobility' ? -1 : 1;
    return b.score - a.score;
  });

  // 10. Reassign priorities after filtering
  allPrioritizedTests.forEach((t, index) => {
    if (index < 2) t.priority = 'high';
    else if (index < 4) t.priority = 'medium';
    else t.priority = 'low';
  });

  // 11. Apply stricter limit when attention points are used
  const effectiveMaxTests = attentionPointsApplied 
    ? Math.min(maxTests, 4) // Max 4 tests when using attention points
    : maxTests;

  // 12. Split into prioritized and additional
  const prioritizedTests = allPrioritizedTests.slice(0, effectiveMaxTests);
  const additionalTests = [
    ...additionalFromMilo,
    ...allPrioritizedTests.slice(effectiveMaxTests),
  ];

  // Logging
  logger.group('Test Prioritization Engine');
  logger.debug(`Compensações: ${compensationIds.length}`);
  logger.debug(`Attention Points aplicado: ${attentionPointsApplied}`);
  if (attentionPoints) {
    logger.debug('Top Attention Points:', attentionPoints.map(ap => 
      `${ap.label} (score=${ap.totalScore.toFixed(1)})`
    ));
  }
  logger.debug('Contextos aplicados:', priorityResult.contextosAplicados);
  logger.debug('Top Causas:', topCausas.map(c => `${c.label} (${c.priorityScore})`));
  logger.debug(`Testes após redundância: ${filteredTests.length}`);
  logger.debug(`MILO aplicado: ${miloApplied}`);
  logger.debug(`Testes finais: ${prioritizedTests.length}`);
  logger.groupEnd();

  return {
    prioritizedTests,
    additionalTests,
    contextosAplicados: priorityResult.contextosAplicados,
    totalCausasAnalisadas: priorityResult.causasPriorizadas.length,
    paretoApplied: !attentionPointsApplied && sortedTests.length > maxTests,
    miloApplied,
    miloDetails,
    attentionPoints,
    attentionPointsApplied,
  };
}

// ============================================
// Helper: Get context labels for display
// ============================================

export function getContextLabels(contextIds: string[]): string[] {
  return contextIds.map(id => {
    const ctx = contextosAjuste.find(c => c.condicao === id);
    return ctx?.label || id;
  });
}

// ============================================
// Helper: Priority badge configuration
// ============================================

export const priorityConfig: Record<TestPriority, {
  label: string;
  emoji: string;
  className: string;
}> = {
  high: {
    label: 'Alta',
    emoji: '🔴',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  medium: {
    label: 'Média',
    emoji: '🟡',
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  low: {
    label: 'Baixa',
    emoji: '⚪',
    className: 'bg-muted text-muted-foreground border-muted',
  },
};
