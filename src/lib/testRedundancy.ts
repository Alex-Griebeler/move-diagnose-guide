// ============================================
// Sistema de Redundância de Testes
// Elimina testes que avaliam a mesma função/região
// Mantém apenas o teste mais informativo de cada grupo
// Baseado na metodologia Rebuilding MILO
// ============================================

import { segmentalTests } from '@/data/segmentalTestMappings';
import { createLogger } from '@/lib/logger';

const logger = createLogger('TestRedundancy');

// Grupos de testes redundantes - o primeiro de cada array é o preferido
// Justificativas clínicas baseadas no Rebuilding MILO
export const REDUNDANT_TEST_GROUPS: Record<string, string[]> = {
  // ============================================
  // TORNOZELO
  // ============================================
  // ankle_dorsiflexion (Knee-to-wall) é mais funcional que calf_flexibility (passivo)
  // Ambos avaliam mobilidade de dorsiflexão do tornozelo
  ankle_mobility: ['ankle_dorsiflexion', 'calf_flexibility'],
  
  // ============================================
  // QUADRIL - CONTROLE UNIPODAL
  // ============================================
  // Todos avaliam função do glúteo médio em diferentes contextos
  // Trendelenburg é mais funcional (cadeia fechada, contexto de carga real)
  // hip_abduction_strength é analítico (cadeia aberta, força isolada)
  // single_leg_squat_control é funcional mas menos específico para glúteo médio
  hip_unipodal_control: ['trendelenburg', 'hip_abduction_strength', 'single_leg_squat_control'],
  
  // ============================================
  // QUADRIL - CADEIA FLEXORA
  // ============================================
  // Thomas Modificado (hip_flexor_length) avalia iliopsoas + reto femoral + TFL
  // Ober Test avalia apenas TFL/IT band (já incluído no Thomas)
  // Thomas é mais completo e informativo
  hip_flexor_chain: ['hip_flexor_length', 'ober_test'],
  
  // ============================================
  // CORE/LOMBAR - ESTABILIDADE
  // ============================================
  // dead_bug avalia controle motor anti-extensão (mais funcional)
  // prone_instability avalia estabilidade segmentar (mais analítico)
  // dead_bug é preferido por ser funcional e reproduzível
  lumbar_stability: ['dead_bug', 'prone_instability'],
  
  // ============================================
  // CORE/LOMBAR - ENDURANCE
  // ============================================
  // trunk_endurance_flexor (McGill) mais relevante clinicamente para disfunções lombares
  // trunk_endurance_lateral (Side Bridge) é complementar mas secundário
  core_endurance: ['trunk_endurance_flexor', 'trunk_endurance_lateral'],
  
  // ============================================
  // OMBRO - MOBILIDADE
  // ============================================
  // shoulder_flexion ativa já inclui influência do peitoral menor
  // pec_minor_length é analítico e mais específico
  // Flexão ativa é mais funcional e informativa
  shoulder_mobility: ['shoulder_flexion', 'pec_minor_length'],
  
  // ============================================
  // ESCÁPULA - FUNÇÃO
  // ============================================
  // scapular_dyskinesis é avaliação dinâmica (mais informativa)
  // serratus_strength é analítico (força isolada)
  // Discinesia mostra padrão funcional real
  scapular_function: ['scapular_dyskinesis', 'serratus_strength'],
  
  // ============================================
  // NOTA: cervical_function REMOVIDO
  // ============================================
  // cervical_flexion_endurance e upper_trap_length avaliam funções COMPLEMENTARES,
  // NÃO redundantes. Trapézio superior hiperativo frequentemente compensa 
  // flexores cervicais profundos hipoativos. Ambos precisam ser avaliados 
  // para entender o padrão cervical completo.
};

// Mapa inverso: testId → groupId
const testToGroup: Map<string, string> = new Map();
Object.entries(REDUNDANT_TEST_GROUPS).forEach(([groupId, tests]) => {
  tests.forEach(testId => testToGroup.set(testId, groupId));
});

/**
 * Remove testes redundantes de uma lista, mantendo o mais informativo de cada grupo
 * @param testIds Lista de IDs de testes sugeridos
 * @returns Lista filtrada sem redundâncias
 */
export function removeRedundantTests(testIds: string[]): string[] {
  const selectedGroups = new Set<string>();
  const result: string[] = [];
  
  // Ordenar para garantir que o primeiro de cada grupo (preferido) seja processado primeiro
  const sortedTests = [...testIds].sort((a, b) => {
    const groupA = testToGroup.get(a);
    const groupB = testToGroup.get(b);
    
    if (!groupA && !groupB) return 0;
    if (!groupA) return -1; // Testes sem grupo vêm primeiro (são únicos)
    if (!groupB) return 1;
    
    // Dentro do mesmo grupo, manter ordem de preferência (primeiro no array = preferido)
    if (groupA === groupB) {
      const groupTests = REDUNDANT_TEST_GROUPS[groupA];
      return groupTests.indexOf(a) - groupTests.indexOf(b);
    }
    
    return 0;
  });
  
  for (const testId of sortedTests) {
    const group = testToGroup.get(testId);
    
    if (!group) {
      // Teste não pertence a nenhum grupo - sempre incluir
      result.push(testId);
    } else if (!selectedGroups.has(group)) {
      // Primeiro teste do grupo - incluir e marcar grupo como selecionado
      result.push(testId);
      selectedGroups.add(group);
    }
    // Se já temos um teste do grupo, ignorar este (é redundante)
  }
  
  return result;
}

/**
 * Verifica se dois testes são redundantes
 */
export function areTestsRedundant(testA: string, testB: string): boolean {
  const groupA = testToGroup.get(testA);
  const groupB = testToGroup.get(testB);
  
  return !!(groupA && groupB && groupA === groupB);
}

/**
 * Retorna o teste preferido de um grupo
 */
export function getPreferredTest(testId: string): string {
  const group = testToGroup.get(testId);
  if (!group) return testId;
  
  return REDUNDANT_TEST_GROUPS[group][0];
}

/**
 * Retorna o grupo de redundância de um teste
 */
export function getRedundancyGroup(testId: string): string | undefined {
  return testToGroup.get(testId);
}

/**
 * Valida que todos os testes nos grupos de redundância existem em segmentalTests
 * Deve ser executado apenas em desenvolvimento
 */
export function validateRedundancyGroups(): { valid: boolean; issues: string[] } {
  const allTestIds = new Set(segmentalTests.map(t => t.id));
  const issues: string[] = [];
  
  Object.entries(REDUNDANT_TEST_GROUPS).forEach(([group, tests]) => {
    tests.forEach(testId => {
      if (!allTestIds.has(testId)) {
        issues.push(`Grupo "${group}": teste "${testId}" não existe em segmentalTests`);
      }
    });
  });
  
  if (issues.length > 0) {
    logger.warn('Problemas encontrados na validação de grupos de redundância:', issues);
  } else {
    logger.debug('Validação de grupos de redundância: OK');
  }
  
  return { valid: issues.length === 0, issues };
}

// Executar validação automaticamente em desenvolvimento
if (import.meta.env.DEV) {
  validateRedundancyGroups();
}
