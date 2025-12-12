// ============================================
// Validação de Integridade de Dados
// Garante consistência entre Tabelas A, B, E e causeIds
// ============================================

import { ALL_CAUSE_IDS, CauseId } from '@/data/causeIds';
import { causaToTests } from '@/data/causaTestMappings';
import { compensacaoCausas, contextosAjuste } from '@/data/weightEngine';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  coverage: {
    causeIds: number;
    causaToTests: number;
    weightEngine: number;
  };
}

// Extrai todos os cause IDs usados no weightEngine (Tabela A)
function getCauseIdsFromWeightEngine(): Set<string> {
  const causeIds = new Set<string>();
  
  Object.values(compensacaoCausas).forEach(causas => {
    causas.forEach(causa => {
      causeIds.add(causa.id);
    });
  });
  
  return causeIds;
}

// Extrai todos os cause IDs usados nos contextosAjuste (Tabela E)
function getCauseIdsFromContextos(): Set<string> {
  const causeIds = new Set<string>();
  
  contextosAjuste.forEach(contexto => {
    Object.keys(contexto.ajustes).forEach(causeId => {
      causeIds.add(causeId);
    });
  });
  
  return causeIds;
}

// Valida integridade completa do sistema de dados
export function validateDataIntegrity(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const allCauseIds = new Set<string>(ALL_CAUSE_IDS);
  const weightEngineCauseIds = getCauseIdsFromWeightEngine();
  const contextoCauseIds = getCauseIdsFromContextos();
  const causaToTestsKeys = new Set(Object.keys(causaToTests));
  
  // 1. Verificar se todos os IDs do weightEngine existem em CAUSE_IDS
  weightEngineCauseIds.forEach(id => {
    if (!allCauseIds.has(id)) {
      errors.push(`[Tabela A] Causa "${id}" usada em compensacaoCausas não existe em CAUSE_IDS`);
    }
  });
  
  // 2. Verificar se todos os IDs dos contextos existem em CAUSE_IDS
  contextoCauseIds.forEach(id => {
    if (!allCauseIds.has(id)) {
      errors.push(`[Tabela E] Causa "${id}" usada em contextosAjuste não existe em CAUSE_IDS`);
    }
  });
  
  // 3. Verificar se todos os CAUSE_IDS têm mapeamento em causaToTests (Tabela B)
  allCauseIds.forEach(id => {
    if (!causaToTestsKeys.has(id)) {
      warnings.push(`[Tabela B] Causa "${id}" não tem mapeamento para testes em causaToTests`);
    }
  });
  
  // 4. Verificar se causaToTests só usa IDs válidos
  causaToTestsKeys.forEach(id => {
    if (!allCauseIds.has(id)) {
      errors.push(`[Tabela B] Chave "${id}" em causaToTests não existe em CAUSE_IDS`);
    }
  });
  
  // Calcular cobertura
  const causesWithTests = [...allCauseIds].filter(id => causaToTestsKeys.has(id)).length;
  const causesInWeightEngine = [...allCauseIds].filter(id => weightEngineCauseIds.has(id)).length;
  
  const coverage = {
    causeIds: allCauseIds.size,
    causaToTests: Math.round((causesWithTests / allCauseIds.size) * 100),
    weightEngine: Math.round((causesInWeightEngine / allCauseIds.size) * 100),
  };
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    coverage,
  };
}

// Executa validação em desenvolvimento
export function runDevValidation(): void {
  if (import.meta.env.DEV) {
    const result = validateDataIntegrity();
    
    if (!result.isValid) {
      console.error('❌ Erros de integridade de dados:');
      result.errors.forEach(err => console.error(`  - ${err}`));
    }
    
    if (result.warnings.length > 0) {
      console.warn('⚠️ Avisos de cobertura:');
      result.warnings.forEach(warn => console.warn(`  - ${warn}`));
    }
    
    console.info(`📊 Cobertura: ${result.coverage.causaToTests}% causas com testes, ${result.coverage.weightEngine}% causas no weight engine`);
  }
}

// Auto-executa apenas em desenvolvimento
if (import.meta.env.DEV) {
  runDevValidation();
}
