// ============================================
// Sistema de Redundância de Testes
// Elimina testes que avaliam a mesma função/região
// Mantém apenas o teste mais informativo de cada grupo
// ============================================

// Grupos de testes redundantes - o primeiro de cada array é o preferido
export const REDUNDANT_TEST_GROUPS: Record<string, string[]> = {
  // Mobilidade de tornozelo - ankle_dorsiflexion é mais preciso que calf_flexibility
  ankle_mobility: ['ankle_dorsiflexion', 'calf_flexibility'],
  
  // Controle de quadril unipodal - trendelenburg é mais específico
  hip_unipodal_control: ['trendelenburg', 'single_leg_squat_control'],
  
  // Estabilidade lombar - dead_bug é mais funcional que prone_instability
  lumbar_stability: ['dead_bug', 'prone_instability'],
  
  // Comprimento de flexores de quadril - hip_flexor_length cobre glúteo max
  hip_flexor_chain: ['hip_flexor_length'],
  
  // Endurance de core - trunk_endurance_flexor e lateral são complementares, não redundantes
  // (não incluídos aqui pois avaliam planos diferentes)
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
