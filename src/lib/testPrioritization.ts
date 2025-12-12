// ============================================
// Test Prioritization Engine
// Integra Priority Engine + MILO Region Filter
// ============================================

import { calcularPrioridades, CausaPriorizada, Anamnese, CompensacaoDetectada } from './priorityEngine';
import { causaToTests } from '@/data/causaTestMappings';
import { segmentalTests, SegmentalTest } from '@/data/segmentalTestMappings';
import { contextosAjuste } from '@/data/weightEngine';
import { removeRedundantTests } from './testRedundancy';
import { applyMiloRegionFilter, shouldApplyMiloFilter, BodyRegionGroup, PainEntry } from './miloRegionFilter';
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
}

// ============================================
// Core Function: getSuggestedTestsWithPriority
// ============================================

export function getSuggestedTestsWithPriority(
  compensationIds: string[],
  anamnese: Anamnese,
  maxTests: number = 5
): TestPrioritizationResult {
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

  // 1. Build CompensacaoDetectada array from IDs
  const compensacoesDetectadas: CompensacaoDetectada[] = compensationIds.map(id => ({
    id,
    testName: 'Global Test',
  }));

  // 2. Call Priority Engine to get prioritized causes
  const priorityResult = calcularPrioridades(compensacoesDetectadas, anamnese);
  
  // 3. Apply Pareto on causes: select top causes that cover ~80% of total score
  const causasPriorizadas = priorityResult.causasPriorizadas;
  const totalScore = causasPriorizadas.reduce((sum, c) => sum + c.priorityScore, 0);
  const paretoThreshold = totalScore * 0.8;
  
  let accumulatedScore = 0;
  const topCausas: CausaPriorizada[] = [];
  
  for (const causa of causasPriorizadas) {
    topCausas.push(causa);
    accumulatedScore += causa.priorityScore;
    if (accumulatedScore >= paretoThreshold && topCausas.length >= 3) break;
    if (topCausas.length >= 8) break;
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

  const painHistory = anamnese.painHistory as PainEntry[] | undefined;
  
  if (shouldApplyMiloFilter(painHistory)) {
    const miloResult = applyMiloRegionFilter(
      allPrioritizedTests,
      painHistory!,
      {
        maxPrimaryRegion: 3,
        maxAdjacentRegion: 2,
        maxTotal: 5,
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

  // 10. Reassign priorities after MILO filter
  allPrioritizedTests.forEach((t, index) => {
    if (index < 2) t.priority = 'high';
    else if (index < 4) t.priority = 'medium';
    else t.priority = 'low';
  });

  // 11. Split into prioritized and additional
  const prioritizedTests = allPrioritizedTests.slice(0, maxTests);
  const additionalTests = [
    ...additionalFromMilo,
    ...allPrioritizedTests.slice(maxTests),
  ];

  // Logging
  logger.group('Test Prioritization Engine');
  logger.debug(`Compensações: ${compensationIds.length}`);
  logger.debug('Contextos aplicados:', priorityResult.contextosAplicados);
  logger.debug('Top Causas (Pareto):', topCausas.map(c => `${c.label} (${c.priorityScore})`));
  logger.debug(`Testes após redundância: ${filteredTests.length}`);
  logger.debug(`MILO aplicado: ${miloApplied}`);
  if (miloDetails) {
    logger.debug(`Pain regions: ${miloDetails.painRegions.join(', ')}`);
    logger.debug(`Adjacent regions: ${miloDetails.adjacentRegions.join(', ')}`);
  }
  logger.debug(`Testes finais: ${prioritizedTests.length}`);
  logger.groupEnd();

  return {
    prioritizedTests,
    additionalTests,
    contextosAplicados: priorityResult.contextosAplicados,
    totalCausasAnalisadas: causasPriorizadas.length,
    paretoApplied: sortedTests.length > maxTests,
    miloApplied,
    miloDetails,
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
