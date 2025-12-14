/**
 * Knee-Specific Compensation Mappings
 * Mapeamento focado em compensações que afetam o joelho
 * 
 * Usado pelo novo fluxo de protocolo rápido:
 * 1. AI detecta compensações no vídeo do exercício
 * 2. Sistema mapeia compensações → hipóteses de causa
 * 3. Sugere 2-3 testes confirmatórios (Pareto)
 */

// Compensações relevantes para dor no joelho
export type KneeRelevantCompensation = 
  | 'knee_valgus'
  | 'knee_varus'
  | 'feet_eversion'
  | 'foot_collapse'
  | 'heels_rise'
  | 'hip_drop'
  | 'trunk_forward_lean'
  | 'instability';

// Hipóteses de causa (deficit layer)
export type KneeDeficitHypothesis = 
  | 'ankle_mobility'
  | 'hip_mobility'
  | 'hip_stability'
  | 'ankle_stability'
  | 'motor_control';

// Mapeamento compensação → hipóteses
export const KNEE_COMPENSATION_TO_HYPOTHESES: Record<KneeRelevantCompensation, KneeDeficitHypothesis[]> = {
  knee_valgus: ['hip_stability', 'ankle_stability', 'motor_control'],
  knee_varus: ['hip_mobility', 'hip_stability'],
  feet_eversion: ['ankle_stability', 'hip_stability'],
  foot_collapse: ['ankle_stability', 'ankle_mobility'],
  heels_rise: ['ankle_mobility'],
  hip_drop: ['hip_stability'],
  trunk_forward_lean: ['ankle_mobility', 'hip_mobility'],
  instability: ['motor_control', 'ankle_stability'],
};

// Teste confirmatório por hipótese
export interface ConfirmatoryTest {
  id: string;
  name: string;
  description: string;
  instructions: string[];
  hypothesis: KneeDeficitHypothesis;
  layer: 'mobility' | 'stability' | 'motor_control';
  isBilateral: boolean;
  options: Array<{
    id: string;
    label: string;
    isPositive: boolean;
    confirms: KneeDeficitHypothesis | null;
  }>;
}

export const KNEE_CONFIRMATORY_TESTS: Record<KneeDeficitHypothesis, ConfirmatoryTest> = {
  ankle_mobility: {
    id: 'wall_test_confirm',
    name: 'Wall Test (Confirmatório)',
    description: 'Confirma restrição de dorsiflexão do tornozelo',
    hypothesis: 'ankle_mobility',
    layer: 'mobility',
    isBilateral: true,
    instructions: [
      'Posicione o pé a ~10cm da parede',
      'Mantenha o calcanhar no chão',
      'Tente tocar o joelho na parede',
      'Compare a amplitude entre os lados',
    ],
    options: [
      { id: 'normal', label: 'Alcança a parede', isPositive: false, confirms: null },
      { id: 'limited', label: 'Não alcança (limitado)', isPositive: true, confirms: 'ankle_mobility' },
      { id: 'asymmetric', label: 'Assimetria significativa', isPositive: true, confirms: 'ankle_mobility' },
    ],
  },
  hip_mobility: {
    id: 'hip_rotation_confirm',
    name: 'IR/ER Sentado (Confirmatório)',
    description: 'Confirma restrição de rotação do quadril',
    hypothesis: 'hip_mobility',
    layer: 'mobility',
    isBilateral: true,
    instructions: [
      'Sente com joelhos e quadris a 90°',
      'Rotacione a coxa internamente (IR)',
      'Rotacione externamente (ER)',
      'Compare amplitude entre os lados',
    ],
    options: [
      { id: 'normal', label: 'IR e ER normais', isPositive: false, confirms: null },
      { id: 'ir_limited', label: 'IR limitada', isPositive: true, confirms: 'hip_mobility' },
      { id: 'er_limited', label: 'ER limitada', isPositive: true, confirms: 'hip_mobility' },
    ],
  },
  hip_stability: {
    id: 'sls_confirm',
    name: 'Single-Leg Squat (Confirmatório)',
    description: 'Confirma déficit de estabilidade do quadril',
    hypothesis: 'hip_stability',
    layer: 'stability',
    isBilateral: true,
    instructions: [
      'Fique em apoio unilateral',
      'Desça lentamente em mini-agachamento',
      'Observe valgo, queda de pelve, instabilidade',
      'Repita do outro lado',
    ],
    options: [
      { id: 'clean', label: 'Movimento limpo', isPositive: false, confirms: null },
      { id: 'valgus', label: 'Valgo dinâmico', isPositive: true, confirms: 'hip_stability' },
      { id: 'pelvic_drop', label: 'Queda de pelve', isPositive: true, confirms: 'hip_stability' },
      { id: 'instability', label: 'Instabilidade global', isPositive: true, confirms: 'hip_stability' },
    ],
  },
  ankle_stability: {
    id: 'balance_confirm',
    name: 'Single-Leg Balance (Confirmatório)',
    description: 'Confirma déficit de estabilidade do tornozelo/pé',
    hypothesis: 'ankle_stability',
    layer: 'stability',
    isBilateral: true,
    instructions: [
      'Fique em um pé por ~10 segundos',
      'Braços relaxados ao lado do corpo',
      'Observe estabilidade e arco do pé',
      'Repita do outro lado',
    ],
    options: [
      { id: 'stable', label: 'Estável', isPositive: false, confirms: null },
      { id: 'unstable', label: 'Instável', isPositive: true, confirms: 'ankle_stability' },
      { id: 'arch_collapse', label: 'Arco colapsa', isPositive: true, confirms: 'ankle_stability' },
    ],
  },
  motor_control: {
    id: 'squat_control_confirm',
    name: 'Squat Control (Confirmatório)',
    description: 'Confirma déficit de controle neuromotor',
    hypothesis: 'motor_control',
    layer: 'motor_control',
    isBilateral: false,
    instructions: [
      'Realize um agachamento lento e controlado',
      'Pause por 2 segundos na posição mais baixa',
      'Suba de forma controlada',
      'Observe organização do movimento',
    ],
    options: [
      { id: 'clean', label: 'Movimento organizado', isPositive: false, confirms: null },
      { id: 'disorganized', label: 'Descida desorganizada', isPositive: true, confirms: 'motor_control' },
      { id: 'knee_deviation', label: 'Joelho desvia', isPositive: true, confirms: 'motor_control' },
    ],
  },
};

/**
 * Seleciona testes confirmatórios com base nas compensações detectadas (Pareto)
 * Retorna máximo de 3 testes priorizados
 */
export function selectConfirmatoryTests(
  detectedCompensations: KneeRelevantCompensation[]
): ConfirmatoryTest[] {
  // Agregar hipóteses por frequência
  const hypothesisCount: Record<KneeDeficitHypothesis, number> = {
    ankle_mobility: 0,
    hip_mobility: 0,
    hip_stability: 0,
    ankle_stability: 0,
    motor_control: 0,
  };

  for (const compensation of detectedCompensations) {
    const hypotheses = KNEE_COMPENSATION_TO_HYPOTHESES[compensation];
    if (hypotheses) {
      for (const hypothesis of hypotheses) {
        hypothesisCount[hypothesis]++;
      }
    }
  }

  // Ordenar por frequência (maior primeiro)
  const sortedHypotheses = Object.entries(hypothesisCount)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([hypothesis]) => hypothesis as KneeDeficitHypothesis);

  // Selecionar top 3 (Pareto)
  const topHypotheses = sortedHypotheses.slice(0, 3);

  // Retornar testes correspondentes
  return topHypotheses.map(h => KNEE_CONFIRMATORY_TESTS[h]);
}

/**
 * Gera explicação das hipóteses baseadas nas compensações
 */
export function generateHypothesisExplanation(
  compensations: KneeRelevantCompensation[]
): string {
  if (compensations.length === 0) {
    return 'Nenhuma compensação significativa detectada.';
  }

  const compensationLabels: Record<KneeRelevantCompensation, string> = {
    knee_valgus: 'valgo de joelho',
    knee_varus: 'varo de joelho',
    feet_eversion: 'eversão dos pés',
    foot_collapse: 'colapso do arco plantar',
    heels_rise: 'elevação dos calcanhares',
    hip_drop: 'queda do quadril',
    trunk_forward_lean: 'inclinação do tronco',
    instability: 'instabilidade geral',
  };

  const labels = compensations.map(c => compensationLabels[c]).filter(Boolean);
  
  if (labels.length === 1) {
    return `Detectamos ${labels[0]} durante o movimento. Vamos confirmar a causa com testes específicos.`;
  }
  
  return `Detectamos ${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]} durante o movimento. Vamos confirmar as causas com testes específicos.`;
}
