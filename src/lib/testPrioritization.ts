// ============================================
// Test Prioritization Engine
// Integra Priority Engine na seleção de testes segmentados
// ============================================

import { calcularPrioridades, CausaPriorizada, Anamnese, CompensacaoDetectada } from './priorityEngine';
import { causaToTests } from '@/data/causaTestMappings';
import { segmentalTests, SegmentalTest } from '@/data/segmentalTestMappings';
import { contextosAjuste } from '@/data/weightEngine';

// ============================================
// Interfaces
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
}

// ============================================
// Core Function: getSuggestedTestsWithPriority
// ============================================

export function getSuggestedTestsWithPriority(
  compensationIds: string[],
  anamnese: Anamnese,
  maxTests: number = 6
): TestPrioritizationResult {
  if (!compensationIds || compensationIds.length === 0) {
    return {
      prioritizedTests: [],
      additionalTests: [],
      contextosAplicados: [],
      totalCausasAnalisadas: 0,
      paretoApplied: false,
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
    // Keep at least 3, max 8 causes
    if (accumulatedScore >= paretoThreshold && topCausas.length >= 3) {
      break;
    }
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

  // 5. Sort tests by score and apply Pareto
  const sortedTests = Array.from(testScoreMap.values())
    .sort((a, b) => b.score - a.score);

  // 6. Get test details and assign priorities
  const allPrioritizedTests: SuggestedTestWithPriority[] = sortedTests
    .map((t, index) => {
      const test = segmentalTests.find(st => st.id === t.testId);
      if (!test) return null;

      // Assign priority based on position
      let priority: TestPriority;
      if (index < 2) {
        priority = 'high';
      } else if (index < 4) {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      return {
        test,
        priority,
        score: Math.round(t.score * 100) / 100,
        relatedCauses: t.relatedCauses,
        coveredCausesCount: t.relatedCauses.length,
      };
    })
    .filter((t): t is SuggestedTestWithPriority => t !== null);

  // 7. Split into prioritized (max 6) and additional tests
  const prioritizedTests = allPrioritizedTests.slice(0, maxTests);
  const additionalTests = allPrioritizedTests.slice(maxTests);

  // Log reasoning chain
  console.group('[FABRIK] Test Prioritization Engine');
  console.log('📊 Compensações:', compensationIds.length);
  console.log('🎯 Contextos aplicados:', priorityResult.contextosAplicados);
  console.log('📈 Top Causas (Pareto):', topCausas.map(c => `${c.label} (${c.priorityScore})`));
  console.log('✅ Testes Priorizados:', prioritizedTests.map(t => 
    `${t.test.name} [${t.priority}] - Score: ${t.score} (${t.coveredCausesCount} causas)`
  ));
  if (additionalTests.length > 0) {
    console.log('➕ Testes Adicionais:', additionalTests.map(t => t.test.name));
  }
  console.groupEnd();

  return {
    prioritizedTests,
    additionalTests,
    contextosAplicados: priorityResult.contextosAplicados,
    totalCausasAnalisadas: causasPriorizadas.length,
    paretoApplied: sortedTests.length > maxTests,
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
