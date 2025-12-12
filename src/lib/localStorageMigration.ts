// ============================================
// Migração: Limpeza de dados sensíveis do localStorage
// Executado uma vez para limpar dados antigos do formato anterior
// ============================================

import { createLogger } from '@/lib/logger';

const logger = createLogger('LocalStorageMigration');

const MIGRATION_KEY = 'fabrik_ls_migration_v1';

/**
 * Limpa dados sensíveis do localStorage que foram armazenados
 * no formato antigo (antes da migração para dados mínimos)
 */
export function cleanupSensitiveLocalStorage(): void {
  try {
    // Verifica se já foi executado
    if (localStorage.getItem(MIGRATION_KEY)) {
      return;
    }

    const keysToRemove: string[] = [];
    
    // Identifica chaves do formato antigo (que contêm dados sensíveis)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      // Padrões de chaves antigas que contêm dados sensíveis
      const sensitivePatterns = [
        /^anamnesis_wizard_/,      // Dados de anamnese (saúde)
        /^global_tests_wizard_/,    // Resultados de testes
        /^segmental_tests_wizard_/, // Resultados de testes segmentados
        // Exclui chaves já no novo formato
      ];
      
      // Verifica se é formato antigo (não contém "_minimal_")
      const isOldFormat = sensitivePatterns.some(pattern => pattern.test(key)) 
        && !key.includes('_minimal_');
      
      if (isOldFormat) {
        keysToRemove.push(key);
      }
      
      // Também remove chaves de step antigas
      if (key.endsWith('_step') && !key.includes('_minimal_')) {
        const baseKey = key.replace('_step', '');
        if (sensitivePatterns.some(pattern => pattern.test(baseKey))) {
          keysToRemove.push(key);
        }
      }
    }
    
    // Remove as chaves identificadas
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      logger.debug(`Removed sensitive key: ${key}`);
    });
    
    if (keysToRemove.length > 0) {
      logger.info(`Migration complete: removed ${keysToRemove.length} sensitive keys`);
    }
    
    // Marca migração como concluída
    localStorage.setItem(MIGRATION_KEY, Date.now().toString());
    
  } catch (e) {
    logger.error('Error during localStorage migration', e);
  }
}

/**
 * Remove todos os dados de wizard do localStorage
 * Útil para logout ou limpeza manual
 */
export function clearAllWizardData(): void {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      if (key.includes('_wizard_') || key.includes('globalTests_assessmentId')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    logger.debug(`Cleared ${keysToRemove.length} wizard keys from localStorage`);
  } catch (e) {
    logger.error('Error clearing wizard data', e);
  }
}
