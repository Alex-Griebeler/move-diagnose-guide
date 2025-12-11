/**
 * Quick Protocol Engine - FABRIK Mini Protocolos
 * Motor de decisão determinístico para avaliação rápida
 * 
 * Baseado na pirâmide de performance:
 * Mobilidade > Estabilidade > Controle Neuromotor
 */

import type { ProtocolType, TestId } from '@/data/quickProtocolMappings';

// ============================================================================
// TYPES
// ============================================================================

export type DeficitType =
  // Knee deficits
  | 'ankle_mobility_deficit'
  | 'hip_mobility_deficit'
  | 'hip_stability_deficit'
  | 'ankle_stability_deficit'
  | 'motor_control_deficit'
  // Hip deficits
  | 'hip_flexion_mobility_deficit'
  | 'hip_rotation_mobility_deficit'
  | 'hip_abd_ext_stability_deficit'
  | 'posterior_chain_stability_deficit'
  | 'hip_motor_control_deficit';

export type TestResultStatus = 'normal' | 'limited' | 'asymmetric' | 'unstable' | 'pain';

export interface TestResult {
  testId: TestId;
  leftSide?: TestResultStatus | string;
  rightSide?: TestResultStatus | string;
  hasPain: boolean;
  isPositive: boolean;
  specificFindings?: string[];
}

export interface QuickProtocolTestResults {
  [key: string]: TestResult | undefined;
}

export interface Intervention {
  id: string;
  name: string;
  description: string;
  duration: string;
  category: 'release' | 'mobility' | 'activation' | 'technique';
}

export interface DecisionResult {
  primary: DeficitType | null;
  secondary: DeficitType[];
  interventions: Intervention[];
  explanation: string;
  recommendRetest: boolean;
}

export interface QuickProtocolSession {
  id?: string;
  studentId: string;
  professionalId: string;
  assessmentId?: string | null;
  protocolType: ProtocolType;
  status: 'in_progress' | 'completed' | 'cancelled';
  testResults: QuickProtocolTestResults;
  primaryDeficit?: DeficitType | null;
  secondaryDeficits?: DeficitType[];
  interventionApplied?: Intervention[];
  retestResult?: 'improved_much' | 'improved_little' | 'no_change' | 'worse';
  retestFeedback?: string;
  createdAt?: string;
  completedAt?: string;
}

// ============================================================================
// PRIORITY ORDERS
// ============================================================================

const KNEE_PRIORITY_ORDER: DeficitType[] = [
  'ankle_mobility_deficit',
  'hip_mobility_deficit',
  'hip_stability_deficit',
  'ankle_stability_deficit',
  'motor_control_deficit'
];

const HIP_PRIORITY_ORDER: DeficitType[] = [
  'hip_flexion_mobility_deficit',
  'hip_rotation_mobility_deficit',
  'hip_abd_ext_stability_deficit',
  'posterior_chain_stability_deficit',
  'hip_motor_control_deficit'
];

// ============================================================================
// TEST TO DEFICIT MAPPINGS
// ============================================================================

const KNEE_TEST_TO_DEFICIT: Record<string, DeficitType> = {
  ankle_mobility: 'ankle_mobility_deficit',
  hip_rotation: 'hip_mobility_deficit',
  hip_stability: 'hip_stability_deficit',
  ankle_stability: 'ankle_stability_deficit',
  squat_control: 'motor_control_deficit'
};

const HIP_TEST_TO_DEFICIT: Record<string, DeficitType> = {
  hip_flexion: 'hip_flexion_mobility_deficit',
  hip_rotation_test: 'hip_rotation_mobility_deficit',
  hip_sls_stability: 'hip_abd_ext_stability_deficit',
  posterior_chain: 'posterior_chain_stability_deficit',
  hip_control: 'hip_motor_control_deficit'
};

// ============================================================================
// INTERVENTIONS DATABASE
// ============================================================================

const INTERVENTIONS: Record<DeficitType, Intervention[]> = {
  // Knee interventions
  ankle_mobility_deficit: [
    {
      id: 'calf_release',
      name: 'Liberação de Panturrilha',
      description: 'Liberar gastrocnêmio e sóleo com rolo ou bola',
      duration: '60-90s cada lado',
      category: 'release'
    },
    {
      id: 'talocrural_mob',
      name: 'Mobilidade Talocrural',
      description: 'Mobilização em dorsiflexão com banda ou parede',
      duration: '10-15 reps cada lado',
      category: 'mobility'
    }
  ],
  hip_mobility_deficit: [
    {
      id: 'tfl_release',
      name: 'Liberação TFL/Piriforme',
      description: 'Liberar tensor da fáscia lata e piriforme com bola',
      duration: '60-90s cada lado',
      category: 'release'
    },
    {
      id: 'hip_90_90',
      name: 'Mobilidade 90/90',
      description: 'Alongamento dinâmico em posição 90/90 para rotação interna e externa',
      duration: '8-10 reps cada lado',
      category: 'mobility'
    }
  ],
  hip_stability_deficit: [
    {
      id: 'glute_med_activation',
      name: 'Ativação Glúteo Médio',
      description: 'Clamshell com banda ou abdução lateral em decúbito',
      duration: '12-15 reps cada lado',
      category: 'activation'
    },
    {
      id: 'single_leg_stance',
      name: 'Apoio Unilateral Controlado',
      description: 'Ficar em um pé com controle de pelve, sem queda',
      duration: '20-30s cada lado',
      category: 'activation'
    }
  ],
  ankle_stability_deficit: [
    {
      id: 'tibialis_posterior',
      name: 'Ativação Tibial Posterior',
      description: 'Exercícios de inversão resistida ou short-foot',
      duration: '12-15 reps cada lado',
      category: 'activation'
    },
    {
      id: 'short_foot',
      name: 'Short-Foot',
      description: 'Encurtar o pé ativando arco plantar sem curvar dedos',
      duration: '10 reps x 5s cada lado',
      category: 'activation'
    }
  ],
  motor_control_deficit: [
    {
      id: 'squat_technique',
      name: 'Ajuste Técnico de Agachamento',
      description: 'Correção de base, alinhamento de joelho e distribuição de peso',
      duration: '5-8 reps lentas',
      category: 'technique'
    },
    {
      id: 'assisted_squat',
      name: 'Agachamento Assistido',
      description: 'Agachamento com suporte (TRX, barra) para padrão correto',
      duration: '8-10 reps controladas',
      category: 'technique'
    }
  ],
  // Hip interventions
  hip_flexion_mobility_deficit: [
    {
      id: 'tfl_iliopsoas_release',
      name: 'Liberação TFL/Iliopsoas',
      description: 'Liberar região anterior do quadril com bola ou rolo',
      duration: '60-90s cada lado',
      category: 'release'
    },
    {
      id: 'hip_flexion_mob',
      name: 'Mobilidade de Flexão',
      description: 'Mobilização ativa de flexão do quadril com controle',
      duration: '10-12 reps cada lado',
      category: 'mobility'
    }
  ],
  hip_rotation_mobility_deficit: [
    {
      id: 'glute_tfl_release',
      name: 'Liberação Glúteos/TFL',
      description: 'Liberar glúteos e TFL com bola',
      duration: '60-90s cada lado',
      category: 'release'
    },
    {
      id: 'ir_er_mob',
      name: 'Mobilidade IR/ER',
      description: 'Mobilização de rotações do quadril em 90/90',
      duration: '8-10 reps cada lado',
      category: 'mobility'
    }
  ],
  hip_abd_ext_stability_deficit: [
    {
      id: 'glute_med_activation_hip',
      name: 'Ativação Glúteo Médio',
      description: 'Clamshell, side-lying abduction ou monster walk',
      duration: '12-15 reps cada lado',
      category: 'activation'
    },
    {
      id: 'step_down_control',
      name: 'Step-Down Controlado',
      description: 'Descida controlada de degrau com foco em alinhamento',
      duration: '8-10 reps cada lado',
      category: 'activation'
    }
  ],
  posterior_chain_stability_deficit: [
    {
      id: 'glute_max_activation',
      name: 'Ativação Glúteo Máximo',
      description: 'Bridge bilateral ou glute squeezes',
      duration: '12-15 reps',
      category: 'activation'
    },
    {
      id: 'single_leg_bridge',
      name: 'Bridge Unilateral',
      description: 'Ponte unilateral com foco em ativação de glúteo',
      duration: '8-10 reps cada lado',
      category: 'activation'
    }
  ],
  hip_motor_control_deficit: [
    {
      id: 'hinge_drill',
      name: 'Drill Técnico (Hinge ou Squat)',
      description: 'Padrão lento e controlado do movimento que causou dor',
      duration: '5-8 reps lentas',
      category: 'technique'
    },
    {
      id: 'alignment_focus',
      name: 'Foco em Alinhamento',
      description: 'Ritmo lento com atenção ao eixo quadril-joelho-tornozelo',
      duration: '8-10 reps controladas',
      category: 'technique'
    }
  ]
};

// ============================================================================
// EXPLANATIONS
// ============================================================================

const EXPLANATIONS: Record<DeficitType, string> = {
  // Knee explanations
  ankle_mobility_deficit: 
    'Sua dor no joelho está relacionada à mobilidade reduzida do tornozelo. ' +
    'Quando o tornozelo não se movimenta bem, o joelho acaba recebendo mais carga durante movimentos como agachamento.',
  
  hip_mobility_deficit:
    'Seu quadril está restringindo o movimento e transferindo sobrecarga para o joelho. ' +
    'A limitação de rotação interna ou externa do quadril altera a mecânica do joelho.',
  
  hip_stability_deficit:
    'Seu quadril não está controlando bem o alinhamento do joelho durante o movimento. ' +
    'Isso causa valgo (joelho para dentro) e sobrecarga na articulação.',
  
  ankle_stability_deficit:
    'O pé e o tornozelo não estão oferecendo a base estável que o joelho precisa. ' +
    'Quando o arco plantar colapsa, o joelho sofre rotação interna excessiva.',
  
  motor_control_deficit:
    'Sua mobilidade e estabilidade estão adequadas, mas o padrão de movimento pode ser ajustado. ' +
    'Pequenas correções técnicas podem proteger melhor o joelho durante o exercício.',

  // Hip explanations
  hip_flexion_mobility_deficit:
    'Seu quadril está limitado em flexão, o que aumenta a compressão na região anterior. ' +
    'Isso pode causar pinch ou desconforto durante agachamentos e lunges.',
  
  hip_rotation_mobility_deficit:
    'A mobilidade de rotação do quadril está reduzida, alterando o alinhamento da coxa. ' +
    'Isso afeta diretamente squat, lunge e corrida.',
  
  hip_abd_ext_stability_deficit:
    'Seu quadril não está estabilizando o movimento adequadamente. ' +
    'A fraqueza de glúteo médio e máximo sobrecarrega a articulação.',
  
  posterior_chain_stability_deficit:
    'A cadeia posterior não está absorvendo carga de forma eficiente. ' +
    'Os isquios estão dominando onde o glúteo deveria atuar.',
  
  hip_motor_control_deficit:
    'Sua mobilidade e estabilidade estão boas, mas o padrão de movimento precisa de ajuste. ' +
    'Correções técnicas podem proteger melhor o quadril durante o exercício.'
};

// ============================================================================
// DECISION ENGINE
// ============================================================================

/**
 * Determina se um teste é positivo (indica déficit)
 */
export function isTestPositive(result: TestResult): boolean {
  if (result.hasPain) return true;
  if (result.isPositive) return true;
  
  const statuses = [result.leftSide, result.rightSide].filter(Boolean);
  return statuses.some(s => 
    s === 'limited' || 
    s === 'asymmetric' || 
    s === 'unstable' ||
    s === 'pain'
  );
}

/**
 * Motor de decisão principal - determinístico
 */
export function calculateDecision(
  testResults: QuickProtocolTestResults, 
  protocolType: ProtocolType = 'knee_pain'
): DecisionResult {
  const positiveTestIds: string[] = [];
  
  // Identificar todos os testes positivos
  for (const [testId, result] of Object.entries(testResults)) {
    if (result && isTestPositive(result)) {
      positiveTestIds.push(testId);
    }
  }
  
  // Se nenhum teste positivo, sem déficit identificado
  if (positiveTestIds.length === 0) {
    return {
      primary: null,
      secondary: [],
      interventions: [],
      explanation: 'Nenhum déficit significativo foi identificado nos testes. ' +
        'A dor pode ter outras causas que requerem avaliação mais aprofundada.',
      recommendRetest: false
    };
  }
  
  // Selecionar mapeamento correto
  const testToDeficit = protocolType === 'hip_pain' ? HIP_TEST_TO_DEFICIT : KNEE_TEST_TO_DEFICIT;
  const priorityOrder = protocolType === 'hip_pain' ? HIP_PRIORITY_ORDER : KNEE_PRIORITY_ORDER;
  
  // Mapear testes para déficits
  const detectedDeficits = positiveTestIds
    .map(t => testToDeficit[t])
    .filter(Boolean) as DeficitType[];
  
  // Ordenar por prioridade (mobilidade primeiro)
  const sortedDeficits = detectedDeficits.sort((a, b) => 
    priorityOrder.indexOf(a) - priorityOrder.indexOf(b)
  );
  
  // Determinar primário e secundários
  const primary = sortedDeficits[0];
  const secondary = sortedDeficits.slice(1);
  
  // Buscar intervenções para o déficit primário
  const interventions = INTERVENTIONS[primary] || [];
  
  // Buscar explicação
  const explanation = EXPLANATIONS[primary] || '';
  
  return {
    primary,
    secondary,
    interventions,
    explanation,
    recommendRetest: true
  };
}

/**
 * Formata o nome do déficit para exibição
 */
export function formatDeficitName(deficit: DeficitType): string {
  const names: Record<DeficitType, string> = {
    // Knee
    ankle_mobility_deficit: 'Mobilidade de Tornozelo',
    hip_mobility_deficit: 'Mobilidade de Quadril',
    hip_stability_deficit: 'Estabilidade de Quadril',
    ankle_stability_deficit: 'Estabilidade de Pé/Tornozelo',
    motor_control_deficit: 'Controle Neuromotor',
    // Hip
    hip_flexion_mobility_deficit: 'Mobilidade de Flexão (Quadril)',
    hip_rotation_mobility_deficit: 'Mobilidade de Rotação (Quadril)',
    hip_abd_ext_stability_deficit: 'Estabilidade de Quadril (Abd/Ext)',
    posterior_chain_stability_deficit: 'Estabilidade Cadeia Posterior',
    hip_motor_control_deficit: 'Controle Neuromotor (Quadril)'
  };
  return names[deficit] || deficit;
}

/**
 * Retorna a camada da pirâmide para um déficit
 */
export function getDeficitLayer(deficit: DeficitType): 'mobility' | 'stability' | 'motor_control' {
  if (deficit.includes('mobility')) return 'mobility';
  if (deficit.includes('stability')) return 'stability';
  return 'motor_control';
}

/**
 * Retorna cor/estilo para a camada
 */
export function getLayerStyle(layer: 'mobility' | 'stability' | 'motor_control'): {
  color: string;
  bgClass: string;
  label: string;
} {
  const styles = {
    mobility: {
      color: 'text-blue-500',
      bgClass: 'bg-blue-500/10',
      label: 'Mobilidade'
    },
    stability: {
      color: 'text-amber-500',
      bgClass: 'bg-amber-500/10',
      label: 'Estabilidade'
    },
    motor_control: {
      color: 'text-purple-500',
      bgClass: 'bg-purple-500/10',
      label: 'Controle Motor'
    }
  };
  return styles[layer];
}

// Re-export TestId for backward compatibility
export type { TestId, ProtocolType };
