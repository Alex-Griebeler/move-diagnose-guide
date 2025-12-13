// ============================================
// Data Integrity Validation
// Ensures consistency across all data modules
// Runs at startup in development only
// ============================================

import { ALL_CAUSE_IDS } from '@/data/causeIds';
import { causaToTests } from '@/data/causaTestMappings';
import { compensacaoCausas, contextosAjuste } from '@/data/weightEngine';
import { COMPENSATION_LABELS } from '@/data/compensationLabels';
import { CATEGORY_LABELS } from '@/data/categoryConfig';
import { segmentalTests } from '@/data/segmentalTestMappings';
import { REDUNDANT_TEST_GROUPS } from '@/lib/testRedundancy';
import {
  ohsAnteriorCompensations,
  ohsLateralCompensations,
  ohsPosteriorCompensations,
  slsAnteriorCompensations,
  slsPosteriorCompensations,
  pushupPosteriorCompensations,
} from '@/data/compensationMappings';

// ============================================
// Types
// ============================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  coverage: {
    causeIds: number;
    causaToTests: number;
    weightEngine: number;
    compensationLabels: number;
  };
}

// ============================================
// Extract all compensation IDs from mappings
// ============================================

function getAllCompensationIdsFromMappings(): Set<string> {
  const allMappings = [
    ...ohsAnteriorCompensations,
    ...ohsLateralCompensations,
    ...ohsPosteriorCompensations,
    ...slsAnteriorCompensations,
    ...slsPosteriorCompensations,
    ...pushupPosteriorCompensations,
  ];
  return new Set(allMappings.map(m => m.id));
}

// ============================================
// Extract cause IDs from weight engine
// ============================================

function getCauseIdsFromWeightEngine(): Set<string> {
  const causeIds = new Set<string>();
  Object.values(compensacaoCausas).forEach(causas => {
    causas.forEach(causa => causeIds.add(causa.id));
  });
  return causeIds;
}

// ============================================
// Extract cause categories from weight engine
// ============================================

function getCategoriesFromWeightEngine(): Set<string> {
  const categories = new Set<string>();
  Object.values(compensacaoCausas).forEach(causas => {
    causas.forEach(causa => categories.add(causa.categoria));
  });
  return categories;
}

// ============================================
// Extract cause IDs from context adjustments
// ============================================

function getCauseIdsFromContextos(): Set<string> {
  const causeIds = new Set<string>();
  contextosAjuste.forEach(contexto => {
    Object.keys(contexto.ajustes).forEach(causeId => causeIds.add(causeId));
  });
  return causeIds;
}

// ============================================
// Get all test IDs from segmental tests
// ============================================

function getAllTestIds(): Set<string> {
  return new Set(segmentalTests.map(t => t.id));
}

// ============================================
// Main Validation Function
// ============================================

export function validateDataIntegrity(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const allCauseIds = new Set<string>(ALL_CAUSE_IDS);
  const weightEngineCauseIds = getCauseIdsFromWeightEngine();
  const contextoCauseIds = getCauseIdsFromContextos();
  const causaToTestsKeys = new Set(Object.keys(causaToTests));
  const compensationIdsFromMappings = getAllCompensationIdsFromMappings();
  const categoriesFromWeightEngine = getCategoriesFromWeightEngine();
  const allTestIds = getAllTestIds();

  // ============================================
  // 1. Validate CAUSE_IDS consistency
  // ============================================

  // 1a. All weight engine causes must exist in CAUSE_IDS
  weightEngineCauseIds.forEach(id => {
    if (!allCauseIds.has(id)) {
      errors.push(`[weightEngine] Causa "${id}" não existe em CAUSE_IDS`);
    }
  });

  // 1b. All context adjustment causes must exist in CAUSE_IDS
  contextoCauseIds.forEach(id => {
    if (!allCauseIds.has(id)) {
      errors.push(`[contextosAjuste] Causa "${id}" não existe em CAUSE_IDS`);
    }
  });

  // 1c. All causaToTests keys must exist in CAUSE_IDS
  causaToTestsKeys.forEach(id => {
    if (!allCauseIds.has(id)) {
      errors.push(`[causaToTests] Chave "${id}" não existe em CAUSE_IDS`);
    }
  });

  // 1d. All CAUSE_IDS should have test mappings
  allCauseIds.forEach(id => {
    if (!causaToTestsKeys.has(id)) {
      warnings.push(`[causaToTests] Causa "${id}" não tem mapeamento para testes`);
    }
  });

  // ============================================
  // 2. Validate COMPENSATION_LABELS consistency
  // ============================================

  // 2a. All compensation IDs from mappings must have labels
  compensationIdsFromMappings.forEach(id => {
    if (!COMPENSATION_LABELS[id]) {
      errors.push(`[compensationLabels] Compensação "${id}" não tem label definido`);
    }
  });

  // 2b. All compensations used in weight engine must have labels
  Object.keys(compensacaoCausas).forEach(compId => {
    if (!COMPENSATION_LABELS[compId]) {
      warnings.push(`[compensationLabels] Compensação "${compId}" (usada em weightEngine) não tem label`);
    }
  });

  // ============================================
  // 3. Validate CATEGORY_LABELS consistency
  // ============================================

  // All categories used in weight engine must have labels
  categoriesFromWeightEngine.forEach(cat => {
    if (!CATEGORY_LABELS[cat]) {
      errors.push(`[categoryConfig] Categoria "${cat}" não tem label definido`);
    }
  });

  // ============================================
  // 4. Validate causaToTests references valid tests
  // ============================================

  Object.entries(causaToTests).forEach(([causeId, testIds]) => {
    if (Array.isArray(testIds)) {
      testIds.forEach(testId => {
        if (!allTestIds.has(testId)) {
          errors.push(`[causaToTests] Causa "${causeId}" referencia teste inexistente "${testId}"`);
        }
      });
    }
  });

  // ============================================
  // 5. Validate REDUNDANT_TEST_GROUPS reference valid tests
  // ============================================

  Object.entries(REDUNDANT_TEST_GROUPS).forEach(([groupName, testIds]) => {
    if (Array.isArray(testIds)) {
      testIds.forEach(testId => {
        if (!allTestIds.has(testId)) {
          errors.push(`[testRedundancy] Grupo "${groupName}" referencia teste inexistente "${testId}"`);
        }
      });
    }
  });

  // ============================================
  // Calculate coverage metrics
  // ============================================

  const causesWithTests = [...allCauseIds].filter(id => causaToTestsKeys.has(id)).length;
  const causesInWeightEngine = [...allCauseIds].filter(id => weightEngineCauseIds.has(id)).length;
  const compensationsWithLabels = [...compensationIdsFromMappings].filter(id => COMPENSATION_LABELS[id]).length;

  const coverage = {
    causeIds: allCauseIds.size,
    causaToTests: Math.round((causesWithTests / allCauseIds.size) * 100),
    weightEngine: Math.round((causesInWeightEngine / allCauseIds.size) * 100),
    compensationLabels: Math.round((compensationsWithLabels / compensationIdsFromMappings.size) * 100),
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    coverage,
  };
}

// ============================================
// Development Validation Runner
// ============================================

export function runDevValidation(): void {
  if (!import.meta.env.DEV) return;

  const result = validateDataIntegrity();

  console.group('🔍 Data Integrity Validation');

  if (!result.isValid) {
    console.error('❌ ERRORS:');
    result.errors.forEach(err => console.error(`  • ${err}`));
  }

  if (result.warnings.length > 0 && result.warnings.length <= 5) {
    console.warn('⚠️ WARNINGS:');
    result.warnings.forEach(warn => console.warn(`  • ${warn}`));
  } else if (result.warnings.length > 5) {
    console.warn(`⚠️ ${result.warnings.length} warnings (run validateDataIntegrity() for details)`);
  }

  if (result.isValid) {
    console.log('✅ All data modules are synchronized');
  }

  console.log(`📊 Coverage: ${result.coverage.causaToTests}% causes→tests, ${result.coverage.compensationLabels}% compensation labels`);
  console.groupEnd();
}
