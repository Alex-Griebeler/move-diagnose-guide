// ============================================
// Test Prioritization Engine - Rewritten
// Single linear flow - no duplicated branches
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
  getCauseIdsFromAttentionPoints,
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
  attentionPoints?: AttentionPoint[];
  attentionPointsApplied?: boolean;
}

// ============================================
// Priority badge configuration
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
// Helper: Assign priority based on index
// ============================================

function assignPriority(index: number): TestPriority {
  if (index < 2) return 'high';
  if (index < 4) return 'medium';
  return 'low';
}

// ============================================
// Main Function: Get Suggested Tests with Priority
// Single linear flow - no branching
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
    detectedCompensationsWithDetails,
  } = options || {};

  // Empty input check
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

  const painHistory = anamnese.painHistory as PainHistoryEntry[] | undefined;

  // ============================================
  // Step 1: Calculate Attention Points
  // ============================================

  let attentionPoints: AttentionPoint[] | undefined;
  let attentionPointsApplied = false;
  let attentionCauseIds: Set<string> | undefined;

  if (useAttentionPoints && compensationIds.length > 2) {
    const detectedComps: DetectedCompensation[] = detectedCompensationsWithDetails ||
      compensationIds.map(id => ({
        id,
        testType: 'ohs' as const,
        view: 'unknown',
      }));

    const attentionResult = calculateAttentionPoints(detectedComps, painHistory, maxAttentionPoints);

    if (attentionResult.topAttentionPoints.length > 0) {
      attentionPoints = attentionResult.topAttentionPoints;
      attentionPointsApplied = true;
      attentionCauseIds = new Set(getCauseIdsFromAttentionPoints(attentionPoints));
    }
  }

  // ============================================
  // Step 2: Run Priority Engine
  // ============================================

  const compensacoesDetectadas: CompensacaoDetectada[] = compensationIds.map(id => ({
    id,
    testName: 'Global Test',
  }));

  const priorityResult = calcularPrioridades(compensacoesDetectadas, anamnese);

  // ============================================
  // Step 3: Select Top Causes
  // Use attention points causes if available, otherwise Pareto
  // ============================================

  let topCausas: CausaPriorizada[];

  if (attentionPointsApplied && attentionCauseIds) {
    // Filter to attention point causes only
    topCausas = priorityResult.causasPriorizadas.filter(c => attentionCauseIds!.has(c.id));
  } else {
    // Apply Pareto (80% of score or max 8 causes)
    const totalScore = priorityResult.causasPriorizadas.reduce((sum, c) => sum + c.priorityScore, 0);
    const paretoThreshold = totalScore * 0.8;

    let accumulatedScore = 0;
    topCausas = [];

    for (const causa of priorityResult.causasPriorizadas) {
      topCausas.push(causa);
      accumulatedScore += causa.priorityScore;
      if (accumulatedScore >= paretoThreshold && topCausas.length >= 3) break;
      if (topCausas.length >= 8) break;
    }
  }

  // ============================================
  // Step 4: Map Causes to Tests
  // ============================================

  const testScoreMap = new Map<string, {
    testId: string;
    score: number;
    relatedCauses: CausaPriorizada[];
  }>();

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

  // ============================================
  // Step 5: Sort and Remove Redundant Tests
  // ============================================

  const sortedTests = Array.from(testScoreMap.values()).sort((a, b) => b.score - a.score);
  const nonRedundantTestIds = removeRedundantTests(sortedTests.map(t => t.testId));
  const filteredTests = sortedTests.filter(t => nonRedundantTestIds.includes(t.testId));

  // ============================================
  // Step 6: Build SuggestedTestWithPriority Array
  // ============================================

  let allPrioritizedTests: SuggestedTestWithPriority[] = filteredTests
    .map((t, index) => {
      const test = segmentalTests.find(st => st.id === t.testId);
      if (!test) return null;

      return {
        test,
        priority: assignPriority(index),
        score: Math.round(t.score * 100) / 100,
        relatedCauses: t.relatedCauses,
        coveredCausesCount: t.relatedCauses.length,
      };
    })
    .filter((t): t is SuggestedTestWithPriority => t !== null);

  // ============================================
  // Step 7: Apply MILO Filter (if pain history exists)
  // ============================================

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
        maxTotal: attentionPointsApplied ? 4 : 5,
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

  // ============================================
  // Step 8: Final Sort (mobility first, then by score)
  // ============================================

  allPrioritizedTests.sort((a, b) => {
    const catA = a.test.testCategory;
    const catB = b.test.testCategory;
    if (catA !== catB) return catA === 'mobility' ? -1 : 1;
    return b.score - a.score;
  });

  // Reassign priorities after sorting
  allPrioritizedTests.forEach((t, index) => {
    t.priority = assignPriority(index);
  });

  // ============================================
  // Step 9: Split into Prioritized and Additional
  // ============================================

  const effectiveMaxTests = attentionPointsApplied ? Math.min(maxTests, 4) : maxTests;
  const prioritizedTests = allPrioritizedTests.slice(0, effectiveMaxTests);
  const additionalTests = [...additionalFromMilo, ...allPrioritizedTests.slice(effectiveMaxTests)];

  // Logging
  logger.group('Test Prioritization Engine');
  logger.debug(`Compensations: ${compensationIds.length}`);
  logger.debug(`Attention Points applied: ${attentionPointsApplied}`);
  if (attentionPoints) {
    logger.debug('Top Attention Points:', attentionPoints.map(ap => `${ap.label} (${ap.totalScore.toFixed(1)})`));
  }
  logger.debug('Contexts:', priorityResult.contextosAplicados);
  logger.debug('Top Causes:', topCausas.map(c => `${c.label} (${c.priorityScore})`));
  logger.debug(`Tests after redundancy: ${filteredTests.length}`);
  logger.debug(`MILO applied: ${miloApplied}`);
  logger.debug(`Final tests: ${prioritizedTests.length}`);
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
